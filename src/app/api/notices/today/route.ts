import type { NextRequest } from "next/server";
import { getPassage } from "@/content";
import { passageFor } from "@/notices/due";

// The passage of one date, for the question that offers the daily passage. The text is public.
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return Response.json({ detail: "Give a date." }, { status: 400 });
  try {
    const { ref, text } = await getPassage(passageFor(date));
    return Response.json({ ref, text }, { headers: { "cache-control": "public, max-age=3600" } });
  } catch {
    return Response.json({ detail: "Try again later." }, { status: 503 });
  }
}
