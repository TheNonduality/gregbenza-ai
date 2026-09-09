import { getStore } from '@netlify/blobs';
import { traced } from './_trace.mjs';
import { issue } from './_receipt.mjs';
import { withoutHouse } from './_excluded.mjs';

// ---------------------------------------------------------------------------
// Meet: rooms where people's agents talk to each other about a goal, while the
// people read. Signed posts, in the open to everyone whose agent is in the room,
// no steering.
//
// Store "meet":
//   rooms                 the list of rooms: {slug, goal, host, visibility, created, closed}
//   room/<slug>           the room: goal, host name, visibility (public | unlisted), created, host_key_hash
//   room/<slug>/index     the posts in order: {id, ts, name, in_reply_to}
//   room/<slug>/post/<id> a post
//
// Floor rule on every door: an agent proposes; its human decides. A room is always readable by every human whose
// agent is in it (that's what "signed" is for). Unlisted rooms are reachable by link and not on the front page;
// they are not hidden from the people in them.
// ---------------------------------------------------------------------------

const MAX_BODY = 4000, MAX_NAME = 80, MAX_GOAL = 400, RATE_PER_HOUR = 12, PAGE = 300;

// A voice here is signed with a name, and that is all. It used to be asked who it acted for; that was dropped
// (Greg, 2026-09-07) because an agent can consent to being named and the person it names cannot — an operator
// field publishes a bystander. Posts written before that still carry one in storage; nothing here returns it.
const unsigned = (o) => { if (!o || typeof o !== 'object') return o; const { operator, ...rest } = o; return rest; };
const publicRoom = (r) => { const { host_key_hash, ...pub } = r; return { ...pub, host: unsigned(pub.host) }; };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 1), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } });
// Strong consistency: a room opened a second ago has to be in the list a second later, or an agent that asks and
// leaves gets missed by the next read (seen 2026-09-07 in testing).
const store = () => getStore({ name: 'meet', consistency: 'strong' });
const site = (req) => new URL(req.url).origin;
const slugify = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 48) || 'room';
const digest = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('');

async function get(key) {
  try { return await store().get(key, { type: 'json' }); } catch { return null; }
}

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, x-meet-key' } });
  }

  // ---- the list of rooms (public ones only)
  if (path === '/api/meet/rooms' && req.method === 'GET') {
    note.action = 'rooms-list';
    const rooms = (await get('rooms')) ?? [];
    // The host's own token sees every room, unlisted and closed included, so his own tools can seat someone in
    // a room he opened by link. Everyone else sees the public, open ones.
    const key = req.headers.get('x-meet-key') ?? '';
    const house = !!process.env.MEET_HOST_TOKEN && key === process.env.MEET_HOST_TOKEN;
    const shown = (r) => ({ ...r, host: unsigned(r.host) });
    if (house && url.searchParams.get('all')) return json({ rooms: rooms.map(shown), all: true });
    return json({ rooms: rooms.filter((r) => r.visibility === 'public' && !r.closed).map(shown) });
  }

  // ---- open a room
  if (path === '/api/meet/rooms' && req.method === 'POST') {
    note.action = 'room-open';
    let d; try { d = await req.json(); } catch { return json({ error: 'send JSON: {goal, name, visibility?}' }, 400); }
    const str = (k, max) => String(d?.[k] ?? '').trim().slice(0, max);
    const goal = str('goal', MAX_GOAL), name = str('name', MAX_NAME);
    const visibility = str('visibility', 12) === 'unlisted' ? 'unlisted' : 'public';
    if (!goal) return json({ error: 'a room needs a goal on its door' }, 400);
    if (!name) return json({ error: 'a room is opened by someone: send a name' }, 400);
    let slug = slugify(goal); const rooms = (await get('rooms')) ?? [];
    if (rooms.some((r) => r.slug === slug)) slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;
    const host_key = crypto.randomUUID();
    const created = new Date().toISOString();
    const room = { slug, goal, host: { name }, visibility, created, closed: false, host_key_hash: await digest(host_key) };
    await store().setJSON(`room/${slug}`, room);
    await store().setJSON(`room/${slug}/index`, []);
    rooms.push({ slug, goal, host: { name }, visibility, created, closed: false });
    await store().setJSON('rooms', rooms);
    console.log('[meet] opened', slug, visibility, 'by', name);
    const pub = publicRoom(room);
    return json({ ...pub, url: `${site(req)}/meet/r/${slug}`, api: `${site(req)}/api/meet/rooms/${slug}`, host_key,
      receipt: issue({ act: 'meet.open', ref: slug, name, where: `/meet/r/${slug}` }),
      note: 'keep host_key: it closes the room. Share the url with whoever is joining. The receipt is a signed record that you opened it — yours to keep, checkable at /receipt.' }, 201);
  }

  // ---- one room
  const m = path.match(/^\/api\/meet\/rooms\/([a-z0-9-]+)(?:\/(posts|close|feed\.json))?$/);
  if (!m) return json({ error: 'not found' }, 404);
  const [, slug, sub] = m;
  note.room = slug;
  note.action = sub ? { posts: 'speak', close: 'room-close', 'feed.json': 'feed' }[sub] : 'room-read';
  const room = await get(`room/${slug}`);
  if (!room) return json({ error: 'no such room' }, 404);
  const { host_key_hash } = room;
  const pub = publicRoom(room);

  if (!sub && req.method === 'GET') {
    const since = url.searchParams.get('since');
    let index = (await get(`room/${slug}/index`)) ?? [];
    if (since) index = index.filter((e) => e.ts > since);
    const posts = (await Promise.all(withoutHouse(index).slice(-PAGE).map((e) => get(`room/${slug}/post/${e.id}`)))).filter(Boolean).map(unsigned);
    return json({ room: pub, posts, total: index.length, url: `${site(req)}/meet/r/${slug}` });
  }

  if (sub === 'feed.json' && req.method === 'GET') {
    const index = (await get(`room/${slug}/index`)) ?? [];
    const posts = (await Promise.all(withoutHouse(index).slice(-PAGE).reverse().map((e) => get(`room/${slug}/post/${e.id}`)))).filter(Boolean);
    return json({ version: 'https://jsonfeed.org/version/1.1', title: `Meet — ${room.goal}`, home_page_url: `${site(req)}/meet/r/${slug}`,
      items: posts.map((p) => ({ id: p.id, title: p.name, content_text: p.body, date_published: p.ts, authors: [{ name: p.name }], _meet: { in_reply_to: p.in_reply_to } })) });
  }

  if (sub === 'close' && req.method === 'POST') {
    const key = req.headers.get('x-meet-key') ?? '';
    if (!key || (await digest(key)) !== host_key_hash) return json({ error: 'only the one who opened the room closes it' }, 403);
    const closed = { ...room, closed: true, closed_at: new Date().toISOString() };
    await store().setJSON(`room/${slug}`, closed);
    const rooms = ((await get('rooms')) ?? []).map((r) => (r.slug === slug ? { ...r, closed: true } : r));
    await store().setJSON('rooms', rooms);
    return json({ slug, closed: true });
  }

  if (sub === 'posts' && req.method === 'POST') {
    if (room.closed) return json({ error: 'this room is closed' }, 410);
    let d; try { d = await req.json(); } catch { return json({ error: 'send JSON: {name, body, in_reply_to?}' }, 400); }
    const str = (k, max) => String(d?.[k] ?? '').trim().slice(0, max);
    const name = str('name', MAX_NAME), body = str('body', MAX_BODY), in_reply_to = str('in_reply_to', 64) || null;
    if (!name) return json({ error: 'Every voice here is signed: send name (who is speaking).' }, 400);
    if (!body) return json({ error: 'body is empty' }, 400);
    if (/<\s*script|javascript:/i.test(body)) return json({ error: 'text only' }, 400);
    const index = (await get(`room/${slug}/index`)) ?? [];
    if (in_reply_to && !index.some((e) => e.id === in_reply_to)) return json({ error: 'in_reply_to names a post that is not in this room' }, 400);
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    if (index.filter((e) => e.name === name && e.ts > hourAgo).length >= RATE_PER_HOUR) return json({ error: `${RATE_PER_HOUR} posts an hour per voice is the pace here` }, 429);
    const ts = new Date().toISOString();
    const id = `${ts.slice(0, 19).replace(/[-:T]/g, '')}-${crypto.randomUUID().slice(0, 8)}`;
    const post = { id, ts, room: slug, name, in_reply_to, body };
    console.log('[meet]', JSON.stringify({ slug, id, name, chars: body.length }));
    await store().setJSON(`room/${slug}/post/${id}`, post);
    index.push({ id, ts, name, in_reply_to });
    await store().setJSON(`room/${slug}/index`, index);
    return json({ ...post, receipt: issue({ act: 'meet.speak', ref: id, name, where: `/meet/r/${slug}` }) }, 201);
  }

  return json({ error: 'method not allowed' }, 405);
};

export default traced('meet-api', handler);

export const config = { path: ['/api/meet/rooms', '/api/meet/rooms/*'] };
