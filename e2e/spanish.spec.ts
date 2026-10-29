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

test("the Spanish paper has no English words of the Hub", async ({ page }) => {
  await page.goto(`${ES_PAPER_1}#1:99.1`);
  await expect(page.getByRole("status").filter({ hasText: "1:99.1" })).toHaveText("La referencia 1:99.1 no está en este documento.");
  await expect(page.getByRole("navigation", { name: "Sitio" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Site" })).toHaveCount(0);
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

test("the end card and the navigator speak Spanish", async ({ page }) => {
  await page.goto(ES_PAPER_1);
  await expect(page.locator(".paper-end-label")).toHaveText("Fin del Documento 1");
  await expect(page.locator(".up-next")).toContainText("A continuación");
  // No voice in Spanish, so no Escuchar.
  await expect(page.locator(".up-next").getByRole("link")).toHaveCount(1);
  await page.locator(".up-next").getByRole("link", { name: "Leer" }).click();
  await expect(page).toHaveURL("/es/documentos/documento-2-la-naturaleza-de-dios");
  await page.getByRole("button", { name: /Abrir el navegador/ }).click();
  await expect(page.getByRole("dialog", { name: "Navegador" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Introducción" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Todos los documentos/ })).toBeVisible();
});

test("the Spanish contents page lists the papers", async ({ page }) => {
  await page.goto("/es/documentos");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1, name: "Documentos" })).toBeVisible();
  await expect(page.getByText("Un prólogo y 196 documentos, en cuatro partes.")).toBeVisible();
  await expect(page.getByRole("link", { name: "1 El Padre Universal" })).toHaveAttribute("href", ES_PAPER_1);
  await expect(page.getByText("Parte I · Documentos 1–31")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("UrantiaHub es un lugar para leer y estudiar los Documentos de Urantia.");
});

// The place keeps the English title. A Spanish page names the section in Spanish, from its number.
test("Continuar names the place in Spanish and opens the Spanish paper", async ({ page }) => {
  await page.goto("/es/documentos");
  await page.evaluate(() =>
    window.localStorage.setItem("hub:last-read", JSON.stringify({ paperId: "1", sectionId: "1", label: "1. The Father’s Name", at: Date.now() })),
  );
  await page.reload();
  const card = page.getByRole("link", { name: /Continuar/ });
  await expect(card).toContainText("Documento 1 · 1. El nombre del Padre");
  await card.click();
  await expect(page).toHaveURL(`${ES_PAPER_1}#1:1`);
});

test("the settings speak Spanish on a Spanish page", async ({ page }) => {
  await page.goto("/es/documentos");
  await page.getByRole("button", { name: "Cuenta y ajustes" }).click();
  const panel = page.getByRole("dialog", { name: "Cuenta y ajustes" });
  await expect(panel.getByRole("heading", { name: "Este dispositivo" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Oscuro" })).toBeVisible();
});

test("the Spanish saved page asks a reader with no account to sign in, in Spanish", async ({ page }) => {
  await page.goto("/es/guardados");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1, name: "Guardados" })).toBeVisible();
  await expect(page.getByText("Tus párrafos guardados y tus notas")).toBeVisible();
});

test("a Spanish address with no page answers 404 in Spanish", async ({ page }) => {
  for (const path of ["/es/nada", "/es/documentos/documento-197-nada"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Todos los documentos" })).toHaveAttribute("href", "/es/documentos");
  }
});

// Review Focus 1: a "* * *" has no Spanish row, so the page shows it as the API gives it.
test("a separator with no Spanish row shows as it does in English", async ({ page }) => {
  await page.goto("/es/documentos/documento-134-los-anos-de-transicion#134:6.14");
  await expect(page.locator('[id="134:6.14"] .text')).toHaveText("* * *");
  await expect(page.locator('[id="134:6.14"]')).toHaveAttribute("data-picked", "");
});

test("the language sheet opens the same paragraph in English, with no sheet open, and the theme and text size hold", async ({ page }) => {
  await page.goto(`${ES_PAPER_1}#1:0.1`);
  await page.getByRole("button", { name: "Cuenta y ajustes" }).click();
  await page.getByRole("button", { name: "Oscuro" }).click();
  await page.getByRole("button", { name: "Texto más grande" }).click();
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

// Kelson, 2026-10-24: the pill is on every page.
test("the pill shows on every page", async ({ page }) => {
  for (const path of [ES_PAPER_1, "/es/documentos", "/papers", "/", "/about", "/texts", "/you", "/saved"]) {
    await page.goto(path);
    await expect(page.locator(".lang-pill"), path).toBeVisible();
  }
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

test.describe("the tools of a Spanish paragraph", () => {
  const pick = async (page: import("@playwright/test").Page, ref: string) => {
    // With no hash: a hash marks the paragraph already, and a tap would take the mark off.
    await page.goto(ES_PAPER_1);
    await page.locator(`[id="${ref}"] .text`).click({ position: { x: 40, y: 12 } });
  };

  test("Más lists the six tools of the mock, with Ver en inglés last", async ({ page }) => {
    await pick(page, "1:0.1");
    await page.getByRole("button", { name: "Más" }).click();
    await expect(page.locator(".panel .panel-line")).toHaveText(["Crear una imagen", "Términos de este párrafo", "Paralelos", "Preguntar a un asistente", "Copiar el texto", "Ver en inglés"]);
  });

  test("Ver en inglés shows the original inside the paragraph, and Ocultar takes it away", async ({ page }) => {
    await pick(page, "1:0.1");
    await page.getByRole("button", { name: "Más" }).click();
    await page.getByRole("button", { name: "Ver en inglés" }).click();
    const original = page.locator('[id="1:0.1"] .orig');
    await expect(original).toContainText("Original en inglés");
    await expect(original).toContainText("THE Universal Father is the God of all creation");
    await expect(original).toHaveAttribute("lang", "en");
    await expect(page.locator('[id="1:0.1"] .text')).not.toContainText("THE Universal Father");
    // A press on the English text does not take the mark off the paragraph.
    await original.locator(".orig-text").click();
    await expect(page.locator('[id="1:0.1"]')).toHaveAttribute("data-picked", "");
    await original.getByRole("button", { name: "Ocultar" }).click();
    await expect(page.locator(".orig")).toHaveCount(0);
  });

  test("Paralelos marks the other works as English and opens the Spanish papers", async ({ page }) => {
    await pick(page, "1:0.3");
    await page.getByRole("button", { name: "Más" }).click();
    await page.getByRole("button", { name: "Paralelos" }).click();
    const sheet = page.getByRole("dialog", { name: "Paralelos de 1:0.3" });
    await expect(sheet.getByText("Pasajes cercanos en sentido. El más cercano va primero.")).toBeVisible();
    await expect(sheet.locator(".parallel-list li").first().locator(".parallel-lang")).toHaveText("en inglés");
    await sheet.getByRole("button", { name: "En los Documentos" }).click();
    await expect(sheet.locator(".parallel-lang")).toHaveCount(0);
    await expect(sheet.locator(".parallel-list").first()).toContainText("Y Dios el Padre es la fuente personal");
    await expect(sheet.getByRole("link", { name: /^Abrir 56:9\.10/ })).toHaveAttribute("href", /^\/es\/documentos\/documento-56-[a-z0-9-]+#56:9\.10$/);
  });

  test("Preguntar a un asistente asks in Spanish, with the Spanish paragraph and link", async ({ page }) => {
    await pick(page, "1:0.1");
    await page.getByRole("button", { name: "Más" }).click();
    await page.getByRole("button", { name: "Preguntar a un asistente" }).click();
    const sheet = page.getByRole("dialog", { name: "Preguntar a un asistente" });
    await expect(sheet.getByRole("button", { name: "Explica este párrafo con palabras sencillas." })).toHaveAttribute("aria-pressed", "true");
    await sheet.getByRole("button", { name: "Ver lo que recibe el asistente" }).click();
    const sent = sheet.getByTestId("ask-sent");
    await expect(sent).toContainText("Pregunto por este párrafo:\n1:0.1 EL Padre Universal es el Dios de toda la creación");
    await expect(sent).toContainText("/es/s/1.0.1");
    await expect(sent).toContainText("&lang=es");
  });

  test("a share link made on a Spanish page is a Spanish link, whatever the browser keeps", async ({ page }) => {
    // A later page of the visit: the first page of a visit would move to the English twin.
    await page.addInitScript(() => {
      localStorage.setItem("hub:lang", "en");
      sessionStorage.setItem("hub:visit", "1");
    });
    await pick(page, "1:0.1");
    await page.getByRole("button", { name: "Compartir" }).click();
    await expect(page.getByTestId("share-url")).toHaveText(/\/es\/s\/1\.0\.1$/);
    await expect(page.getByRole("dialog", { name: "Compartir 1:0.1" }).getByText("Los Documentos de Urantia")).toBeVisible();
  });

  test("the page of a Spanish link has a Spanish card and opens the Spanish paragraph", async ({ page, request }) => {
    const html = await (await request.get("/es/s/1.0.1")).text();
    expect(html).toContain('<html lang="es"');
    expect(html).toMatch(/<meta property="og:url" content="http:\/\/localhost:3100\/es\/s\/1\.0\.1"/);
    expect(html).toContain("EL Padre Universal es el Dios de toda la creación");
    const image = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    expect(image).toBeTruthy();
    expect((await request.get(new URL(image as string).pathname)).status()).toBe(200);
    await page.goto("/es/s/1.0.1");
    await expect(page).toHaveURL(/\/es\/documentos\/documento-1-el-padre-universal#1:0\.1$/);
  });
});

// The Spanish home page, with the Spanish passages (Kelson, 2026-10-24).
test("the Spanish home page is at /es, and the two home pages name each other", async ({ page }) => {
  const res = await page.goto("/es");
  expect(res?.status()).toBe(200);
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1, name: "Los Documentos de Urantia" })).toBeVisible();
  expect((await page.locator(".site-header .brand-name").boundingBox())!.width).toBeGreaterThan(20);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /^http:\/\/localhost:3100\/?$/);
  await expect(page.locator(".home").getByRole("link", { name: "Leer los Documentos" })).toHaveAttribute("href", "/es/documentos");
  const about = page.locator(".home").getByRole("link", { name: "¿Qué son los Documentos de Urantia?" });
  await expect(about).toHaveAttribute("href", "/es/acerca-de");
  await expect(about).not.toHaveAttribute("hreflang");
  // With no place, the page shows "Leer los Documentos" and hides "Todos los documentos", as in English.
  await expect(page.locator(".home a.all-papers")).toHaveAttribute("href", "/es/documentos");
  await page.locator(".home").getByRole("link", { name: "Leer los Documentos" }).click();
  await expect(page).toHaveURL(/\/es\/documentos$/);

  await page.goto("/");
  await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute("href", "http://localhost:3100/es");
});

test("the language sheet on the Spanish home page goes to the English home page", async ({ page }) => {
  await page.goto("/es");
  await page.getByRole("button", { name: "Idioma: español" }).click();
  await page.getByRole("dialog", { name: "Idioma" }).getByRole("radio", { name: /^English/ }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
  await expect(page.getByRole("heading", { level: 1, name: "The Urantia Papers" })).toBeVisible();
});

test("a bad escape in a Spanish paper address answers the Spanish 404", async ({ page, request }) => {
  const es = await request.get("/es/documentos/%E0%A4%A");
  expect(es.status()).toBe(404);
  expect(await es.text()).toContain("Página no encontrada");
  await page.goto("/es/documentos/%E0%A4%A");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();

  const en = await request.get("/papers/%E0%A4%A");
  expect(en.status()).toBe(404);
  const enBody = await en.text();
  expect(enBody).toContain('<html lang="en"');
  expect(enBody).toContain("Page not found");
});
