import { expect, test, type Page } from "@playwright/test";

const open = async (page: Page, address: string) => {
  await page.goto(address);
  await expect(page.locator(".search-bar[data-ready]")).toBeVisible();
};

test("a Spanish search shows Spanish matches with marks, and the meaning search below", async ({ page }) => {
  await open(page, "/es/buscar?q=ajustador%20del%20pensamiento");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  const matches = page.getByRole("region", { name: "Coincidencias" });
  // The fixture server counts the 50 rows that it holds.
  await expect(matches.getByRole("heading", { name: /Coincidencias/ })).toContainText("50");
  await expect(matches.locator(".result").first()).toContainText("0:5.9");
  await expect(matches.locator(".result").first()).toContainText("Prólogo");
  await expect(matches.locator(".result mark").first()).toBeVisible();
  await expect(matches.locator(".result-text").first()).toHaveAttribute("href", "/es/documentos/prologo#0:5.9");
  await expect(page.getByRole("region", { name: "Relacionados" }).locator(".result").first()).toContainText("110:4.2");
  await expect(matches.getByRole("link", { name: "Las 50 coincidencias" })).toHaveAttribute("href", "/es/buscar?q=ajustador%20del%20pensamiento&all=exact");
  await expect(page.getByRole("link", { name: "Ver todos los documentos" })).toHaveAttribute("href", "/es");
});

test("a reference goes to the Spanish paper, from the box and from the address", async ({ page }) => {
  await open(page, "/es/buscar");
  await page.getByRole("searchbox", { name: "Buscar en los Documentos" }).fill("1:0.1");
  await expect(page.getByRole("link", { name: /Ir a 1:0\.1/ })).toHaveAttribute("href", "/es/documentos/documento-1-el-padre-universal#1:0.1");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/es\/documentos\/documento-1-el-padre-universal#1:0\.1$/);

  const res = await page.request.get("/es/buscar?q=99%3A1.1", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toMatch(/\/es\/documentos\/documento-99-[a-z0-9-]+#99:1\.1$/);
});

test("the empty screen offers the Spanish starter questions, and a press searches in Spanish", async ({ page }) => {
  await open(page, "/es/buscar");
  const starters = page.getByRole("region", { name: "Pregunta con tus palabras" });
  await expect(starters.locator(".search-row:visible")).toHaveCount(5);
  await expect(starters.locator(".search-row").first()).toHaveAttribute("href", /^\/es\/buscar\?q=%C2%BF/);
});

// robots.txt lists /es/buscar on an indexable site (src/seo/files.test.ts). A test run is never indexable.
test("the Spanish search page stays out of search engines", async ({ page }) => {
  await page.goto("/es/buscar");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("the header of a Spanish paper searches in Spanish", async ({ page }) => {
  await page.goto("/es/documentos/documento-1-el-padre-universal");
  await expect(page.locator(".site-header a.search-link")).toHaveAttribute("href", "/es/buscar");
});
