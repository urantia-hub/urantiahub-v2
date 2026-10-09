import type { NextRequest } from "next/server";
import { readProgress } from "@/account/data";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";

// Which papers the reader read.
export const GET = (request: NextRequest) => handleReader(request, deps, (token) => readProgress(gateway, token));
