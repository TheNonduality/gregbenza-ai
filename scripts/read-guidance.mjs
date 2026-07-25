// ---------------------------------------------------------------------------
// Read the guidance visitors have sent. Run: npm run guidance
//
// Feedback that nobody can read is the same as feedback that was never sent,
// so this ships alongside the function that stores it. Uses the Netlify CLI's
// existing login — no tokens to manage, nothing to configure.
// ---------------------------------------------------------------------------

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const STORE = 'guidance';
const isWindows = process.platform === 'win32';

// Windows cannot spawn npx.cmd without a shell, and Node warns that shelled
// arguments go unescaped. That warning does not apply here: every argument is
// program-generated — a fixed store name and keys we mint ourselves as
// ISO-timestamp + UUID. Visitor-written text is never passed as an argument;
// it only ever comes back on stdout. Silencing just the deprecation notice so
// the output stays readable.
process.noDeprecation = true;

const cli = async (args) => {
  const { stdout } = await run(isWindows ? 'npx.cmd' : 'npx', ['netlify-cli', ...args], {
    maxBuffer: 10 * 1024 * 1024,
    shell: isWindows,
  });
  return stdout;
};

let keys = [];
try {
  const raw = await cli(['blobs:list', STORE, '--json']);
  const parsed = JSON.parse(raw.slice(raw.indexOf('{') >= 0 ? raw.indexOf('{') : 0));
  keys = (parsed.blobs ?? parsed).map((b) => b.key ?? b);
} catch (err) {
  console.error('Could not reach the guidance store.');
  console.error('Check you are logged in:  npx netlify-cli status');
  console.error(err?.message ?? err);
  process.exit(1);
}

if (!keys.length) {
  console.log('\nNo guidance yet.\n');
  process.exit(0);
}

// Keys start with an ISO timestamp, so sorting them sorts by time. Newest last
// so the most recent message is the one left on screen.
keys.sort();

console.log(`\n${keys.length} message${keys.length === 1 ? '' : 's'}\n`);

for (const key of keys) {
  let entry;
  try {
    entry = JSON.parse(await cli(['blobs:get', STORE, key]));
  } catch {
    console.log(`  (could not read ${key})\n`);
    continue;
  }
  const when = new Date(entry.receivedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  console.log('─'.repeat(70));
  console.log(`${when}   about: ${entry.context}`);
  console.log(`from: ${entry.from ?? 'anonymous'}`);
  console.log('');
  console.log(entry.message);
  console.log('');
}
console.log('─'.repeat(70));
console.log(`\nTo delete one:  npx netlify-cli blobs:delete ${STORE} "<key>"\n`);
