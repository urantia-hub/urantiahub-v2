import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import type { Deps } from "@/account/handlers";
import { readSession } from "@/account/handlers";
import { refreshMail } from "./refresh-mail";

// A test of the refresh email, before it goes to the readers. It goes only to the signed-in reader's
// own address, and only if that address is approved. The approved address is here as a hash, so the
// address itself is not in this public repo. The request must come from the address bar or from this
// site, so no other site can start a send. This route goes when the email is sent.
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
  const from = request.headers.get("sec-fetch-site");
  if (from !== "none" && from !== "same-origin") return say(403, "Open this address from the address bar.");
  const session = await readSession(request, deps);
  if (!session) return say(401, "Sign in to UrantiaHub first, then open this address again.");
  const to = (session.user.email ?? "").trim().toLowerCase();
  if (!TESTERS.has(createHash("sha256").update(to).digest("hex"))) return say(404, "This account is not approved for the test.");
  const sent = await send({ to, ...refreshMail(deps.origin) });
  return sent ? say(200, "The test email is on its way.") : say(502, "The email did not send. The mail service did not take it.");
}
