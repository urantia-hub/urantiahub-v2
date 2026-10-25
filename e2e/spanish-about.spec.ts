import { expect, type Page, test } from "@playwright/test";

const ORIGIN = "http://localhost:3100";
const TWINS = [
  ["/about", "/es/acerca-de", "Acerca de"],
  ["/resources", "/es/recursos", "Recursos"],
  ["/releases", "/es/novedades", "Novedades"],
] as const;
// The Hub words of the English pages that must not be on their Spanish twins. The names of places stay as they are.
const ENGLISH = ["About", "The Urantia Papers", "See all papers", "listen on Spotify", "independent project", "The text", "public domain", "Resources", "Places to study", "By the maker of UrantiaHub", "Organizations", "Communities", "Listen and watch", "opens in a new tab", "Releases", "What changed", "A streak, an assistant", "The new UrantiaHub", "Launch", "October", "January"];

async function hubWords(page: Page) {
  return page.evaluate(() => {
    // Each text node apart, so the words of two elements never run together. The footer and the header are checked elsewhere.
    const words: string[] = [];
    const main = document.querySelector("main") ?? document.body;
    const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let node = walk.nextNode(); node; node = walk.nextNode()) words.push(node.textContent ?? "");
    return words.join(" ");
  });
}

for (const [en, es, heading] of TWINS) {
  test(`${es} is the Spanish twin of ${en}, with no English words of the Hub`, async ({ page }) => {
    const response = await page.goto(es);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", `${ORIGIN}${en}`);
    const text = await hubWords(page);
    for (const words of ENGLISH) expect(text, words).not.toMatch(new RegExp(`\\b${words}\\b`));
    await page.goto(en);
    await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute("href", `${ORIGIN}${es}`);
  });

  test(`the language control moves ${es} to ${en}`, async ({ page }) => {
    await page.goto(es);
    await page.getByRole("button", { name: "Idioma: español" }).click();
    await page.getByRole("dialog", { name: "Idioma" }).getByRole("radio", { name: /^English/ }).click();
    await expect(page).toHaveURL(new RegExp(`${en}$`));
  });
}

test("the footer of a Spanish page links the Spanish twins, and Privacy and Terms in English", async ({ page }) => {
  await page.goto("/es");
  const footer = page.getByRole("contentinfo");
  for (const [, es, name] of TWINS) await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", es);
  await expect(footer.getByRole("link", { name: "Privacidad" })).toHaveAttribute("hreflang", "en");
});

test("the sitemap lists the three Spanish twins", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const [, es] of TWINS) expect(xml).toContain(`${es}<`);
});
