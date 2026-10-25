import { expect, test } from "@playwright/test";

const ORIGIN = "http://localhost:3100";

for (const [en, es, heading] of [
  ["/texts", "/es/textos", "Textos del mundo"],
  ["/texts/how-it-works", "/es/textos/como-funciona", "Cómo funcionan los textos del mundo"],
  ["/texts/dhammapada", "/es/textos/dhammapada", "El Dhammapada"],
  ["/texts/dhammapada/2", "/es/textos/dhammapada/2", "Sobre la diligencia"],
] as const) {
  test(`${es} is the Spanish twin of ${en}`, async ({ page }) => {
    const response = await page.goto(es);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", `${ORIGIN}${en}`);
    await page.goto(en);
    await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute("href", `${ORIGIN}${es}`);
  });
}

test("a Spanish chapter says that its text is English, and each passage is marked English", async ({ page }) => {
  await page.goto("/es/textos/dhammapada/2");
  await expect(page.getByText("El texto de esta obra está en inglés.")).toBeVisible();
  await expect(page.locator(".para").first()).toHaveAttribute("lang", "en");
  // The line is a note of the page in the face of the meta line, not a line of the text.
  const [line, meta] = await Promise.all([".work-lang", ".paper.work > .work-meta"].map((s) => page.locator(s).evaluate((e) => getComputedStyle(e).font)));
  expect(line).toBe(meta);
});

test("a Spanish Bible chapter keeps its English key and names the book in Spanish", async ({ page }) => {
  const response = await page.goto("/es/textos/bible/john-3");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Juan 3" })).toBeVisible();
});

test("a Spanish passage address lands on its Spanish page", async ({ page }) => {
  await page.goto("/es/textos/bible/at/John%203:16");
  await page.waitForURL("/es/textos/bible/john-3#John_3%3A16");
});

test("the language control of a chapter keeps the sentences and the passage", async ({ page }) => {
  await page.goto("/es/textos/dhammapada/2?s=1#Dhp_21");
  await page.getByRole("button", { name: "Idioma: español" }).click();
  await page.getByRole("dialog", { name: "Idioma" }).getByRole("radio", { name: /^English/ }).click();
  await expect(page).toHaveURL(/\/texts\/dhammapada\/2\?s=1#Dhp_21$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Language: English" }).click();
  await page.getByRole("dialog", { name: "Language" }).getByRole("radio", { name: /^Español/ }).click();
  await expect(page).toHaveURL(/\/es\/textos\/dhammapada\/2\?s=1#Dhp_21$/);
});

test("the Spanish contents page links to the Spanish World texts", async ({ page }) => {
  await page.goto("/es/documentos");
  await expect(page.getByRole("navigation", { name: "Partes" }).getByRole("link", { name: "Textos del mundo" })).toHaveAttribute("href", "/es/textos");
});

test("the dock and the chapters sheet speak Spanish", async ({ page }) => {
  await page.goto("/es/textos/dhammapada/2");
  await expect(page.getByRole("link", { name: "Anterior: Los versos gemelos" })).toHaveAttribute("href", "/es/textos/dhammapada/1");
  await page.getByRole("button", { name: /Abrir los capítulos/ }).click();
  const chapters = page.getByRole("dialog", { name: "Capítulos" });
  await expect(chapters.getByRole("link", { name: /Sobre la diligencia/ })).toHaveAttribute("aria-current", "page");
  await chapters.getByRole("link", { name: /El pensamiento/ }).click();
  await page.waitForURL("/es/textos/dhammapada/3");
});

test("the header goes up one step in Spanish", async ({ page }) => {
  await page.goto("/es/textos/dhammapada/2");
  await page.locator("header").getByRole("link", { name: "Dhammapada" }).click();
  await page.waitForURL("/es/textos/dhammapada");
  await page.locator("header").getByRole("link", { name: "Textos del mundo" }).click();
  await page.waitForURL("/es/textos");
});

test("the Spanish Bible opens a chapter from its books sheet at the English address", async ({ page }) => {
  await page.goto("/es/textos/bible/john-3");
  await page.getByRole("button", { name: /Abrir los libros/ }).click();
  const books = page.getByRole("dialog", { name: "Los libros de la Biblia" });
  await books.getByRole("button", { name: "Juan 21 capítulos" }).click();
  await books.getByRole("link", { name: "4", exact: true }).click();
  await page.waitForURL("/es/textos/bible/john-4");
  await expect(page.getByRole("heading", { level: 1, name: "Juan 4" })).toBeVisible();
});
