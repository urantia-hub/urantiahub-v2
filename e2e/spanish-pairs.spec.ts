import { expect, type Page, test } from "@playwright/test";
import { stubAudio } from "./audio";

const ORIGIN = "http://localhost:3100";
const ES_PAPER_1 = "/es/documentos/documento-1-el-padre-universal";
const PAIR = "/s/1.0.3/dhammapada/21";

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

const openSheet = async (page: Page) => {
  // With no hash: a hash marks the paragraph already, and a tap would take the mark off.
  await page.goto(ES_PAPER_1);
  await page.locator('[id="1:0.3"] .text').click({ position: { x: 40, y: 12 } });
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("button", { name: "Paralelos" }).click();
  return page.getByRole("dialog", { name: "Paralelos de 1:0.3" });
};

test("a near row of the Spanish sheet opens the Spanish pair, and its back link returns to the Spanish paragraph", async ({ page }) => {
  const sheet = await openSheet(page);
  // The first row is in English and says so.
  await expect(sheet.locator(".parallel-list li").first().locator(".parallel-lang")).toHaveText("en inglés");
  await sheet.getByRole("button", { name: /^Mostrar \d+ más$/ }).click();
  await sheet.locator("li.parallel-paired").filter({ hasText: "Tobit 13:4" }).click();
  await page.waitForURL("/es/s/1.0.3/bible/tobit.13.4?from=paper");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  const sides = page.locator(".pair-side");
  await expect(sides.nth(0).locator(".eyebrow")).toHaveText("Los Documentos de Urantia");
  await expect(sides.nth(0)).toContainText("1:0.3 · El Padre Universal");
  await expect(sides.nth(0).locator("blockquote")).not.toHaveAttribute("lang");
  await expect(sides.nth(1).locator("blockquote")).toHaveAttribute("lang", "en");
  await expect(page.locator(".pair-and")).toHaveText("y");
  await expect(page.getByText("El texto de esta obra está en inglés.")).toBeVisible();
  await page.locator(".hdr-back").click();
  await page.waitForURL(`${ES_PAPER_1}#1:0.3`);
  await expect(page.locator('[id="1:0.3"]')).toHaveAttribute("data-picked", "");
});

test("the Spanish sheet links its study page", async ({ page }) => {
  const sheet = await openSheet(page);
  await expect(sheet.getByRole("link", { name: "Estudiar estos paralelos" })).toHaveAttribute("href", "/es/paralelos?ref=1%3A0.3");
});

test("the Spanish pair and the English pair name each other", async ({ page }) => {
  const response = await page.goto(`/es${PAIR}`);
  expect(response?.status()).toBe(200);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", `${ORIGIN}${PAIR}`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto(PAIR);
  await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute("href", `${ORIGIN}/es${PAIR}`);
});

test("the language control of a pair keeps its parts and codes", async ({ page }) => {
  await page.goto(`/es${PAIR}/2`);
  await page.getByRole("button", { name: "Idioma: español" }).click();
  await page.getByRole("dialog", { name: "Idioma" }).getByRole("radio", { name: /^English/ }).click();
  await expect(page).toHaveURL(new RegExp(`${PAIR}/2$`));
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".pair-and")).toHaveText("and");
});

test("the Spanish study page speaks Spanish and keeps the other works English", async ({ page }) => {
  await page.goto("/es/paralelos?ref=1:0.3");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paralelos de 1:0.3");
  await expect(page.locator(".study-quote")).not.toBeEmpty();
  await expect(page.locator(".study-works summary")).toHaveText("Todas las obras");
  await expect(page.locator(".study-strength")).toContainText("% y más");
  await expect(page.locator(".study-back a")).toHaveAttribute("href", `${ES_PAPER_1}#1:0.3`);
  const english = page.locator(".study-page .parallel-list li").filter({ has: page.locator(".parallel-lang") }).first();
  await expect(english.locator(".parallel-lang")).toHaveText("en inglés");
  await expect(english.locator("p").first()).toHaveAttribute("lang", "en");
  await expect(page.locator(".study-page .parallel-list a[href^='/es/documentos/']").first()).toBeVisible();
  await expect(page.locator(".study-page")).not.toContainText("Strength");
});

// The Hub words of the English pages that must not be on their Spanish twins. The text of a work is English and
// marked so, so it is out of the check.
const ENGLISH = ["The Urantia Papers", "Share", "Show all", "Read in the paper", "Read in World texts", "Whole passage", "Parallels", "All works", "Works", "Strength", "and more", "Read more", "Show less", "Open", "Paper", "Passages", "beside this passage", "in English", "opens in a new tab", "Loading", "Try again"];
for (const path of [`/es${PAIR}`, "/es/paralelos?ref=1:0.3"]) {
  test(`${path} has no English words of the Hub`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator(".pair-side, .study-page .parallel-list li").first()).toBeVisible();
    const text = await page.evaluate(() => {
      // Each text node apart, so the words of two elements never run together.
      const out = (e: Element | null) => !e || e.closest('body [lang="en"], script, style') !== null;
      const words: string[] = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walk.nextNode(); node; node = walk.nextNode()) if (!out(node.parentElement)) words.push(node.textContent ?? "");
      for (const e of document.body.querySelectorAll("[aria-label], [title], [alt]")) if (!out(e)) words.push(...["aria-label", "title", "alt"].map((name) => e.getAttribute(name) ?? ""));
      return words.join(" ");
    });
    for (const words of ENGLISH) expect(text, words).not.toMatch(new RegExp(`\\b${words}\\b`));
  });
}
