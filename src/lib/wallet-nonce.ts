import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 5 * 60 * 1000;

function secret() {
  const s = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("JWT_SECRET or NEXTAUTH_SECRET must be set");
  return s;
}

function sign(walletAddress: string, ts: string) {
  return createHmac("sha256", secret()).update(`${walletAddress}|${ts}`).digest("hex");
}

/** Stateless nonce: timestamp plus an HMAC bound to the wallet. */
export function createNonce(walletAddress: string) {
  const ts = Date.now().toString();
  return `${ts}.${sign(walletAddress, ts)}`;
}

export function checkNonce(walletAddress: string, nonce: string) {
  const [ts, mac] = String(nonce).split(".");
  if (!ts || !mac) return false;
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > TTL_MS) return false;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(walletAddress, ts));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signInMessage(walletAddress: string, nonce: string) {
  return `Sign in to KŌKA\nWallet: ${walletAddress}\nNonce: ${nonce}`;
}
