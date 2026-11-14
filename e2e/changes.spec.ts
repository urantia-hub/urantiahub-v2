import { expect, test } from "@playwright/test";
import { para, stubAudio, tap } from "./audio";

const FOREWORD = "/papers/foreword";

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("a changed paragraph shows its changes since 1955: the old words, the words now, the year, and the reason", async ({ page }) => {
  await page.goto(FOREWORD);
  await tap(page, "0:1.24");
  await page.getByRole("button", { name: "More" }).click();
  // The row is first in More, with the number of changes.
  const row = page.getByRole("button", { name: /Changes since 1955/ });
  await expect(page.locator(".panel-line").first()).toContainText("Changes since 1955");
  await expect(row).toContainText("1");
  await row.click();

  const sheet = page.getByRole("dialog", { name: "Changes since 1955" });
  await expect(sheet).toContainText("The first printing of 1955 read differently in one place here.");
  await expect(sheet.locator(".change-year")).toHaveText("Changed in 2009");
  await expect(sheet.locator(".change-line.was del")).toHaveText("other");
  await expect(sheet.locator(".change-line.was span")).toHaveText("…in all other manifestations.");
  await expect(sheet.locator(".change-line:not(.was) span")).toHaveText("…in all manifestations.");
  await expect(sheet.locator(".change-why")).toContainText("The word other removed.");
  await expect(sheet.getByRole("link", { name: "Urantia Foundation's list of corrections" })).toHaveAttribute("href", "https://www.urantia.org/urantia-book/text-standardization#adopted-corrections");
  // The paragraph stays marked while the sheet is open, and Escape closes the sheet.
  await expect(para(page, "0:1.24")).toHaveAttribute("data-picked", "");
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
});

test("a paragraph with no change has no row for the changes", async ({ page }) => {
  await page.goto(FOREWORD);
  await tap(page, "0:1.23");
  await page.getByRole("button", { name: "More" }).click();
  await expect(page.getByRole("button", { name: "Parallels" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Changes since 1955/ })).toHaveCount(0);
});

test("the page shows no mark for a changed paragraph", async ({ page }) => {
  await page.goto(FOREWORD);
  await expect(para(page, "0:1.24").locator(".text")).toHaveText(/in all manifestations\./);
  await expect(page.getByText("Changes since 1955")).toHaveCount(0);
});
