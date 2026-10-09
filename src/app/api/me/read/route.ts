import type { NextRequest } from "next/server";
import { saveRead } from "@/account/data";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";

// Marks paragraphs as read in the reader's account.
export async function POST(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => saveRead(gateway, token, value));
}
