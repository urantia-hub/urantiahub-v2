import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";
import { saveSections } from "@/account/streak-data";
import { langParam } from "@/i18n/lang";

// The sections that the reader finished today, for the streak.
export async function POST(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => saveSections(gateway, token, value, new Date(), langParam(request.nextUrl.searchParams.get("lang"))));
}
