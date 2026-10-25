import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const STANDIN = "http://localhost:4010";
const ORIGIN = "http://localhost:3100";
const day = (offset: number) => new Date(Date.now() - 4 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);

test.use({ timezoneId: "UTC" });

// The words of the English pages that must not be on their Spanish twins.
const ENGLISH = ["Your page", "Progress", "Saved", "Marks", "Streak", "day streak", "Notifications", "A passage each day", "Sign in", "Sign out", "Account", "By part", "paragraphs", "Email", "Push", "When", "Turn all off", "Turn this email off", "Each email"];
async function noEnglish(page: Page) {
  const text = await page.locator("main").innerText();
  for (const words of ENGLISH) expect(text, words).not.toMatch(new RegExp(`\\b${words}\\b`));
}

async function signedIn(page: Page) {
  const id = randomUUID();
  await page.context().addCookies([{ name: "e2e_reader", value: id, url: STANDIN }]);
  await page.context().request.post(`${STANDIN}/__reader/${id}`, {
    data: {
      streak: { on: true, asked: true, goal: 1, goals: [{ from: day(-30), goal: 1 }], hour: 21, zone: "UTC", since: day(-30), longest: 4, marks: { search: "2026-10-16T10:00:00.000Z" }, at: 1 },
      sectionDays: [1, 2, 3].map((n) => ({ day: day(-n), paperId: "2", sectionId: String(n), how: "read" })),
    },
  });
  await page.goto("/papers/paper-1-the-universal-father");
  await page.getByRole("button", { name: "Account and settings" }).click();
  await page.getByRole("dialog", { name: "Account and settings" }).getByRole("link", { name: /^Sign in/ }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/papers"));
}

for (const [en, es, heading] of [
  ["/you", "/es/tu", "Tu página"],
  ["/notifications", "/es/avisos", "Avisos"],
  ["/emails", "/es/correos", "Correos"],
] as const) {
  test(`${es} is the Spanish twin of ${en}`, async ({ page }) => {
    const response = await page.goto(es);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", `${ORIGIN}${en}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await noEnglish(page);
    await page.goto(en);
    await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute("href", `${ORIGIN}${es}`);
  });
}

test("the language control of /you goes to /es/tu and back", async ({ page }) => {
  await page.goto("/you");
  await page.getByRole("button", { name: "Language: English" }).click();
  await page.getByRole("dialog", { name: "Language" }).getByRole("radio", { name: /^Español/ }).click();
  await page.waitForURL(`${ORIGIN}/es/tu`);
  await page.getByRole("button", { name: "Idioma: español" }).click();
  await page.getByRole("dialog", { name: "Idioma" }).getByRole("radio", { name: /^English/ }).click();
  await page.waitForURL(`${ORIGIN}/you`);
});

test("a signed-in reader sees the reader's page in Spanish", async ({ page }) => {
  await signedIn(page);
  await page.goto("/es/tu");
  await expect(page.getByRole("heading", { name: "Ana Reader" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Progreso" })).toBeVisible();
  await expect(page.locator(".streak-big")).toContainText("días de racha");
  await expect(page.locator(".progress-total")).toContainText("párrafos");
  await expect(page.locator(".marks-card").first()).toContainText("Búsqueda");
  await expect(page.locator(".streak-next a").first()).toHaveAttribute("href", /^\/es\/documentos\//);
  await expect(page.getByRole("link", { name: /Un pasaje cada día/ })).toHaveAttribute("href", "/es/avisos");
  await noEnglish(page);
});

test("a signed-in reader sets the notices in Spanish", async ({ page }) => {
  await signedIn(page);
  await page.goto("/es/avisos");
  await expect(page.getByRole("group", { name: "Un pasaje cada día" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Desactivar todo" })).toBeVisible();
  await noEnglish(page);
});
