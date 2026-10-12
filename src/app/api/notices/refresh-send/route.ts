import { callResend, handleRefreshSend } from "@/notices/refresh-send";
import { site } from "@/site";

// The one send of the refresh email. It needs the pass and the exact list.
export const maxDuration = 60;
export const POST = (request: Request) => handleRefreshSend(request, site.origin, callResend);
