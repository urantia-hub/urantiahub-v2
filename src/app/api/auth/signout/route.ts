import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { handleSignOut } from "@/account/handlers";

// Ends the sign-in. The reader stays on the page.
export const POST = (request: NextRequest) => handleSignOut(request, deps);
