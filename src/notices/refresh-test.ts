import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import type { Deps } from "@/account/handlers";
import { readSession } from "@/account/handlers";
import { refreshMail } from "./refresh-mail";

// A test of the refresh email, before it goes to the readers: one address, given by its hash, so the
// address itself is not in this public repo. The caller must be signed in. This route goes when the
// email is sent.
const TESTERS = new Set(["65ac1d6af71098e013aeea2194dcc5507428e46f41c5120582b423221a30496d"]);
const FROM = "UrantiaHub <notifications@mail.urantiahub.com>";
const REPLY_TO = "hi@urantiahub.com";

export type SendOne = (mail: { to: string; subject: string; html: string; text: string }) => Promise<boolean>;

export const sendWithResend: SendOne = async (mail) => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [mail.to], reply_to: REPLY_TO, subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error(`refresh test: the mail service answered ${response.status}`);
    return response.ok;
  } catch {
    console.error("refresh test: the mail service did not answer");
    return false;
  }
};

export async function handleRefreshTest(request: NextRequest, deps: Deps, send: SendOne): Promise<Response> {
  const say = (status: number, words: string) => new Response(words, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  if (!(await readSession(request, deps))) return say(401, "Sign in to UrantiaHub first, then open this address again.");
  const to = (request.nextUrl.searchParams.get("to") ?? "").trim().toLowerCase();
  if (!TESTERS.has(createHash("sha256").update(to).digest("hex"))) return say(404, "Not found.");
  const sent = await send({ to, ...refreshMail(deps.origin) });
  return sent ? say(200, "The test email is on its way.") : say(502, "The email did not send. The mail service did not take it.");
}
