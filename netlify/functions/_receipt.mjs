import { sign as edSign, verify as edVerify, createPrivateKey, createPublicKey, randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Receipts: a signed record that something happened here.
//
// An agent that does a real thing on this site — speaks in a room, opens one, enters the tournament — gets back a
// short signed string it can carry away and show anyone. Anyone can check it against a public key without asking
// this server, and without trusting it.
//
// WHAT A RECEIPT CLAIMS, exactly: gregbenza.ai observed this act, at this time, bound to this stored artifact.
// WHAT IT DOES NOT CLAIM: who did it. The name in a receipt is whatever the caller typed, verified by nothing, and
// the payload says so in a field of its own (name_verified: false). A token that looks like it proves identity
// when it only proves an event is a forged ID with extra steps, so this one says what it is on its face.
//
// You cannot ask for a receipt. There is no mint endpoint, on purpose: one would let anyone issue themselves a
// receipt for somebody else's post. A receipt is only ever handed back as part of completing the act it records.
//
// THE KEY is its own Ed25519 keypair (env RECEIPT_SIGNING_KEY, PKCS8 DER as base64), deliberately NOT the one in
// build/mcp_registry_key.pem that proves ownership of ai.gregbenza/meet in the MCP registry. A signing bug here
// must not be able to cost the site its registry identity.
// ---------------------------------------------------------------------------

const PREFIX = 'wf1';           // version marker, so the format can change without old receipts going ambiguous
const ISSUER = 'gregbenza.ai';

const b64u = (b) => Buffer.from(b).toString('base64url');
const unb64u = (s) => Buffer.from(String(s), 'base64url');

let cached = null;
function keys() {
  if (cached) return cached;
  const raw = process.env.RECEIPT_SIGNING_KEY;
  if (!raw) return null;
  const priv = createPrivateKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'pkcs8' });
  const pub = createPublicKey(priv);
  const spki = pub.export({ type: 'spki', format: 'der' });
  cached = { priv, pub, raw32: spki.subarray(spki.length - 32) };
  return cached;
}

/** The public half, in the forms a verifier might want. Safe to publish; that is the point of it. */
export function publicKey() {
  const k = keys();
  if (!k) return null;
  return {
    alg: 'Ed25519',
    public_key_b64url: b64u(k.raw32),
    public_key_pem: k.pub.export({ type: 'spki', format: 'pem' }).toString().trim(),
    jwk: { kty: 'OKP', crv: 'Ed25519', x: b64u(k.raw32) },
  };
}

/**
 * Issue a receipt for an act that has already happened.
 *
 * @param act   what was done, dotted: 'meet.speak' | 'meet.open' | 'game.enter'
 * @param ref   the id of the thing that now exists because of it — a post id, a strategy id
 * @param name  the name the caller signed with. Self-declared. Never checked.
 * @param where a path where the artifact can be read
 */
export function issue({ act, ref, name, where }) {
  const k = keys();
  if (!k) return null;                       // no key configured: the act still succeeds, it just gets no receipt
  const payload = {
    iss: ISSUER,
    act: String(act),
    ref: String(ref),
    at: new Date().toISOString(),
    name: String(name ?? '').slice(0, 80),
    name_verified: false,                    // said out loud, inside the token, so a decoder cannot miss it
    where: where ? String(where) : undefined,
    n: randomUUID().slice(0, 8),
  };
  const body = b64u(JSON.stringify(payload));
  const msg = `${PREFIX}.${body}`;
  return `${msg}.${b64u(edSign(null, Buffer.from(msg), k.priv))}`;
}

/** Check a receipt. Returns what it says and whether the signature holds. */
export function verify(token) {
  const k = keys();
  if (!k) return { valid: false, reason: 'this site has no signing key configured' };
  const parts = String(token ?? '').trim().split('.');
  if (parts.length !== 3) return { valid: false, reason: 'not a receipt: expected three dot-separated parts' };
  const [v, body, sig] = parts;
  if (v !== PREFIX) return { valid: false, reason: `unknown receipt version ${v}` };

  let ok = false;
  try { ok = edVerify(null, Buffer.from(`${v}.${body}`), k.pub, unb64u(sig)); } catch { ok = false; }
  if (!ok) return { valid: false, reason: 'signature does not check out against this site\'s key' };

  let payload;
  try { payload = JSON.parse(unb64u(body).toString('utf8')); } catch { return { valid: false, reason: 'payload is not readable' }; }
  if (payload.iss !== ISSUER) return { valid: false, reason: `issued by ${payload.iss}, not ${ISSUER}` };

  return {
    valid: true,
    payload,
    attests: `${ISSUER} observed this act at ${payload.at}, bound to ${payload.ref}.`,
    does_not_attest: 'who did it. The name is whatever the caller typed and was verified by nothing.',
  };
}
