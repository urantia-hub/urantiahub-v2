import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { refreshMail } from "./refresh-mail";

// The one send of the refresh email to the readers of the Hub before this one. The addresses are not
// in this public repo: the caller brings them, with a pass. This file holds only the digest of the
// pass and one digest of the whole list, so the route can send to that exact list and to no other.
// This route goes when the email is sent.
const KEYS = {
  pass: "730b42daf4c18fe2e5765168559d534d114f92eb50a9a8b853e97da3e786a07c",
  list: "238cfa8ca9ac6126277c3a778e4852f567be99363502630f13461668340dc0cc",
};
const FROM = "UrantiaHub <notifications@mail.urantiahub.com>";
const REPLY_TO = "hi@urantiahub.com";

// One request to the mail service. `quota` is what its answer says about the limits of the plan.
export type MailCall = (method: "GET" | "POST", path: string, body?: unknown) => Promise<{ status: number; quota: Record<string, string> }>;

export const callResend: MailCall = async (method, path, body) => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: 0, quota: {} };
  try {
    const response = await fetch(`https://api.resend.com${path}`, {
      method,
      // The same key for a second try sends nothing twice.
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json", ...(method === "POST" ? { "idempotency-key": "refresh-2026-10" } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    const quota: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      if (/quota|ratelimit/.test(name)) quota[name] = value;
    });
    return { status: response.status, quota };
  } catch {
    return { status: 0, quota: {} };
  }
};

const digest = (value: string) => createHash("sha256").update(value).digest();
const same = (value: string, hex: string) => timingSafeEqual(digest(value), Buffer.from(hex, "hex"));

export async function handleRefreshSend(request: Request, origin: string, call: MailCall, keys = KEYS): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { pass?: unknown; to?: unknown; check?: unknown } | null;
  if (typeof body?.pass !== "string" || !same(body.pass, keys.pass)) return new Response(null, { status: 404 });
  const say = (status: number, sent: number, answer: { status: number; quota: Record<string, string> }) =>
    Response.json({ sent, ...answer }, { status, headers: { "cache-control": "no-store" } });
  if (body.check === true) return say(200, 0, await call("GET", "/domains"));
  const to = Array.isArray(body.to) && body.to.every((one) => typeof one === "string") ? [...new Set(body.to.map((one: string) => one.trim().toLowerCase()))].sort() : [];
  if (!same(to.join("\n"), keys.list)) return Response.json({ sent: 0, why: "not the approved list" }, { status: 409 });
  const mail = refreshMail(origin);
  const answer = await call("POST", "/emails/batch", to.map((one) => ({ from: FROM, to: [one], reply_to: REPLY_TO, ...mail })));
  const ok = answer.status >= 200 && answer.status < 300;
  if (!ok) console.error(`refresh send: the mail service answered ${answer.status}`);
  return say(ok ? 200 : 502, ok ? to.length : 0, answer);
}
