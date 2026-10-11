import { createHmac, timingSafeEqual } from "node:crypto";

// The proof in the link "Turn this email off". It names one reader and one notice, and only this
// server can make it. It has no end date: a link in an old email must still work.
const KINDS = ["daily", "reminder", "releases"] as const;
export type OffKind = (typeof KINDS)[number];

const sign = (secret: string, body: string) => createHmac("sha256", secret).update(`notice-off:${body}`).digest("base64url");

export function offToken(secret: string, userId: string, kind: OffKind): string {
  const body = Buffer.from(`${userId}:${kind}`).toString("base64url");
  return `${body}.${sign(secret, body)}`;
}

export function readOffToken(secret: string, token: unknown): { userId: string; kind: OffKind } | null {
  if (!secret || typeof token !== "string" || token.length > 300) return null;
  const [body, mac, more] = token.split(".");
  if (!body || !mac || more !== undefined) return null;
  const expected = Buffer.from(sign(secret, body));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const [userId, kind] = Buffer.from(body, "base64url").toString().split(":");
  const known = KINDS.find((k) => k === kind);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId ?? "") && known ? { userId, kind: known } : null;
}
