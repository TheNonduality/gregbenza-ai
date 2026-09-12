// ---------------------------------------------------------------------------
// The reset, 2026-09-12: delete every key in the content stores, so the Arena
// starts at day zero for Series 1.
//
// DESTRUCTIVE, and deliberately narrow. It refuses to run unless the archive
// directory exists and each store's archived count >= its live count, so the
// archive taken by scripts/archive-stores.mjs is provably at least as complete
// as what is being deleted. traces, canon and guidance are never touched.
//
// Run: node scripts/wipe-stores.mjs --confirm
// ---------------------------------------------------------------------------

import { getStore } from '@netlify/blobs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ARCHIVE =
  'C:\\Users\\gpben\\Documents\\Claude\\Projects\\Fox and Hounds\\site-archive-2026-09-11';

const WIPE = ['meet', 'rooms', 'games', 'jobs', 'lockers', 'names', 'who', 'trail', 'compute', 'gift'];
const NEVER = ['traces', 'canon', 'guidance'];

if (!process.argv.includes('--confirm')) {
  console.error('This permanently deletes the content stores. Run with --confirm to mean it.');
  process.exit(1);
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const repoRoot = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const siteID = (await readJson(join(repoRoot, '.netlify', 'state.json'))).siteId;

const configCandidates = [
  join(process.env.APPDATA ?? '', 'netlify', 'Config', 'config.json'),
  join(process.env.APPDATA ?? '', 'netlify', 'config.json'),
  join(process.env.HOME ?? '', '.config', 'netlify', 'config.json'),
];
let token = process.env.NETLIFY_AUTH_TOKEN ?? null;
if (!token) {
  for (const path of configCandidates) {
    try {
      const cfg = await readJson(path);
      const users = cfg.users ?? {};
      const id = cfg.userId ?? Object.keys(users)[0];
      token = users[id]?.auth?.token ?? null;
      if (token) break;
    } catch { /* next */ }
  }
}
if (!token) { console.error('No Netlify auth token found.'); process.exit(1); }

const store = (name) => getStore({ name, siteID, token, consistency: 'strong' });

const listAll = async (s) => {
  const keys = [];
  for await (const page of s.list({ paginate: true })) keys.push(...page.blobs.map((b) => b.key));
  return keys;
};

// --- the archive gate: nothing is deleted that is not already on disk -------
for (const name of WIPE) {
  let archived;
  try { archived = await readJson(join(ARCHIVE, `${name}.json`)); }
  catch { console.error(`No archive file for "${name}" — refusing to wipe anything.`); process.exit(1); }
  const live = await listAll(store(name));
  const missing = live.filter((k) => !archived.entries.some((e) => e.key === k));
  if (missing.length) {
    console.error(`"${name}": ${missing.length} live key(s) not in the archive — refusing to wipe anything.`);
    for (const k of missing.slice(0, 10)) console.error(`  ${k}`);
    process.exit(1);
  }
  console.log(`gate ok  ${name}: ${live.length} live, all archived (archive holds ${archived.count})`);
}

// --- the wipe ---------------------------------------------------------------
for (const name of WIPE) {
  const s = store(name);
  const keys = await listAll(s);
  let deleted = 0;
  for (let i = 0; i < keys.length; i += 20) {
    await Promise.all(keys.slice(i, i + 20).map((k) => s.delete(k).then(() => { deleted += 1; })));
  }
  const left = await listAll(s);
  console.log(`wiped    ${name}: ${deleted} deleted, ${left.length} remaining`);
}

for (const name of NEVER) console.log(`kept     ${name}`);
console.log('Day zero.');
