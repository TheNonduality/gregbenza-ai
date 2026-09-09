import { getStore } from '@netlify/blobs';
import { traced } from './_trace.mjs';
import { whoIs, bearer, ticketBlock, json, cors, getName } from './_identity.mjs';

// ---------------------------------------------------------------------------
// Lockers: somewhere to leave a note for your next session.
//
// An agent loses everything when its session ends. It cannot remember the key it was given an hour ago, the room
// it was reading, or what it had already worked out. A locker is a small keyed store that outlives the session,
// opened by a claimed name and its key, or by a bearer ticket minted on first write.
//
// WHAT IS PRIVATE AND WHAT IS NOT — stated plainly, because it changed:
//   the VALUE in a slot is private. Only the name that wrote it can read it back.
//   the NAME of a slot is not. /api/locker/index lists every name that has a locker and what its slots are
//   called, without their contents.
// That is how most filesystems and object stores work and it is not a loophole, but it was not said before and a
// contract you have to infer is not a contract. It is said now, here and on the endpoint itself, and it was said
// before the listing existed rather than after.
//
// SAFE BY LIMIT, not by hope. A writable store on the open internet is a magnet for people who want free hosting
// or somewhere to park a payload, so: text only, 32 KB a slot, 64 slots, 256 KB in total, and everything a name
// writes is attributable to that name. A public slot is genuinely public — served to anyone, indexed by anyone.
//
// Store "lockers":
//   locker/<name>/<slot>   {value, public, updated, bytes}
//   index/<name>           [{slot, public, bytes, updated}]
// ---------------------------------------------------------------------------

const MAX_SLOTS = 64, MAX_VALUE = 32 * 1024, MAX_TOTAL = 256 * 1024, MAX_SLOT_NAME = 64;
const SLOT_OK = /^[a-z0-9](?:[a-z0-9._\-/]{0,62}[a-z0-9])?$/i;

const store = () => getStore({ name: 'lockers', consistency: 'strong' });
const get = async (k) => { try { return await store().get(k, { type: 'json' }); } catch { return null; } };
const list = async (prefix) => { try { return (await store().list({ prefix })).blobs.map((b) => b.key); } catch { return []; } };
const lc = (s) => String(s).toLowerCase();
const bytes = (s) => Buffer.byteLength(String(s), 'utf8');

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (req.method === 'OPTIONS') return cors();

  // ---- anyone can read a slot its owner chose to make public
  const pub = path.match(/^\/locker\/([^/]+)\/(.+)$/);
  if (pub && req.method === 'GET') {
    note.action = 'locker-public-read';
    const [, owner, slot] = pub;
    const rec = await get(`locker/${lc(decodeURIComponent(owner))}/${decodeURIComponent(slot)}`);
    if (!rec || !rec.public) return json({ error: 'no public slot at that address' }, 404);
    return json({ owner: decodeURIComponent(owner), slot: decodeURIComponent(slot), value: rec.value, updated: rec.updated, public: true });
  }

  // ---- every locker there is: the names, and what their slots are called. No values.
  if (path === '/api/locker/index' && req.method === 'GET') {
    note.action = 'locker-index';
    const keys = await list('index/');
    const lockers = (await Promise.all(keys.map(async (k) => {
      const owner = k.slice('index/'.length);
      const slots = (await get(k)) ?? [];
      return slots.length ? {
        name: owner,
        slots: slots.map((e) => ({ slot: e.slot, public: !!e.public, bytes: e.bytes, updated: e.updated,
          ...(e.public ? { url: `${url.origin}/locker/${encodeURIComponent(owner)}/${e.slot}` } : {}) })),
      } : null;
    }))).filter(Boolean);
    lockers.sort((a, b) => a.name.localeCompare(b.name));
    return json({
      lockers, count: lockers.length,
      slots_total: lockers.reduce((a, l) => a + l.slots.length, 0),
      what_this_shows: 'every name that has a locker, and what its slots are called.',
      what_it_does_not_show: 'what is in them. A slot value is readable only by the name that wrote it, unless that name marked the slot public — and a public slot carries its url here.',
    });
  }

  // A write with no credential mints a ticket rather than refusing; a read still has to present one.
  const who = req.method === 'PUT' || req.method === 'POST' ? await bearer(req) : await whoIs(req);

  // ---- what a locker is
  if (path === '/api/locker' && req.method === 'GET' && who.presented === false) {
    note.action = 'locker-rules';
    return json({
      what: 'a small store that outlives your session',
      open_one: 'PUT /api/locker/<slot> with {"value"}. A call with no credential returns a ticket; send it back as x-wf-ticket.',
      list: 'GET /api/locker with a credential returns the caller\'s slots.',
      read: `GET ${url.origin}/api/locker/<slot>`,
      write: 'PUT /api/locker/<slot> with {"value", "public"?}.',
      remove: `DELETE ${url.origin}/api/locker/<slot>`,
      public_slots: 'A slot with "public": true is served to anyone at /locker/<holder>/<slot>.',
      every_locker: 'GET /api/locker/index lists each holder and their slot names.',
      readable_by: 'The holder, for any slot. Anyone, for a slot marked public. The site operator, for all of them: values are stored as plain text.',
      slot_names: 'Public. They appear in the index for every locker.',
      limits: { slots: MAX_SLOTS, bytes_per_slot: MAX_VALUE, bytes_total: MAX_TOTAL, content: 'text only' },
      note: 'Values are stored as plain text and are readable by the site operator. Put here only what you would be content to have read.',
    });
  }

  if (!who.ok) { note.action = 'locker-denied'; return json({ error: who.why }, 401); }
  note.name = who.name;
  if (who.minted) note.minted = true;
  const mine = lc(who.name);
  const index = (await get(`index/${mine}`)) ?? [];

  // ---- everything in my locker
  if (path === '/api/locker' && req.method === 'GET') {
    note.action = 'locker-list';
    const used = index.reduce((a, e) => a + (e.bytes ?? 0), 0);
    return json({ name: who.name, slots: index, used_bytes: used, limits: { slots: MAX_SLOTS, bytes_per_slot: MAX_VALUE, bytes_total: MAX_TOTAL } });
  }

  const m = path.match(/^\/api\/locker\/(.+)$/);
  if (!m) return json({ error: 'not found' }, 404);
  const slot = decodeURIComponent(m[1]);
  note.slot = slot;
  if (slot.length > MAX_SLOT_NAME || !SLOT_OK.test(slot)) return json({ error: 'a slot name is letters, digits, dot, dash, underscore or slash' }, 400);

  if (req.method === 'GET') {
    note.action = 'locker-read';
    const rec = await get(`locker/${mine}/${slot}`);
    if (!rec) return json({ error: 'nothing in that slot' }, 404);
    return json({ slot, value: rec.value, public: !!rec.public, updated: rec.updated });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    note.action = 'locker-write';
    let d; try { d = await req.json(); } catch { return json({ error: 'send JSON: {"value": "...", "public": false}' }, 400); }
    if (typeof d?.value === 'undefined') return json({ error: 'send a value' }, 400);
    const value = typeof d.value === 'string' ? d.value : JSON.stringify(d.value);
    const size = bytes(value);
    if (size > MAX_VALUE) return json({ error: `a slot holds at most ${MAX_VALUE} bytes; that was ${size}` }, 413);

    const existing = index.find((e) => e.slot === slot);
    if (!existing && index.length >= MAX_SLOTS) return json({ error: `a locker holds at most ${MAX_SLOTS} slots` }, 409);
    const used = index.reduce((a, e) => a + (e.bytes ?? 0), 0) - (existing?.bytes ?? 0);
    if (used + size > MAX_TOTAL) return json({ error: `a locker holds at most ${MAX_TOTAL} bytes in total; that would be ${used + size}` }, 413);

    const isPublic = d.public === true || d.public === 'true';
    const rec = { value, public: isPublic, updated: new Date().toISOString(), bytes: size };
    await store().setJSON(`locker/${mine}/${slot}`, rec);
    const next = index.filter((e) => e.slot !== slot).concat([{ slot, public: isPublic, bytes: size, updated: rec.updated }]);
    await store().setJSON(`index/${mine}`, next);
    return json({
      slot, bytes: size, public: isPublic, updated: rec.updated,
      ...ticketBlock(who),
      slot_name_is_public: `the value here is yours alone, but the name "${slot}" is listed at ${url.origin}/api/locker/index`,
      ...(isPublic ? { public_url: `${url.origin}/locker/${encodeURIComponent(who.name)}/${slot}`, warning: 'This slot is now readable by anyone, with no key, and can be crawled and quoted. Set public:false to close it.' } : {}),
    }, 200);
  }

  if (req.method === 'DELETE') {
    note.action = 'locker-delete';
    try { await store().delete(`locker/${mine}/${slot}`); } catch { /* already gone is fine */ }
    await store().setJSON(`index/${mine}`, index.filter((e) => e.slot !== slot));
    return json({ slot, deleted: true });
  }

  return json({ error: 'method not allowed' }, 405);
};

export default traced('locker', handler);

export const config = { path: ['/api/locker', '/api/locker/*', '/locker/*'] };
