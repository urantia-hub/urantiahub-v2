import { expect, test, type BrowserContext } from "@playwright/test";

// The first page of a visit opens in the language that the reader chose last (Kelson, 2026-10-24).
const choose = (context: BrowserContext, lang: "en" | "es") =>
  context.addInitScript((value) => {
    if (!sessionStorage.getItem("hub:visit") && !localStorage.getItem("hub:lang")) localStorage.setItem("hub:lang", value);
  }, lang);

test("the first page of a visit opens in Spanish, and a later English page stays English", async ({ page, context }) => {
  await choose(context, "es");
  await page.goto("/papers");
  await expect(page).toHaveURL("/es/documentos");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.goto("/about");
  await expect(page).toHaveURL("/about");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("a page with no Spanish twin stays, also after a reload", async ({ page, context }) => {
  await choose(context, "es");
  await page.goto("/texts");
  await expect(page).toHaveURL("/texts");
  await page.reload();
  await expect(page).toHaveURL("/texts");
});

test("English is remembered too: the Spanish home opens in English", async ({ page, context }) => {
  await choose(context, "en");
  await page.goto("/es");
  await expect(page).toHaveURL("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

// Kelson, 2026-10-24: "english -> spanish -> english". The last choice wins in the next visit.
test("English, then Spanish, then English: the next visit opens in English", async ({ page, context }) => {
  await page.goto("/papers");
  await page.getByRole("button", { name: "Language: English" }).click();
  await page.getByRole("dialog", { name: "Language" }).getByRole("radio", { name: /^Español/ }).click();
  await expect(page).toHaveURL("/es/documentos");
  await page.getByRole("button", { name: "Idioma: español" }).click();
  await page.getByRole("dialog", { name: "Idioma" }).getByRole("radio", { name: /^English/ }).click();
  await expect(page).toHaveURL("/papers");

  const next = await context.newPage();
  await next.goto("/papers");
  await expect(next).toHaveURL("/papers");
  await expect(next.locator("html")).toHaveAttribute("lang", "en");
});
