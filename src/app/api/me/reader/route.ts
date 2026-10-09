import type { NextRequest } from "next/server";
import { readReader } from "@/account/data";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";

// The place and the settings that the reader has in the account.
export const GET = (request: NextRequest) => handleReader(request, deps, (token) => readReader(gateway, token));
