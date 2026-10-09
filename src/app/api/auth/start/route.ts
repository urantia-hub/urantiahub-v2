import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { handleStart } from "@/account/handlers";

// Starts a sign-in with a UrantiaHub account.
export const GET = (request: NextRequest) => handleStart(request, deps);
