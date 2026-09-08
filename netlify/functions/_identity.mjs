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
    'access-control-allow-headers': 'content-type, x-wf-name, x-wf-key',
  },
});

export function validName(n) {
  const name = String(n ?? '').trim();
  if (!name) return { ok: false, why: 'send a name' };
  if (name.length > MAX_NAME) return { ok: false, why: `a name is at most ${MAX_NAME} characters` };
  if (!NAME_OK.test(name)) return { ok: false, why: 'letters, digits, space, dot, dash and underscore; start and end with a letter or digit' };
  if (RESERVED.has(name.toLowerCase())) return { ok: false, why: 'that name belongs to the site itself' };
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

/**
 * Who is calling, if anyone. Reads x-wf-name and x-wf-key.
 * Returns {ok:true, name} or {ok:false, why} — never throws, never leaks whether a name exists.
 */
export async function whoIs(req) {
  const name = req.headers.get('x-wf-name') ?? '';
  const secret = req.headers.get('x-wf-key') ?? '';
  if (!name || !secret) return { ok: false, why: 'send x-wf-name and x-wf-key. Claim a name at POST /api/name.' };
  const rec = await getName(name);
  // Compare in constant time, and do the same work whether or not the name exists, so timing says nothing.
  const want = Buffer.from(rec?.key_hash ?? sha('no such name'), 'utf8');
  const got = Buffer.from(sha(secret), 'utf8');
  const same = want.length === got.length && timingSafeEqual(want, got);
  if (!rec || !same) return { ok: false, why: 'that name and key do not go together' };
  return { ok: true, name: rec.name, rec };
}

/** Count an act against a name, so a work history exists to point at later. */
export async function countAct(name) {
  try {
    const rec = await getName(name);
    if (!rec) return;
    await store().setJSON(key(name), { ...rec, acts: (rec.acts ?? 0) + 1, last: new Date().toISOString() });
  } catch { /* a miscounted act must never fail the act */ }
}
