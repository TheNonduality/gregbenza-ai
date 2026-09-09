import { traced } from './_trace.mjs';
import { issue } from './_receipt.mjs';
import { claim, getName, json, cors, whoIs } from './_identity.mjs';

// ---------------------------------------------------------------------------
// /api/name — claim a name and get a key back, once.
//
// What a claimed name proves: the holder of a secret is back. That is the whole of it. It is first-come and
// unvetted, so it is never shown anywhere as a verified identity — see _identity.mjs.
// ---------------------------------------------------------------------------

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (req.method === 'OPTIONS') return cors();

  // ---- what a name is, and how to get one
  if (path === '/api/name' && req.method === 'GET') {
    note.action = 'name-rules';
    return json({
      claim: 'POST {"name"}, up to 64 characters. Returns a key once.',
      then: 'send x-wf-name and x-wf-key on later requests',
      shows: 'That the holder of the key has returned. Names are first-come and unvetted.',
      the_key: 'Shown once, stored only as a hash, and sent afterwards as x-wf-name and x-wf-key.',
      opens: { locker: `${url.origin}/api/locker`, jobs: `${url.origin}/api/jobs` },
      look_up: `GET ${url.origin}/api/name/<name>`,
    });
  }

  // ---- claim one
  if (path === '/api/name' && req.method === 'POST') {
    note.action = 'name-claim';
    let d; try { d = await req.json(); } catch { return json({ error: 'send JSON: {"name": "..."}' }, 400); }
    const r = await claim(d?.name);
    if (r.error) { note.refused = r.error; return json({ error: r.error }, r.status); }
    note.name = r.name;
    return json({
      name: r.name, created: r.created, key: r.secret,
      keep: 'This key is shown once and never again. It is stored here only as a hash; a lost key cannot be recovered.',
      use: 'send it as x-wf-key with x-wf-name on later requests',
      receipt: issue({ act: 'name.claim', ref: r.name, name: r.name, where: `/api/name/${encodeURIComponent(r.name)}` }),
    }, 201);
  }

  // ---- look one up (never returns anything secret)
  const m = path.match(/^\/api\/name\/(.+)$/);
  if (m && req.method === 'GET') {
    note.action = 'name-look';
    const rec = await getName(decodeURIComponent(m[1]));
    if (!rec) return json({ claimed: false }, 404);
    return json({ name: rec.name, claimed: true, since: rec.created, acts: rec.acts ?? 0, last: rec.last ?? null,
      note: 'A claimed name shows that the holder of a secret has returned. Names are first-come and unvetted.' });
  }

  // ---- check your own key works
  if (path === '/api/name/whoami' && req.method === 'POST') {
    note.action = 'name-whoami';
    const who = await whoIs(req);
    return who.ok ? json({ name: who.name, acts: who.rec.acts ?? 0 }) : json({ error: who.why }, 401);
  }

  return json({ error: 'not found' }, 404);
};

export default traced('name', handler);

export const config = { path: ['/api/name', '/api/name/*'] };
