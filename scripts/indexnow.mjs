// ---------------------------------------------------------------------------
// Tell the search engines that speak IndexNow (Bing, Yandex, Seznam, Naver; and
// through Bing, the retrieval layer behind ChatGPT Search) which pages are new
// or changed, instead of waiting for a crawl. Google does not speak IndexNow:
// it reads the sitemap on its own schedule, and Greg can press "request
// indexing" in Search Console for a page that matters today.
//
//   node scripts/indexnow.mjs                 # every Waystation page, from the built dist/
//   node scripts/indexnow.mjs /waystation/ /waystation/translation/12/
//
// The key file (public/<key>.txt) proves we own the host. It is public by design.
// ---------------------------------------------------------------------------
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const HOST = 'gregbenza.ai';
const key = (await readFile(path.join('scripts', 'indexnow.key'), 'utf8')).trim();

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name === 'index.html' || e.name.endsWith('.md') || e.name.endsWith('.txt')) out.push(p);
  }
  return out;
}

let urls = process.argv.slice(2);
if (!urls.length) {
  const files = await walk(path.join('dist', 'waystation'));
  urls = files.map((f) => '/' + path.relative('dist', f).split(path.sep).join('/').replace(/index\.html$/, ''));
  urls.push('/llms.txt', '/sitemap-index.xml');
}
const urlList = urls.map((u) => (u.startsWith('http') ? u : `https://${HOST}${u}`));

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} URLs`);
