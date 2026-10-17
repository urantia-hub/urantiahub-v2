import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";
import { earnTool } from "@/account/streak-data";

// The first use of a tool of the Hub, for its mark.
export async function POST(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => earnTool(gateway, token, value));
}
