import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";
import { changeDevice, removeDevice } from "@/account/notices";

// One device of the reader, for the notices that go to a device.
export async function PUT(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => changeDevice(gateway, token, value));
}

export async function DELETE(request: NextRequest) {
  const value: unknown = await request.json().catch(() => null);
  return handleReader(request, deps, (token) => removeDevice(gateway, token, value));
}
