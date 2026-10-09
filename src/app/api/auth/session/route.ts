import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { handleSession } from "@/account/handlers";

// Who is signed in.
export const GET = (request: NextRequest) => handleSession(request, deps);
