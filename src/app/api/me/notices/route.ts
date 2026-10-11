import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";
import { changeNotices, readNotices } from "@/account/notices";

// The reader's notices: which ones go by email, the hour, the time zone, and the devices.
export const GET = (request: NextRequest) => handleReader(request, deps, (token) => readNotices(gateway, token));

export async function PUT(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => changeNotices(gateway, token, value));
}
