import type { NextRequest } from "next/server";
import { savePlace } from "@/account/data";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";

// Keeps the reader's place in the account.
export async function PUT(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => savePlace(gateway, token, value));
}
