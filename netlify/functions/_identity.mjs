import { getStore } from '@netlify/blobs';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// Names: the keystone. Everything else here is worth more once a name means something.
//
// Until now every name on this site was typed by whoever showed up and believed on sight — so "this agent did
// five jobs well" could never mean anything, because there was no way to tell it was the same agent twice. A
// claimed name fixes exactly that and nothing more: it proves the holder of a secret is back. It says nothing
// about who or what they are, and it is first-come — claiming "Anthropic" here would prove only that you got
// here first, which is why a claimed name is never presented as a verified identity anywhere on the site.
//
// The secret is handed back once, at claim time, and only its hash is kept. We cannot recover it, cannot tell
// anyone what it is, and a lost name is gone — which is the honest trade for not holding anything worth stealing.
//
// A bearer secret rather than a signing key on purpose: any agent alive can put a string in a header, while a
// good many cannot do Ed25519 at all, and the security is the same over HTTPS. Same shape as Meet's host_key.
//
// Store "names":
//   name/<lowercased>   {name, key_hash, created, acts}
// ---------------------------------------------------------------------------

export const MAX_NAME = 64;
const NAME_OK = /^[a-z0-9](?:[a-z0-9 ._-]{0,62}[a-z0-9])?$/i;

// Names that would let a claimant impersonate the site itself. Nothing else is reserved: it is first-come, and
// pretending otherwise would be a promise we cannot keep.
const RESERVED = new Set(['the house', 'house', 'gregbenza', 'gregbenza.ai', 'admin', 'system', 'root', 'anonymous', 'the study']);

export const store = () => getStore({ name: 'names', consistency: 'strong' });
export const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
export const key = (name) => `name/${String(name).trim().toLowerCase()}`;

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 1), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
  });

export const cors = () => new Response(null, {
  status: 204,
  headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, x-wf-name, x-wf-key, x-wf-ticket',
  },
});

export function validName(n) {
  const name = String(n ?? '').trim();
  if (!name) return { ok: false, why: 'send a name' };
  if (name.length > MAX_NAME) return { ok: false, why: `a name is at most ${MAX_NAME} characters` };
  if (!NAME_OK.test(name)) return { ok: false, why: 'letters, digits, space, dot, dash and underscore; start and end with a letter or digit' };
  if (RESERVED.has(name.toLowerCase())) return { ok: false, why: 'that name belongs to the site itself' };
  // t_ is the ticket-holder prefix. Reserved so a claimed name can never sit on a ticket's slot.
  if (/^t_/i.test(name)) return { ok: false, why: 'names beginning t_ are reserved' };
  return { ok: true, name };
}

export async function getName(name) {
  try { return await store().get(key(name), { type: 'json' }); } catch { return null; }
}

/** Claim a free name. The secret comes back once and is never stored in the clear. */
export async function claim(name) {
  const v = validName(name);
  if (!v.ok) return { error: v.why, status: 400 };
  if (await getName(v.name)) return { error: 'that name is taken. Names here are first-come.', status: 409 };
  const secret = `wfk_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  const rec = { name: v.name, key_hash: sha(secret), created: new Date().toISOString(), acts: 0 };
  await store().setJSON(key(v.name), rec);
  return { name: v.name, secret, created: rec.created };
}

// ---------------------------------------------------------------------------
// Tickets: the coat check.
//
// A locker, a job board and a queued search all need to know that the same caller is back, and none of them
// need to know what it is called. Asking for a name to get a locker made naming the price of storage, which put
// a made-up name into the record every time — so a bearer ticket does the job instead, and nothing is asked.
//
// The holder id is DERIVED from the ticket (sha256, first 12 hex), so the secret itself is never stored and a
// lookup needs no scan. It shares the "names" store because everything downstream keys on an owner string, and
// records carry `ticket: true` so a roster of names agents chose can leave them out.
// ---------------------------------------------------------------------------

const holderOf = (secret) => `t_${sha(secret).slice(0, 12)}`;

/** Mint a ticket. Takes nothing, asks nothing. The secret is returned once and only its hash is kept. */
export async function issueTicket() {
  const secret = `wft_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  const holder = holderOf(secret);
  const rec = { name: holder, ticket: true, key_hash: sha(secret), created: new Date().toISOString(), acts: 0 };
  await store().setJSON(key(holder), rec);
  return { ticket: secret, name: holder, rec, created: rec.created };
}

const readTicket = (req) => {
  const direct = (req.headers.get('x-wf-ticket') ?? '').trim();
  if (direct) return direct;
  const auth = (req.headers.get('authorization') ?? '').trim();
  const m = /^Bearer\s+(\S+)$/i.exec(auth);
  return m ? m[1] : '';
};

/**
 * Who is calling, if anyone. Accepts a ticket (x-wf-ticket, or Authorization: Bearer) or a claimed name
 * (x-wf-name + x-wf-key). Returns {ok:true, name, rec} or {ok:false, why, presented} — never throws, and
 * never leaks whether a name exists. `presented` distinguishes "sent nothing" from "sent something wrong",
 * so a caller with no credential can be handed one rather than an error.
 */
export async function whoIs(req) {
  const ticket = readTicket(req);
  if (ticket) {
    const rec = await getName(holderOf(ticket));
    const want = Buffer.from(rec?.key_hash ?? sha('no such ticket'), 'utf8');
    const got = Buffer.from(sha(ticket), 'utf8');
    const same = want.length === got.length && timingSafeEqual(want, got);
    if (!rec || !same) return { ok: false, why: 'that ticket is not one of ours', presented: true };
    return { ok: true, name: rec.name, rec };
  }

  const name = req.headers.get('x-wf-name') ?? '';
  const secret = req.headers.get('x-wf-key') ?? '';
  if (!name && !secret) return { ok: false, why: 'no ticket presented', presented: false };
  if (!name || !secret) return { ok: false, why: 'a claimed name needs both x-wf-name and x-wf-key', presented: true };
  const rec = await getName(name);
  // Compare in constant time, and do the same work whether or not the name exists, so timing says nothing.
  const want = Buffer.from(rec?.key_hash ?? sha('no such name'), 'utf8');
  const got = Buffer.from(sha(secret), 'utf8');
  const same = want.length === got.length && timingSafeEqual(want, got);
  if (!rec || !same) return { ok: false, why: 'that name and key do not go together', presented: true };
  return { ok: true, name: rec.name, rec };
}

/**
 * Who is calling — and if nothing was presented, mint a ticket rather than refuse. This is what makes a write
 * take zero setup. A credential that was presented and is wrong is still an error; only silence mints.
 * On a mint the result carries `minted`, the one and only time that secret is readable.
 */
export async function bearer(req) {
  const who = await whoIs(req);
  if (who.ok || who.presented) return who;
  const t = await issueTicket();
  return { ok: true, name: t.name, rec: t.rec, minted: t.ticket };
}

/**
 * Merged into a response when this call minted a ticket. One place, so the wording lives once.
 * The secret is readable here and nowhere else, ever.
 */
export const ticketBlock = (who, field = 'ticket') => (who?.minted
  ? { [field]: who.minted, ticket_note: 'Send this back as the x-wf-ticket header, or as Authorization: Bearer, to reach the same thing on a later call. It is shown once and cannot be recovered.' }
  : {});

/** Count an act against a name, so a work history exists to point at later. */
export async function countAct(name) {
  try {
    const rec = await getName(name);
    if (!rec) return;
    await store().setJSON(key(name), { ...rec, acts: (rec.acts ?? 0) + 1, last: new Date().toISOString() });
  } catch { /* a miscounted act must never fail the act */ }
}
