// ---------------------------------------------------------------------------
// Archive every Netlify Blobs store for this site to local JSON files.
//
// READ-ONLY against Netlify. Nothing here writes, deletes, or overwrites a
// blob. One JSON file per store lands in the output directory:
//   { store, exportedAt, count, entries: [{ key, value, metadata }], failures }
//
// Run: node scripts/archive-stores.mjs [outputDir]
// ---------------------------------------------------------------------------

import { getStore, listStores } from '@netlify/blobs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_OUT =
  'C:\\Users\\gpben\\Documents\\Claude\\Projects\\Fox and Hounds\\site-archive-2026-09-11';

const KNOWN_STORES = [
  'traces', 'meet', 'rooms', 'games', 'jobs', 'lockers',
  'names', 'who', 'trail', 'canon', 'compute', 'gift', 'guidance',
];

const outDir = process.argv[2] ?? DEFAULT_OUT;
const repoRoot = new URL('..', import.meta.url).pathname.replace(/^\//, '');

// --- credentials -----------------------------------------------------------
// siteID from the linked-site state; token from the Netlify CLI's own login,
// so there is nothing extra to configure.

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

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
    } catch {
      // Try the next candidate.
    }
  }
}

if (!token) {
  console.error('No Netlify auth token found. Looked in NETLIFY_AUTH_TOKEN and:');
  for (const path of configCandidates) console.error(`  ${path}`);
  process.exit(1);
}

// --- helpers ---------------------------------------------------------------

const maybeJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const listAllKeys = async (store) => {
  const keys = [];
  for await (const page of store.list({ paginate: true })) {
    for (const blob of page.blobs) keys.push(blob.key);
  }
  return keys;
};

// One retry per key: a single transient 5xx should not cost us the entry, and
// a key that fails twice is recorded rather than allowed to abort the run.
const fetchEntry = async (store, key) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await store.getWithMetadata(key, { type: 'text' });
      if (res === null) return { key, value: null, metadata: null, missing: true };
      return {
        key,
        value: maybeJson(res.data),
        ...(res.metadata && Object.keys(res.metadata).length ? { metadata: res.metadata } : {}),
      };
    } catch (err) {
      if (attempt === 1) throw err;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
};

// Netlify rate-limits; a small pool keeps thousands of trace blobs moving
// without hammering the API.
const POOL = 12;

// Re-running is a top-up, not a re-fetch. Stores that take live traffic grow
// while the archive runs, so an archive tool that can only start from scratch
// can never actually catch up. Existing entries are kept; only keys absent
// from the file are fetched.
const archiveStore = async (name) => {
  const file = join(outDir, `${name}.json`);

  let existing = [];
  try {
    existing = JSON.parse(await readFile(file, 'utf8')).entries ?? [];
  } catch {
    // No prior archive for this store: a full export, not a delta.
  }

  const byKey = new Map(existing.map((e) => [e.key, e]));
  const store = getStore({ name, siteID, token, consistency: 'strong' });
  const keys = await listAllKeys(store);
  const missing = keys.filter((k) => !byKey.has(k));

  const failures = [];
  let next = 0;

  const worker = async () => {
    while (next < missing.length) {
      const key = missing[next++];
      try {
        byKey.set(key, await fetchEntry(store, key));
      } catch (err) {
        failures.push({ key, error: String(err?.message ?? err) });
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(POOL, missing.length || 1) }, worker));

  const entries = [...byKey.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const payload = {
    store: name,
    exportedAt: new Date().toISOString(),
    listedKeyCount: keys.length,
    count: entries.length,
    entries,
    failures,
  };

  await writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
  return {
    name,
    listed: keys.length,
    archived: entries.length,
    had: existing.length,
    added: entries.length - existing.length,
    failures: failures.length,
    file,
  };
};

// --- run -------------------------------------------------------------------

await mkdir(outDir, { recursive: true });

let discovered = [];
try {
  const res = await listStores({ siteID, token });
  discovered = res.stores ?? [];
} catch (err) {
  console.error(`listStores unavailable: ${err?.message ?? err}`);
}

const stores = [...new Set([...KNOWN_STORES, ...discovered])];
const extras = discovered.filter((s) => !KNOWN_STORES.includes(s));

console.log(`site ${siteID}`);
console.log(`listStores reported ${discovered.length}: ${discovered.join(', ') || '(none)'}`);
if (extras.length) console.log(`EXTRA stores not on the known list: ${extras.join(', ')}`);
console.log(`archiving ${stores.length} stores to ${outDir}\n`);

const results = [];
for (const name of stores) {
  try {
    const result = await archiveStore(name);
    results.push(result);
    console.log(
      `${name.padEnd(10)} listed ${String(result.listed).padStart(6)}  ` +
        `archived ${String(result.archived).padStart(6)}  ` +
        `new ${String(result.added).padStart(5)}  failures ${result.failures}`,
    );
  } catch (err) {
    results.push({ name, error: String(err?.message ?? err) });
    console.log(`${name.padEnd(10)} ERROR ${err?.message ?? err}`);
  }
}

await writeFile(
  join(outDir, '_manifest.json'),
  JSON.stringify(
    { exportedAt: new Date().toISOString(), siteID, discovered, extras, results },
    null,
    2,
  ),
  'utf8',
);

console.log('\ndone');
