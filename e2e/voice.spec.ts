import { expect, test, type Page } from "@playwright/test";
import { para, round, stubAudio, tap } from "./audio";

// Paper 2 has a time map in its fixture: the voice plays one file for the whole paper.
const PAPER_2 = "/papers/paper-2-the-nature-of-god";
// The bar of the paragraph that sounds now. Each paragraph of the fixture lasts 1.6 seconds.
const bar = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector(".para[data-voice]");
    const before = el && getComputedStyle(el, "::before");
    return before && before.content !== "none" ? { width: before.width, left: before.left } : null;
  });

test("the voice plays one file from the title, and the text shows where it is", async ({ page }, testInfo) => {
  const audio = await stubAudio(page);
  await page.goto(PAPER_2);
  await round(page).click();
  await expect(page.locator("#paper-top")).toHaveAttribute("data-voice", "");
  await expect(page.locator("html")).toHaveAttribute("data-fade", "");
  await expect(para(page, "2:0.1")).toHaveCSS("opacity", "0.34");

  await expect(para(page, "2:0.1")).toHaveAttribute("data-voice", "", { timeout: 8000 });
  await expect(para(page, "2:0.1")).toHaveCSS("opacity", "1");
  await expect(para(page, "2:0.2")).toHaveCSS("opacity", "0.34");
  await expect(page.locator("#paper-top")).toHaveCSS("opacity", "0.34");
  // The bar is 3 px: at the edge of the text on a phone, between the number and the text on a wide screen.
  await expect.poll(() => bar(page)).toEqual({ width: "3px", left: testInfo.project.name === "phone" ? "-13px" : "-9.5px" });
  // The player names the paragraph in grey: green means progress only.
  const muted = await page.evaluate(() => {
    const probe = document.body.appendChild(document.createElement("span"));
    probe.style.color = "var(--muted)";
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(page.getByTestId("voice-ref")).toHaveCSS("color", muted);

  await page.getByRole("button", { name: "Next paragraph" }).click();
  await expect(page.getByTestId("voice-ref")).toHaveText(/^2:0\.[2-4]$/);
  // One file, and no file of a paragraph.
  expect([...new Set(audio.requested.map((url) => new URL(url).pathname))]).toEqual(["/audio/eng/papers/2.mp3"]);
});

test("Listen at the end of a paper starts the next paper at its title", async ({ page }) => {
  await stubAudio(page);
  // Each place in the file that the page asks for. The title is at 0, and 2:0.1 at 2.
  await page.addInitScript(() => {
    const seeks: number[] = ((window as unknown as { seeks: number[] }).seeks = []);
    const own = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime")!;
    Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
      get() {
        return own.get!.call(this);
      },
      set(value: number) {
        seeks.push(value);
        own.set!.call(this, value);
      },
    });
  });
  await page.goto("/papers/paper-1-the-universal-father");
  await page.locator(".up-next").getByRole("link", { name: "Listen" }).click();
  await expect(page).toHaveURL(`${PAPER_2}#paper-top`, { timeout: 10_000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as { seeks: number[] }).seeks[0])).toBe(0);
  await expect(para(page, "2:0.1")).toHaveAttribute("data-voice", "", { timeout: 8000 });
});

test("the sentence that sounds is at full ink, and the rest of its paragraph is softer", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_2);
  await round(page).click();
  await expect(para(page, "2:0.1")).toHaveAttribute("data-voice", "", { timeout: 8000 });
  await expect(page.locator("html")).toHaveAttribute("data-soft", "");
  const marked = await page.evaluate(() => {
    const highlight = (CSS as unknown as { highlights: Map<string, Set<Range>> }).highlights.get("voice-now");
    return highlight ? [...highlight][0].toString() : null;
  });
  expect(marked).toBeTruthy();
  expect(await para(page, "2:0.1").locator(".text").textContent()).toContain(marked);
});

test("a marked paragraph holds the page, and the rest returns to full strength", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_2);
  await round(page).click();
  await expect(para(page, "2:0.1")).toHaveAttribute("data-voice", "", { timeout: 8000 });
  await tap(page, "2:0.3");
  await expect(page.locator("html")).not.toHaveAttribute("data-fade");
  await expect(para(page, "2:1.1")).toHaveCSS("opacity", "1");
});

test("a pause keeps the bar, and the place stays for a later visit", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_2);
  await round(page).click();
  await expect(para(page, "2:0.1")).toHaveAttribute("data-voice", "", { timeout: 8000 });
  await round(page).click();
  const held = page.locator("[data-held]");
  await expect(held).toHaveCount(1);
  const ref = await held.getAttribute("id");
  await expect(page.locator("html")).not.toHaveAttribute("data-follow");

  await page.reload();
  await expect(page.getByRole("button", { name: `Continue listening at ${ref}` })).toBeVisible();
});
