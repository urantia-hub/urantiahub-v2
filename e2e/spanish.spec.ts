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

// Review Focus 1: a "* * *" has no Spanish row, so the page shows it as the API gives it.
test("a separator with no Spanish row shows as it does in English", async ({ page }) => {
  await page.goto("/es/documentos/documento-134-los-anos-de-transicion#134:6.14");
  await expect(page.locator('[id="134:6.14"] .text')).toHaveText("* * *");
  await expect(page.locator('[id="134:6.14"]')).toHaveAttribute("data-picked", "");
});

test("the language sheet opens the same paragraph in English, with no sheet open, and the theme and text size hold", async ({ page }) => {
  await page.goto(`${ES_PAPER_1}#1:0.1`);
  await page.getByRole("button", { name: "Account and settings" }).click();
  await page.getByRole("button", { name: "Dark" }).click();
  await page.getByRole("button", { name: "Larger text" }).click();
  await page.keyboard.press("Escape");
  await page.locator('[id="1:0.1"] .text').click({ position: { x: 40, y: 12 } });
  await page.getByRole("button", { name: "Más" }).click();
  await expect(page.locator(".panel")).toBeVisible();
  // A press outside a sheet closes it first, so the reader closes "Más" and then opens the pill.
  await page.keyboard.press("Escape");
  await expect(page.locator(".panel")).toHaveCount(0);

  await page.getByRole("button", { name: "Idioma: español" }).click();
  const sheet = page.getByRole("dialog", { name: "Idioma" });
  await expect(sheet.getByRole("radio", { name: /^Español/ })).toHaveAttribute("aria-checked", "true");
  await sheet.getByRole("radio", { name: /^English/ }).click();

  await expect(page).toHaveURL(/\/papers\/paper-1-the-universal-father#1:0\.1$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".panel, .lang-sheet")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "3");
  expect(await page.evaluate(() => localStorage.getItem("hub:lang"))).toBe("en");

  // And back.
  await page.getByRole("button", { name: "Language: English" }).click();
  await page.getByRole("dialog", { name: "Language" }).getByRole("radio", { name: /^Español/ }).click();
  await expect(page).toHaveURL(/\/es\/documentos\/documento-1-el-padre-universal#1:0\.1$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "3");
});

test("the pill shows on a paper and the contents, and not on other pages", async ({ page }) => {
  for (const path of [ES_PAPER_1, "/es", "/papers"]) {
    await page.goto(path);
    await expect(page.locator(".lang-pill")).toBeVisible();
  }
  await page.goto("/about");
  await expect(page.locator(".lang-pill")).toBeHidden();
  // A move by a link to a page with no pill: the paper that Next.js keeps hidden does not count.
  await page.goto(ES_PAPER_1);
  await page.goto("/papers");
  await page.getByRole("link", { name: "About" }).first().click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator(".lang-pill")).toBeHidden();
});

test.describe("a browser in Spanish", () => {
  test.use({ locale: "es-MX" });

  test("gets the offer under the English title until it chooses a language", async ({ page }) => {
    await page.goto("/papers/paper-1-the-universal-father");
    const offer = page.getByRole("link", { name: /Leer en español/ });
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("El Padre Universal");
    await offer.click();
    await expect(page).toHaveURL(/\/es\/documentos\/documento-1-el-padre-universal$/);
    await page.goto("/papers/paper-1-the-universal-father");
    await expect(page.getByRole("link", { name: /Leer en español/ })).toBeHidden();
  });
});

test("a browser in English gets no offer", async ({ page }) => {
  await page.goto("/papers/paper-1-the-universal-father");
  await expect(page.getByRole("link", { name: /Leer en español/ })).toBeHidden();
});
