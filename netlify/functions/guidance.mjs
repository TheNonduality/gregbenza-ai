import { getStore } from '@netlify/blobs';

// ---------------------------------------------------------------------------
// The feedback door, owned by us instead of by Netlify Forms.
//
// WHY THIS EXISTS: Netlify Forms accepted every submission — the form was
// detected, `last_submission_at` updated to the second on each attempt — and
// stored none of them. Verified 2026-07-25 across four tries: automated
// browser, bare curl, curl with an empty honeypot, and Greg's own phone. All
// discarded identically, and no spam bucket existed to hold them, so it was
// storage never engaging rather than a filter making decisions.
//
// Rather than keep guessing at that, the form now posts here. Two places
// receive every message on purpose:
//   1. Netlify Blobs — durable, survives deploys, queryable from the CLI.
//   2. The function log — readable in the Netlify UI with no tooling at all,
//      and the fallback if a blob write ever fails.
// Losing a stranger's feedback silently is the one outcome worth engineering
// against, so neither path is trusted alone.
// ---------------------------------------------------------------------------

const MAX_MESSAGE = 5000;
const MAX_FROM = 200;

const seeThanks = (req) =>
  new Response(null, {
    status: 303,
    headers: { Location: new URL('/thanks/', req.url).href },
  });

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let form;
  try {
    form = await req.formData();
  } catch {
    return new Response('Could not read that submission', { status: 400 });
  }

  const str = (key) => (form.get(key) ?? '').toString().trim();

  // The honeypot sits off-screen: a person never sees it, a bot fills every
  // field it finds. Anything in here is a bot — show the same thank-you page
  // so it learns nothing, and drop the message.
  if (str('bot-field')) return seeThanks(req);

  const message = str('message').slice(0, MAX_MESSAGE);
  if (!message) return new Response('A message is required', { status: 400 });

  const entry = {
    receivedAt: new Date().toISOString(),
    context: str('context') || 'site',
    from: str('from').slice(0, MAX_FROM) || null,
    message,
  };

  // Logged first: if the blob write throws, the message still exists somewhere.
  console.log('[guidance]', JSON.stringify(entry));

  try {
    const store = getStore('guidance');
    await store.setJSON(`${entry.receivedAt}-${crypto.randomUUID()}`, entry);
  } catch (err) {
    console.error('[guidance] blob write failed, message survives in this log:', err?.message);
  }

  return seeThanks(req);
};

// A clean public path — the form posts to /api/guidance, not to a
// /.netlify/functions/... URL that leaks the plumbing.
export const config = { path: '/api/guidance' };
