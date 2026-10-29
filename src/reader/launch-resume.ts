import { referenceHref } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { readLastRead } from "./last-read";

// When the Hub opens from the home screen, it goes to the section that the reader left. Only the place
// in this browser counts. With no place, the home page stays. Named on the Privacy page.
export const LAUNCH_KEY = "hub:launched";

type Launch = { standalone: boolean; moving: boolean; loadedPath: string | null; path: string; launched: boolean };

// True only for the first page of an app launch: the document loaded at this page, it does not move to
// its twin, and the tab did not open a page before. A tap on Home in the app, or a reload, keeps it.
export function isAppLaunch({ standalone, moving, loadedPath, path, launched }: Launch): boolean {
  return standalone && !moving && !launched && loadedPath === path;
}

function isStandalone(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function loadedPath(): string | null {
  const entry = performance.getEntriesByType?.("navigation")[0];
  try {
    return entry ? new URL(entry.name).pathname : null;
  } catch {
    return null;
  }
}

// Reads the mark of this tab and sets it. Storage that is blocked counts as a tab that opened a page.
function launchedBefore(): boolean {
  try {
    const before = window.sessionStorage.getItem(LAUNCH_KEY) !== null;
    window.sessionStorage.setItem(LAUNCH_KEY, "1");
    return before;
  } catch {
    return true;
  }
}

// The address to open at the launch, or null to keep the home page.
export function launchResumeHref(lang: Lang): string | null {
  if (!isStandalone()) return null;
  // The language move script hides the page that it replaces with its twin.
  const moving = document.documentElement.style.visibility === "hidden";
  const launch = { standalone: true, moving, loadedPath: loadedPath(), path: window.location.pathname, launched: moving || launchedBefore() };
  if (!isAppLaunch(launch)) return null;
  const last = readLastRead();
  return last ? referenceHref({ paperId: last.paperId, sectionId: last.sectionId }, lang) : null;
}
