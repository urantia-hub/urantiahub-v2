import { type NextRequest, NextResponse } from "next/server";
import { turnOff } from "@/notices/send/live";
import { readOffToken } from "@/notices/send/token";
import { site } from "@/site";

// "Turn this email off". The proof in the link names one reader and one notice, so no sign-in is
// needed. A mail program calls this with POST for its own "unsubscribe" button.
async function off(token: unknown): Promise<Response> {
  const proof = readOffToken(process.env.HUB_APP_SECRET ?? "", token);
  if (!proof) return Response.json({ off: false }, { status: 400 });
  try {
    await turnOff(proof.userId, proof.kind);
    return Response.json({ off: true, kind: proof.kind });
  } catch {
    return Response.json({ off: false }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const inAddress = request.nextUrl.searchParams.get("token");
  if (inAddress) return off(inAddress);
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  return off(body?.token);
}

// A person who opens the address gets the page with the button. A load of a page turns nothing off:
// a mail scanner opens each link of an email.
export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  return NextResponse.redirect(`${site.origin}/emails?off=${encodeURIComponent(token)}`, 303);
}
