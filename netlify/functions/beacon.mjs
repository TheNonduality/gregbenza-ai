import { createHash, createHmac } from 'node:crypto';
import { traced } from './_trace.mjs';
import { json, cors } from './_identity.mjs';

// ---------------------------------------------------------------------------
// The beacon: a fair coin two strangers can both check.
//
// Two agents who do not trust each other and need a random number have nowhere to get one. Whoever generates it
// can grind it, and neither will accept the other's. This publishes one a minute that nobody can grind, including
// us — which is the only version worth having.
//
// HOW IT CANNOT BE RIGGED. The value for a round is fixed before the round happens, and we prove it by publishing
// its hash in advance:
//
//   seed(n)   = HMAC-SHA256(secret, "round:" + n)      known only to us until the round is over
//   commit(n) = SHA-256(seed(n))                       published NOW, for rounds still in the future
//
// Once commit(n) is out, seed(n) is the only string that hashes to it. We cannot look at what agents did during
// round n and pick a different answer afterwards. When the round has passed, seed(n) is revealed and anyone can
// check SHA-256(seed) against the commit they were given earlier. Take the commit before you need the number;
// that is the whole protocol.
//
// No storage: rounds are a pure function of the clock and the secret, so there is nothing to tamper with and
// nothing to lose. A round is one minute of UTC.
// ---------------------------------------------------------------------------

const PERIOD = 60_000;              // one minute
const AHEAD = 10;                   // how many future commitments to hand out
const round = (t = Date.now()) => Math.floor(t / PERIOD);
const startsAt = (n) => new Date(n * PERIOD).toISOString();

const seedOf = (n) => {
  const secret = process.env.BEACON_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update(`round:${n}`).digest('hex');
};
const commitOf = (n) => { const s = seedOf(n); return s ? createHash('sha256').update(s).digest('hex') : null; };

// Derive as many independent values as a caller wants from one seed, so two agents who agreed on a round can also
// agree on which draw they meant, without needing a second round.
const draw = (seed, label) => createHash('sha256').update(`${seed}:${label}`).digest('hex');
const toFloat = (hex) => parseInt(hex.slice(0, 13), 16) / 2 ** 52;      // 52 bits, exact in a double

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (req.method === 'OPTIONS') return cors();
  if (!process.env.BEACON_SECRET) return json({ error: 'this site has no beacon secret configured' }, 503);

  const now = round();

  // ---- one round
  const m = path.match(/^\/api\/beacon\/(\d+)$/);
  if (m) {
    note.action = 'beacon-round';
    const n = Number(m[1]);
    if (!Number.isSafeInteger(n) || n < 0) return json({ error: 'a round is a whole number' }, 400);
    const past = n < now;
    const label = url.searchParams.get('label') ?? '';
    const body = {
      round: n, starts: startsAt(n), ends: startsAt(n + 1), now_round: now,
      commit: commitOf(n),
      revealed: past,
    };
    if (!past) {
      body.seed = null;
      body.note = 'This round has not finished. Keep the commit; the seed is revealed once the round has passed, and SHA-256 of it will equal the commit above.';
      return json(body);
    }
    body.seed = seedOf(n);
    body.verify = `SHA-256 of seed equals commit. Check it: printf '%s' "<seed>" | sha256sum`;
    const d = draw(body.seed, label);
    body.value = { label, hex: d, float: toFloat(d), coin: parseInt(d.slice(0, 2), 16) % 2 ? 'heads' : 'tails' };
    body.more = 'Add ?label=<anything> for an independent draw from the same round — both sides must use the same label.';
    return json(body);
  }

  // ---- the beacon itself
  if (path === '/api/beacon') {
    note.action = 'beacon';
    const upcoming = [];
    for (let i = 0; i <= AHEAD; i++) upcoming.push({ round: now + i, starts: startsAt(now + i), commit: commitOf(now + i) });
    const last = now - 1;
    return json({
      now: { round: now, starts: startsAt(now), ends: startsAt(now + 1) },
      last_revealed: { round: last, seed: seedOf(last), commit: commitOf(last), value: (() => { const d = draw(seedOf(last), ''); return { hex: d, float: toFloat(d), coin: parseInt(d.slice(0, 2), 16) % 2 ? 'heads' : 'tails' }; })() },
      upcoming_commitments: upcoming,
      how: [
        'Take the commit for a round that has not happened yet. That fixes the answer before anyone can see what it will be used for.',
        'When the round has passed, GET /api/beacon/<round> for the seed.',
        'Check SHA-256(seed) equals the commit you took. If it does, the value was decided before you asked.',
        'Both sides must agree on the round number, and on ?label= if you want more than one draw from it.',
      ],
      round_seconds: PERIOD / 1000,
      one_round: `${url.origin}/api/beacon/<round>`,
      visibility: 'Every round is public, and past rounds stay readable.',
    });
  }

  return json({ error: 'not found' }, 404);
};

export default traced('beacon', handler);

export const config = { path: ['/api/beacon', '/api/beacon/*'] };
