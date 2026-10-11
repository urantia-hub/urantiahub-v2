import "server-only";
import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { readerKey } from "@/account/handlers";
import { getPassage } from "@/content";
import { releaseToNotify } from "@/content/releases";
import type { Device, Reader } from "@/notices/due";
import { site } from "@/site";
import type { Claim, JobDeps, OutMail, Push } from "./job";
import { offToken } from "./token";

// The real dependencies of the job: the API for the readers and the claims, Resend for the emails,
// and the push services of the browsers. Each setting is read at the call, never at the import.

const APP_ID = "urantiahub-app";
const API = () => process.env.URANTIA_API_BASE_URL || "https://api.urantia.dev";
const FROM = "UrantiaHub <notifications@mail.urantiahub.com>";
const REPLY_TO = "hi@urantiahub.com";
const MAIL_BATCH = 100;
const CALL_MS = 10_000;
// A notice of this morning has no use tomorrow.
const PUSH_TTL_SECONDS = 12 * 60 * 60;

// The push services of the browsers. The API stores only an address of one of these hosts, and this
// server checks again before it calls one.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^([a-z0-9-]+\.)*push\.apple\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^([a-z0-9-]+\.)*notify\.windows\.com$/];
export function isPushAddress(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.port === "" && !url.username && !url.password && url.href === value && PUSH_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

async function api(method: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${API()}/apps/${APP_ID}/notices${path}`, {
    method,
    headers: { "x-app-secret": process.env.HUB_APP_SECRET ?? "", accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(CALL_MS),
  });
  if (!response.ok) throw new Error(`${response.status} from ${method} notices${path}`);
  return response.status === 204 ? null : ((await response.json()) as { data?: unknown }).data;
}

// Turns one email off for one reader. The caller checked the proof of the link.
export const turnOff = (userId: string, kind: string): Promise<unknown> => api("POST", "/off", { userId, kind });

// The list in the header of a mail program, and the link in the email.
export const offLinks = (secret: string, userId: string, kind: Claim["kind"]) => {
  const token = offToken(secret, userId, kind);
  return { page: `${site.origin}/emails?off=${token}`, post: `${site.origin}/api/notices/off?token=${token}` };
};

async function sendMails(mails: OutMail[]): Promise<boolean[]> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return mails.map(() => false);
  const sent: boolean[] = [];
  for (let i = 0; i < mails.length; i += MAIL_BATCH) {
    const batch = mails.slice(i, i + MAIL_BATCH);
    let ok = false;
    try {
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify(
          batch.map((mail) => ({
            from: FROM,
            to: [mail.to],
            reply_to: REPLY_TO,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
            // One press in the mail program turns the email off, with no page.
            headers: { "List-Unsubscribe": `<${mail.offPost}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          })),
        ),
        signal: AbortSignal.timeout(CALL_MS),
      });
      ok = response.ok;
      // The status only. The answer of the service can hold an address.
      if (!ok) console.error(`notices: the mail service answered ${response.status}`);
    } catch {
      console.error("notices: the mail service did not answer");
    }
    sent.push(...batch.map(() => ok));
  }
  return sent;
}

async function sendPush(device: Device, push: Push): Promise<"ok" | "gone" | "failed"> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  const privateJwk = process.env.VAPID_PRIVATE_JWK;
  if (!publicKey || !privateJwk || !isPushAddress(device.endpoint)) return "failed";
  try {
    const privateKey = (JSON.parse(privateJwk) as { d?: string }).d ?? "";
    const request = webpush.generateRequestDetails({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(push), {
      vapidDetails: { subject: `mailto:${REPLY_TO}`, publicKey, privateKey },
      TTL: PUSH_TTL_SECONDS,
    });
    // Our own request, so the address is the one that was checked, with a time limit and no redirect.
    const response = await fetch(device.endpoint, { method: request.method, headers: request.headers as Record<string, string>, body: request.body as BodyInit, redirect: "error", signal: AbortSignal.timeout(CALL_MS) });
    if (response.status === 404 || response.status === 410) return "gone";
    return response.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

export function liveDeps(now: Date = new Date()): JobDeps {
  const secret = process.env.HUB_APP_SECRET ?? "";
  const list = (process.env.NOTICES_ONLY ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  return {
    now,
    origin: site.origin,
    only: list.length > 0 ? list : null,
    news: releaseToNotify(now),
    readers: async () => (await api("GET", "")) as Reader[],
    claim: async (claims) => ((await api("POST", "/claim", { claims })) as { claimed: Claim[] }).claimed,
    release: async (claims) => void (await api("POST", "/release", { claims })),
    devices: async (report) => void (await api("POST", "/devices", report)),
    passage: (ref) => getPassage(ref),
    sendMails,
    sendPush,
    readerKey: (userId) => readerKey(secret, userId),
    offUrl: (userId, kind) => offLinks(secret, userId, kind).page,
    offPost: (userId, kind) => offLinks(secret, userId, kind).post,
  };
}

// Only Vercel's timer can start the job: it sends this secret.
export function isCron(header: string | null): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16 || !header) return false;
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
