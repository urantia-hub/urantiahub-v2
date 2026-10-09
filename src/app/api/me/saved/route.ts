import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";
import { type AllSaved, type PaperSaved, readAllSaved, readSavedForPaper } from "@/account/saved-data";

// What the reader saved: in one paper with `?paper=`, or all of it for the Saved page.
export function GET(request: NextRequest) {
  const paper = request.nextUrl.searchParams.get("paper");
  return handleReader<AllSaved | PaperSaved>(request, deps, (token) => (paper === null ? readAllSaved(gateway, token) : readSavedForPaper(gateway, token, paper)));
}
