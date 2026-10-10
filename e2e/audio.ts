import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

const LONG = readFileSync("e2e/fixtures/silence-long.mp3");
const SHORT = readFileSync("e2e/fixtures/silence-short.mp3");

// Serves a silent file in place of each audio file, so no test depends on the CDN.
// `short` makes each paragraph end after half a second. `failOn` makes one file fail until the test clears it.
export async function stubAudio(page: Page, options: { short?: boolean; failOn?: string } = {}) {
  const state = { failOn: (options.failOn ?? null) as string | null, requested: [] as string[] };
  await page.route("https://cdn.urantia.dev/**", (route) => {
    state.requested.push(route.request().url());
    if (state.failOn && decodeURIComponent(route.request().url()).includes(state.failOn)) return route.abort();
    return route.fulfill({ body: options.short ? SHORT : LONG, contentType: "audio/mpeg" });
  });
  return state;
}

export const round = (page: Page) => page.getByTestId("round-button");
export const para = (page: Page, ref: string) => page.locator(`[id="${ref}"]`);
export const openNavigator = (page: Page) => page.getByRole("button", { name: /Open the navigator/ }).click();
// A tap on the words of a paragraph, away from its reference.
export const tap = (page: Page, ref: string) => para(page, ref).locator(".text").click({ position: { x: 40, y: 12 } });
// Each move of the page is at its end. A test that measures a place waits for this first.
export const still = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))).then(() => undefined));
