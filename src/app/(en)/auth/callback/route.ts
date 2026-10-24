import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { handleCallback } from "@/account/handlers";

// The accounts site returns the reader here after a sign-in.
export const GET = (request: NextRequest) => handleCallback(request, deps);
