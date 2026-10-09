import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";
import { removeBookmark, saveBookmark } from "@/account/saved-data";

// Saves a paragraph in the reader's account.
export async function POST(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => saveBookmark(gateway, token, value));
}

// Removes a saved paragraph.
export const DELETE = (request: NextRequest) => handleReader(request, deps, (token) => removeBookmark(gateway, token, request.nextUrl.searchParams.get("ref")));
