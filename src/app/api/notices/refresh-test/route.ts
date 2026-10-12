import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { handleRefreshTest, sendWithResend } from "@/notices/refresh-test";

// A test send of the refresh email to one approved address.
export const GET = (request: NextRequest) => handleRefreshTest(request, deps, sendWithResend);
