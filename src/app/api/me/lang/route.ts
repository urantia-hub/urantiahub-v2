import type { NextRequest } from "next/server";
import { saveLang } from "@/account/data";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";

// Keeps the reader's language in the account.
export async function PUT(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => saveLang(gateway, token, value));
}
