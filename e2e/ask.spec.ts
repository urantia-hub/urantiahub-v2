import { expect, test, type Page } from "@playwright/test";
import { para, stubAudio, tap } from "./audio";

const PAPER_1 = "/papers/paper-1-the-universal-father";
const sheet = (page: Page) => page.getByRole("dialog", { name: "Ask an assistant" });

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("More offers Ask an assistant, and the question holds the section, the paragraphs before, and the paragraph", async ({ page }) => {
  await page.goto(PAPER_1);
  await tap(page, "1:1.3");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Ask an assistant", exact: true }).click();
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page)).toContainText("About paragraph 1:1.3.");
  await sheet(page).getByRole("button", { name: "See what the assistant gets" }).click();
  const sent = (await page.getByTestId("ask-sent").textContent()) ?? "";
  expect(sent).toContain('Paper 1, "The Universal Father"');
  expect(sent).toContain('Section 1, "The Father’s Name"');
  expect(sent).toMatch(/1:1\.1 Of all the names[\s\S]*1:1\.2 The Universal Father never imposes[\s\S]*The paragraph that I ask about:\n1:1\.3 When you have once become truly God-conscious/);
  expect(sent).toContain("http://localhost:3100/s/1.1.3");
  expect(sent).toContain("https://api.urantia.dev/paragraphs/1:1.3?include=entities,urantiaParallels,bibleParallels,scriptureParallels");
  // The link of the button is the same text, in the address of the assistant.
  const href = (await sheet(page).getByRole("link", { name: "Open in Claude" }).getAttribute("href")) ?? "";
  expect(decodeURIComponent(href.replace("https://claude.ai/new?q=", ""))).toBe(sent);
  // Escape closes the sheet, and the paragraph keeps its mark.
  await page.keyboard.press("Escape");
  await expect(sheet(page)).toHaveCount(0);
  await expect(para(page, "1:1.3")).toHaveAttribute("data-picked", "");
});

test("the button below the title asks about the whole paper, with no marked paragraph", async ({ page }) => {
  await page.goto(PAPER_1);
  await page.getByRole("button", { name: "Ask an assistant about this paper" }).click();
  await expect(sheet(page)).toContainText("About Paper 1, The Universal Father.");
  await sheet(page).getByRole("button", { name: "ChatGPT" }).click();
  const href = (await sheet(page).getByRole("link", { name: "Open in ChatGPT" }).getAttribute("href")) ?? "";
  const sent = decodeURIComponent(href.replace("https://chatgpt.com/?q=", ""));
  expect(sent.startsWith("Give me the short version of this paper.")).toBe(true);
  expect(sent).toContain("http://localhost:3100/papers/paper-1-the-universal-father");
  expect(sent).toContain("https://api.urantia.dev/papers/1");
  // The choice stays for the next page.
  await page.reload();
  await page.getByRole("button", { name: "Ask an assistant about this paper" }).click();
  await expect(sheet(page).getByRole("link", { name: "Open in ChatGPT" })).toBeVisible();
});

test("the button of the paper keeps its room before the controls start, so the text does not move", async ({ page, browser }) => {
  await page.goto(PAPER_1);
  const withScript = await page.locator(".paper p.para").first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const plain = await browser.newContext({ javaScriptEnabled: false });
  const still = await plain.newPage();
  await still.setViewportSize(page.viewportSize()!);
  await still.goto(PAPER_1);
  await expect(still.getByText("Ask an assistant about this paper")).toBeHidden();
  const withNone = await still.locator(".paper p.para").first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  expect(withNone).toBe(withScript);
  await plain.close();
});
