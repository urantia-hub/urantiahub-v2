import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";
import { saveSections } from "@/account/streak-data";

// The sections that the reader finished today, for the streak.
export async function POST(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => saveSections(gateway, token, value));
}
