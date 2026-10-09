import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";
import { addNote } from "@/account/saved-data";

// Adds a note on a paragraph.
export async function POST(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => addNote(gateway, token, value));
}
