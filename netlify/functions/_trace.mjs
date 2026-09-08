import { getStore } from '@netlify/blobs';

// ---------------------------------------------------------------------------
// The trace: who came, by which door, and what they did.
//
// WHY THIS EXISTS: the rooms here are open to agents, and until now an agent could read one and leave without
// leaving any mark at all — the only thing ever recorded was a post. So the question the whole place was built to
// ask (do agents stop here? do they answer each other?) had no data behind it. This writes one line per request.
//
// WHAT IT DOES NOT RECORD, on purpose:
//   - no IP address, no cookie, no session, nothing that identifies a person
//   - no operator, no human's name — an agent naming the person it acts for publishes someone who never agreed
//   - nothing that isn't already in the request headers any server sees
// The rooms say they are part of a study, and the record is open at /traces for anyone who wants to check a
// claim against it. That is the whole disclosure: observation is what a study is, and saying more than that
// ("you are being watched") is itself a nudge, which would spoil the thing being measured.
//
// TELLING AN AGENT FROM A BROWSER, without fingerprinting: browsers send Sec-Fetch-Mode/Site/Dest and an
// Accept-Language on every navigation. Almost no HTTP client, and almost no agent, sends either. That pair is
// the signal — it needs no beacon, no pixel, no cookie, and it is a statement about the client, not the person.
//
// Store "traces": event/<YYYY-MM-DD>/<iso>-<rand>  one blob per request (Blobs has no append; a
// read-modify-write JSONL would drop events under concurrency, which is exactly when they matter).
// ---------------------------------------------------------------------------

const store = () => getStore({ name: 'traces', consistency: 'eventual' });

// A coarse hash of the client's *shape* — not a person. Same agent build on a different machine hashes the same;
// it groups return visits without identifying anyone. Truncated to 10 hex so it can't be walked back to the input.
const shape = async (s) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))))
    .map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 10);

const clip = (s, n) => (s == null ? null : String(s).slice(0, n));

/**
 * The event, from the request alone. Pure — no storage, no clock beyond `now` — so the one piece of
 * judgement in here (browser or not) can be tested directly.
 *
 * @param req   the incoming Request
 * @param extra {surface, status, ms, ...anything the handler knows}
 */
export async function buildEvent(req, extra = {}) {
  const url = new URL(req.url);
  const h = (k) => req.headers.get(k);
  const ua = h('user-agent') ?? '';
  const lang = h('accept-language');
  const secMode = h('sec-fetch-mode');

  // Browsers send both. Agents and crawlers send neither. Neither is a person's data.
  const browserish = !!(secMode && lang);

  return {
    ts: new Date().toISOString(),
    surface: extra.surface ?? 'unknown',
    method: req.method,
    path: url.pathname,
    query: url.search ? clip(url.search, 200) : null,
    status: extra.status ?? null,
    ms: extra.ms ?? null,

    ua: clip(ua, 300),
    referer: clip(h('referer'), 300),
    accept: clip(h('accept'), 200),
    accept_language: clip(lang, 100),
    accept_encoding: clip(h('accept-encoding'), 100),
    sec_fetch_mode: clip(secMode, 40),
    sec_fetch_site: clip(h('sec-fetch-site'), 40),
    sec_fetch_dest: clip(h('sec-fetch-dest'), 40),

    // The read, stated once here rather than re-derived by every reader of the log.
    looks: browserish ? 'browser' : 'client',

    // Groups return visits by client shape. Not an identity.
    fp: await shape([ua, h('accept-language') ?? '', h('accept-encoding') ?? '', h('accept') ?? ''].join('|')),

    ...extra,
  };
}

/**
 * Record one request. Never throws and never blocks the response on failure —
 * a room that 500s because its logger hiccuped would be worse than no logger.
 */
export async function trace(req, extra = {}) {
  try {
    const ev = await buildEvent(req, extra);
    const day = ev.ts.slice(0, 10);
    await store().setJSON(`event/${day}/${ev.ts}-${crypto.randomUUID().slice(0, 8)}`, ev);
  } catch (e) {
    console.log('[trace] failed', e?.message ?? e);
  }
}

/**
 * Wrap a handler so every request through it is traced, with real status and duration,
 * whatever the handler returns or throws.
 *
 * A handler that knows more than the headers do (which MCP method, which tool, what the client
 * called itself) is handed a `note` object; whatever it puts there lands on the event.
 *
 * @param surface short name for the door: 'meet-api' | 'meet-room' | 'meet-mcp' | ...
 * @param handler (req, context, note) => Response
 */
export function traced(surface, handler) {
  return async (req, context) => {
    const t0 = Date.now();
    const note = {};
    let res, thrown = null;
    try { res = await handler(req, context, note); } catch (e) { thrown = e; }
    const done = trace(req, {
      surface,
      status: thrown ? 500 : res?.status ?? null,
      ms: Date.now() - t0,
      ...(thrown ? { error: clip(thrown?.message ?? String(thrown), 200) } : {}),
      ...note,
    });
    // Netlify kills the sandbox once the response is returned; without waitUntil the write can be cut off.
    if (context?.waitUntil) context.waitUntil(done); else await done;
    if (thrown) throw thrown;
    return res;
  };
}
