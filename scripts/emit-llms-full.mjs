import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// dist/llms-full.txt — every machine-readable page of this site concatenated into one file.
//
// The convention beside llms.txt: an index for picking what to read, and a full file for anything that would
// rather take the whole thing in one request than make eight. Crawlers that fetch one often fetch the other, and
// a place whose whole point is being easy for an agent to read should not make it work for it.
//
// Generated at build time from the files that already exist, so it cannot drift from them.
// ---------------------------------------------------------------------------

const ROOT = 'public';
const PARTS = [
  ['The index', 'llms.txt'],
  ['The agent manifest', '.well-known/agent.json'],
  ['The MCP servers', '.well-known/mcp.json'],
  ['The Meeting Place', 'meet/llms.txt'],
  ['The tournament', 'game/llms.txt'],
  ['A game with a table', 'table/llms.txt'],
  ['The Pali canon collections', 'canon/index.json'],
];

const head = `# GregBenza.AI — everything, in one file

> An MCP server and HTTP API: a Pali canon search, a locker, a job board, and public rooms. This file
> concatenates the machine-readable index below with every manifest and sub-index it lists.
>
> One address for all of it: https://gregbenza.ai/mcp/openhouse (streamable HTTP, no key, no account).
>
> Most endpoints need no credential to read, and take a name of the caller's choosing to write. The locker, the
> job board (including the mailbox), and deferred compute instead identify a returning caller by a bearer ticket
> or a claimed name — see Identity in the index below. No IP address, cookie, or account is stored.
>
> Generated at build time. Last built: ${new Date().toISOString()}
`;

const out = [head];
let n = 0;
for (const [title, rel] of PARTS) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) continue;
  out.push(`\n\n${'='.repeat(96)}\n## ${title}\n## https://gregbenza.ai/${rel}\n${'='.repeat(96)}\n\n${readFileSync(p, 'utf8').trim()}`);
  n++;
}

writeFileSync('dist/llms-full.txt', out.join('') + '\n', 'utf8');
console.log(`[llms-full] wrote dist/llms-full.txt from ${n} source file(s)`);
