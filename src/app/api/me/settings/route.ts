import type { NextRequest } from "next/server";
import { saveSettings } from "@/account/data";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";

// Keeps the reader's settings in the account.
export async function PUT(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => saveSettings(gateway, token, value));
}
