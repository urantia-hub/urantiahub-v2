import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { HOME_PASSAGES } from "../src/content/passages";

const paragraphOf = (ref: string) =>
  JSON.parse(readFileSync(`e2e/fixtures/paragraphs_${ref.replace(":", "_")}.json`, "utf8")).data.text as string;

// What the page must show for each entry: the excerpt, or the whole recorded paragraph.
const expected = HOME_PASSAGES.map(({ ref, text }) => text ?? paragraphOf(ref));

test("each home passage is an exact part of its recorded API paragraph", () => {
  HOME_PASSAGES.forEach(({ ref }, i) => expect(paragraphOf(ref)).toContain(expected[i]));
});

test("the home page shows one passage from the list", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "The Urantia Papers" })).toBeVisible();
  const visible = page.locator(".passage:visible blockquote");
  await expect(visible).toHaveCount(1);
  expect(expected).toContain(await visible.innerText());
});

test("the home page holds every passage, and each one can show", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".passage")).toHaveCount(expected.length);
  for (let i = 0; i < expected.length; i++) {
    await page.evaluate((n) => (document.querySelector<HTMLElement>(".stage")!.dataset.pick = String(n)), i);
    await expect(page.locator(".passage:visible blockquote")).toHaveText(expected[i]);
  }
});

test("no home passage is longer than five lines on a desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the line limit is a desktop rule");
  await page.goto("/");
  const whole = HOME_PASSAGES.map((passage, i) => (passage.text === undefined ? i : -1)).filter((i) => i !== -1);
  for (let i = 0; i < expected.length; i++) {
    if (whole.includes(i)) continue;
    await page.evaluate((n) => (document.querySelector<HTMLElement>(".stage")!.dataset.pick = String(n)), i);
    const lines = await page.locator(".passage:visible blockquote").evaluate((el) => {
      const style = getComputedStyle(el);
      return Math.round(el.getBoundingClientRect().height / parseFloat(style.lineHeight));
    });
    expect(lines, expected[i]).toBeLessThanOrEqual(5);
  }
});

test("the home button goes to the contents, which lists 197 papers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Read the Papers" }).click();
  await expect(page).toHaveURL("/papers");
  await expect(page.locator(".toc .papers a")).toHaveCount(197);
});

test("About and Privacy render", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
});

test("an unknown address answers 404 with a way back", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "All papers" })).toBeVisible();
  expect((await page.goto("/papers/paper-197-nothing"))?.status()).toBe(404);
});

const LIGHT = "rgb(251, 248, 242)";
const DARK = "rgb(23, 21, 15)";

test("a new visitor gets the light theme, even with a dark system setting", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/papers/paper-1-the-universal-father");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
});

test("the theme control changes the theme, and the choice stays after a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#17150f");

  await page.goto("/papers/paper-1-the-universal-father");
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);

  await page.getByRole("contentinfo").getByRole("button", { name: "Light theme" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
  await page.reload();
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
});

test("a reader who chose dark sees no light flash on the next page load", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  // The background at the moment the document is parsed, before the app starts.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { firstBackground: string }).firstBackground = getComputedStyle(document.body).backgroundColor;
    });
  });
  await page.goto("/papers/paper-1-the-universal-father");
  expect(await page.evaluate(() => (window as unknown as { firstBackground: string }).firstBackground)).toBe(DARK);
});

test("the navigator has the theme control too", async ({ page }) => {
  await page.goto("/papers/paper-1-the-universal-father");
  await page.getByTestId("reading-bar").getByRole("button").click();
  await page.getByRole("dialog", { name: "Navigator" }).getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
});

// A class named "contents" collided with a Tailwind utility and removed this column. Layout is tested, not assumed.
for (const [path, selector, maxWidth] of [
  ["/papers", ".toc", 736],
  ["/papers/paper-1-the-universal-father", ".paper", 608],
  ["/about", ".prose", 544],
] as const) {
  test(`the ${selector} column on ${path} is centered and has margins`, async ({ page }) => {
    await page.goto(path);
    const box = (await page.locator(selector).first().boundingBox())!;
    const viewport = page.viewportSize()!.width;
    expect(box.width).toBeLessThanOrEqual(maxWidth + 1);
    expect(Math.abs(box.x - (viewport - box.x - box.width))).toBeLessThanOrEqual(2);
    const text = (await page.locator(`${selector} :is(p, li)`).first().boundingBox())!;
    expect(text.x).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("the text typeface has its optical-size axis, and italic text uses a true italic face", async ({ page }) => {
  await page.goto("/papers/paper-1-the-universal-father");
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(async () => {
    const first = (selector: string) =>
      getComputedStyle(document.querySelector(selector)!).fontFamily.split(",")[0].trim().replace(/["']/g, "");
    const upright = first(".para");
    const width = (opsz: number) => {
      const span = document.createElement("span");
      span.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:400 40px "${upright}";font-variation-settings:"opsz" ${opsz}`;
      span.textContent = "The Universal Father is the God of all creation";
      document.body.appendChild(span);
      const w = span.getBoundingClientRect().width;
      span.remove();
      return w;
    };
    // The section headings are italic, so the page loads the italic face of the same family.
    await document.fonts.load(`italic 20px "${upright}"`);
    const italicFaces = [...document.fonts].filter(
      (face) => face.family.replace(/["']/g, "") === upright && face.style === "italic" && face.status === "loaded",
    );
    return { small: width(7), large: width(72), italicLoaded: italicFaces.length > 0 };
  });
  // With no optical-size axis, both widths are equal.
  expect(Math.abs(result.small - result.large)).toBeGreaterThan(5);
  expect(result.italicLoaded).toBe(true);
});

test("only the upright text face is preloaded", async ({ page }) => {
  await page.goto("/papers/paper-1-the-universal-father");
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(1);
});

test("every route carries the security headers, the root included", async ({ request }) => {
  for (const path of ["/", "/papers", "/papers/paper-1-the-universal-father", "/about"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
  }
});

test("search engines are blocked while the index setting is off", async ({ page, request }) => {
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
  await page.goto("/papers/paper-1-the-universal-father");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:3100/papers/paper-1-the-universal-father",
  );
});

test("the refresh endpoint needs the secret", async ({ request }) => {
  const denied = await request.post("/api/revalidate", { data: { tags: ["paper:1"] } });
  expect(denied.status()).toBe(401);
  const ok = await request.post("/api/revalidate", {
    data: { tags: ["paper:1"] },
    headers: { authorization: "Bearer e2e-secret" },
  });
  expect(ok.status()).toBe(200);
});
