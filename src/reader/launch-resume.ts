import { referenceHref } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { LAST_READ_KEY, readLastRead } from "./last-read";

// When the Hub opens from the home screen, it goes to the section that the reader left. Only the place
// in this browser counts. With no place, the home page stays. Named on the Privacy page.
export const LAUNCH_KEY = "hub:launched";

// Most time that the still mark covers the page. After it the home page shows (Kelson, 2026-10-29).
export const LAUNCH_MAX_MS = 4000;
const LEAVE_MS = 200;

// Runs before the first paint, after the language move. Only a document load runs it, so a tap on Home
// in the app never does. At the first page of a session of the app, on the home page, with a place:
// `data-launch` on <html>, and CSS covers the page with the still mark. A page that moves to its twin
// (hidden by the move script) waits for the twin.
export const LAUNCH_SCRIPT = `(function(){try{var d=document.documentElement;if(!(matchMedia("(display-mode: standalone)").matches||navigator.standalone===true))return;if(location.pathname!=="/"&&location.pathname!=="/es")return;if(d.style.visibility==="hidden")return;if(sessionStorage.getItem(${JSON.stringify(LAUNCH_KEY)}))return;sessionStorage.setItem(${JSON.stringify(LAUNCH_KEY)},"1");if(localStorage.getItem(${JSON.stringify(LAST_READ_KEY)}))d.setAttribute("data-launch","")}catch(e){}})();`;

// The still mark fades, then goes.
export function endLaunch(): void {
  const root = document.documentElement;
  if (!root.hasAttribute("data-launch")) return;
  root.setAttribute("data-launch", "leaving");
  window.setTimeout(() => root.removeAttribute("data-launch"), LEAVE_MS);
}

// The address to open at the launch, or null to keep the home page.
export function launchResumeHref(lang: Lang): string | null {
  if (document.documentElement.getAttribute("data-launch") !== "") return null;
  const last = readLastRead();
  if (!last) {
    // The stored place was not a place that the Hub can open.
    endLaunch();
    return null;
  }
  return referenceHref({ paperId: last.paperId, sectionId: last.sectionId }, lang);
}

// The mark goes when the address is no longer the home page (the paper is there), or after the most time.
export function watchLaunchEnd(home: string): void {
  const started = Date.now();
  const timer = window.setInterval(() => {
    if (window.location.pathname !== home || Date.now() - started >= LAUNCH_MAX_MS) {
      window.clearInterval(timer);
      endLaunch();
    }
  }, 50);
}
