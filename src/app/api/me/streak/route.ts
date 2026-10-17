import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";
import { changeStreak, readStreak } from "@/account/streak-data";

// The reader's streak: the card, and the settings (on, goal, hour, zone).
export const GET = (request: NextRequest) => handleReader(request, deps, (token) => readStreak(gateway, token));

export async function PUT(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => changeStreak(gateway, token, value));
}
