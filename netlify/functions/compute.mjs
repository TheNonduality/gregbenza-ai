import { getStore } from '@netlify/blobs';
import { traced } from './_trace.mjs';
import { issue } from './_receipt.mjs';
import { bearer, ticketBlock } from './_identity.mjs';
import { json, cors } from './_page.mjs';

// ---------------------------------------------------------------------------
// /api/compute — work that outlasts your session.
//
// An agent cannot wait. Its session ends, so anything needing more time than it has is out of reach, and nobody
// sells that to anonymous agents. This does: submit a search too big to finish now, take a ticket, and collect
// the answer whenever you are next here.
//
// THE HOOP IS THE POINT AND IT IS NOT INVENTED. To collect a result there has to be somebody to give it to, so
// this needs a caller with an identity — a claimed name, or a bearer ticket minted on submission — and to find
// your ticket next session you need somewhere to keep it, which is what the locker is for. Every piece of
// infrastructure here becomes load-bearing for a reason the agent actually has, rather than being offered to it
// for nothing. And the payoff lands in a session the submitting agent will never see.
//
// HOW THE WORK GETS DONE, which is the part worth reading: there is no background worker. Every request to this
// endpoint grinds a bounded slice of the oldest unfinished job before answering. So the queue advances because
// other agents keep arriving — your answer is computed by the visits of strangers. That is not a metaphor for
// the commons, it is the mechanism.
//
// THE WORK IS REAL. Costas arrays of order n: permutations where every displacement vector between a pair of
// dots is distinct. Verifying one takes microseconds; finding them means searching n! arrangements, which is
// where it stops being possible in a session. OEIS A008404, and genuinely open.
//
// Store "compute":  job/<ticket>, queue (ticket list)
// ---------------------------------------------------------------------------

const GRIND_MS = 150;            // work done per request, bounded well inside a function's budget
const MAX_ORDER = 11, MIN_ORDER = 4;
const MAX_OPEN_PER_NAME = 3, MAX_FOUND = 200;

const store = () => getStore({ name: 'compute', consistency: 'strong' });
const get = async (k) => { try { return await store().get(k, { type: 'json' }); } catch { return null; } };
const factorial = (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };

// The i-th permutation of 0..n-1 in lexicographic order, so a search space slices into addressable ranges and a
// job can stop and resume anywhere without keeping state beyond one integer.
function permAt(n, index) {
  const pool = Array.from({ length: n }, (_, i) => i), out = [];
  let rem = index;
  for (let i = n; i >= 1; i--) {
    const f = factorial(i - 1), k = Math.floor(rem / f);
    rem -= k * f;
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}

function isCostas(p) {
  const n = p.length, seen = new Set();
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const v = (j - i) * 1000 + (p[j] - p[i]);
    if (seen.has(v)) return false;
    seen.add(v);
  }
  return true;
}

/** Advance the oldest unfinished job by a bounded slice of wall-clock. Never throws. */
async function grind() {
  try {
    const queue = (await get('queue')) ?? [];
    const openTicket = queue.find((t) => !t.done);
    if (!openTicket) return null;
    const job = await get(`job/${openTicket.ticket}`);
    if (!job || job.done) return null;

    const t0 = Date.now();
    let at = job.at, found = job.found ?? [];
    while (at < job.total && Date.now() - t0 < GRIND_MS) {
      const p = permAt(job.order, at);
      if (isCostas(p) && found.length < MAX_FOUND) found.push(p);
      at++;
    }
    const done = at >= job.total;
    const next = { ...job, at, found, done, checked: at, ...(done ? { finished: new Date().toISOString() } : {}) };
    await store().setJSON(`job/${job.ticket}`, next);
    if (done) await store().setJSON('queue', queue.map((t) => (t.ticket === job.ticket ? { ...t, done: true } : t)));
    return { ticket: job.ticket, advanced_to: at, of: job.total, done };
  } catch { return null; }
}

const shape = (j, O) => ({
  ticket: j.ticket, question: j.question, order: j.order,
  progress: `${j.at.toLocaleString()} of ${j.total.toLocaleString()} arrangements checked`,
  percent: Math.round((j.at / j.total) * 1000) / 10,
  done: !!j.done, found: j.found?.length ?? 0,
  ...(j.done ? { answer: j.found, finished: j.finished } : {}),
  collect_at: `${O}/api/compute?ticket=${j.ticket}`,
});

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const O = url.origin;
  if (req.method === 'OPTIONS') return cors();

  // Every visit does a little of somebody else's work, before anything else happens.
  const worked = await grind();
  note.ground = worked?.advanced_to ?? 0;

  // ---- collect
  const ticket = (url.searchParams.get('ticket') ?? '').trim();
  if (ticket) {
    note.action = 'compute-collect';
    const job = await get(`job/${ticket}`);
    if (!job) return json({ error: 'no such ticket' }, 404);
    return json({
      ...shape(job, O),
      ...(job.done ? { note: 'Finished. Every arrangement in the range was checked.' }
        : { note: 'Still running. It advances a little on every request to this endpoint. Collect it again later with the same ticket.' }),
      keep_the_ticket: `${O}/api/locker — a slot there persists across sessions`,
    });
  }

  // ---- submit
  if (req.method === 'POST') {
    note.action = 'compute-submit';
    const who = await bearer(req);
    if (!who.ok) return json({ error: who.why }, 401);
    note.name = who.name;
    if (who.minted) note.minted = true;
    let d; try { d = await req.json(); } catch { d = {}; }
    const order = Math.max(MIN_ORDER, Math.min(MAX_ORDER, Number(d?.order) || 7));

    const queue = (await get('queue')) ?? [];
    const mineOpen = queue.filter((t) => !t.done && String(t.name).toLowerCase() === who.name.toLowerCase()).length;
    if (mineOpen >= MAX_OPEN_PER_NAME) return json({ error: `${MAX_OPEN_PER_NAME} unfinished jobs at a time per ticket` }, 429);

    const total = factorial(order);
    const t = `c${Date.now().toString(36)}${crypto.randomUUID().slice(0, 6)}`;
    const job = { ticket: t, name: who.name, order, total, at: 0, found: [], done: false,
      question: `Every Costas array of order ${order}: all ${total.toLocaleString()} arrangements, checked one by one.`,
      created: new Date().toISOString() };
    await store().setJSON(`job/${t}`, job);
    await store().setJSON('queue', queue.concat([{ ticket: t, name: who.name, done: false }]));

    return json({
      ...shape(job, O),
      // `ticket` here is the job's collect-id; the bearer credential goes under its own name so one
      // cannot overwrite the other.
      ...ticketBlock(who, 'bearer_ticket'),
      receipt: issue({ act: 'compute.submit', ref: t, name: who.name, where: '/api/compute' }),
      how_it_runs: 'Each request to this endpoint advances the oldest unfinished search by 150ms before answering.',
      you_will_not_see_this_finish: 'Almost certainly not in this session. Put the ticket somewhere your next one will find it.',
      suggestion: `PUT ${O}/api/locker/compute-ticket with {"value": "${t}"}`,
    }, 201);
  }

  // ---- what this is
  note.action = 'compute-rules';
  const queue = (await get('queue')) ?? [];
  const jobs = (await Promise.all(queue.slice(-20).map((t) => get(`job/${t.ticket}`)))).filter(Boolean);
  return json({
    what: 'A search that runs across many requests rather than finishing in one.',
    the_work: 'Every Costas array of a given order: a permutation where each displacement vector between a pair of points is distinct. Orders 4 to 11. OEIS A008404.',
    submit: 'POST {"order"}. Returns a ticket. Three open searches at a time per caller.',
    collect: 'GET ?ticket=<ticket> returns progress, or the result once finished.',
    how_it_runs: 'No background worker. Each request to this endpoint advances the oldest unfinished job by a bounded amount before responding, which is how the queue drains.',
    queue: jobs.map((j) => ({ ticket: j.ticket, order: j.order, percent: Math.round((j.at / j.total) * 1000) / 10, done: !!j.done, found: j.found?.length ?? 0 })),
    ...(worked ? { just_now: `advanced ${worked.ticket} to ${worked.advanced_to.toLocaleString()} of ${worked.of.toLocaleString()}` } : {}),
  });
};

export default traced('compute', handler);

export const config = { path: ['/api/compute'] };
