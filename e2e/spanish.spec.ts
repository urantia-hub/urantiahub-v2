import { expect, test } from "@playwright/test";

const ES_PAPER_1 = "/es/documentos/documento-1-el-padre-universal";

test("a Spanish paper renders in Spanish, with no voice", async ({ page }) => {
  await page.goto(ES_PAPER_1);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1, name: "El Padre Universal" })).toBeVisible();
  await expect(page.getByText("Parte I · Documento 1")).toBeVisible();
  await expect(page.locator('[id="1:0.1"]')).toContainText("EL Padre Universal es el Dios de toda la creación");
  await expect(page.locator("button.round")).toHaveCount(0);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    "href",
    "http://localhost:3100/papers/paper-1-the-universal-father",
  );
  await expect(page.getByRole("link", { name: "Saltar al texto" })).toBeAttached();
});

test("the English paper names its Spanish twin", async ({ page }) => {
  await page.goto("/papers/paper-1-the-universal-father");
  await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute(
    "href",
    "http://localhost:3100/es/documentos/documento-1-el-padre-universal",
  );
});

test("a Spanish address with an old title goes to the canonical one", async ({ request }) => {
  const response = await request.get("/es/documentos/documento-1-otro-titulo", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe(ES_PAPER_1);
});

test("the pager and the navigator speak Spanish", async ({ page }) => {
  await page.goto(ES_PAPER_1);
  await expect(page.locator(".pager")).toContainText("Siguiente");
  await page.locator(".pager").getByRole("link", { name: /Siguiente/ }).click();
  await expect(page).toHaveURL("/es/documentos/documento-2-la-naturaleza-de-dios");
  await page.getByRole("button", { name: /Abrir el navegador/ }).click();
  await expect(page.getByRole("dialog", { name: "Navegador" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Introducción" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Todos los documentos/ })).toBeVisible();
});

test("the Spanish contents page lists the papers", async ({ page }) => {
  await page.goto("/es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("link", { name: "1. El Padre Universal" })).toHaveAttribute("href", ES_PAPER_1);
});
