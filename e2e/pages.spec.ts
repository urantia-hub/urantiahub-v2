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
  // 196 numbered papers in the lists, and the Foreword as a title above them.
  await expect(page.locator('.toc .part a[href^="/papers/"]')).toHaveCount(197);
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
  await page.getByRole("banner").getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#17150f");

  await page.goto("/papers/paper-1-the-universal-father");
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);

  // On a paper the theme is in the reader settings.
  await page.getByRole("button", { name: "Account and settings" }).click();
  await page.getByRole("dialog", { name: "Account and settings" }).getByRole("button", { name: "Light" }).click();
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

test("on a paper page the theme is in the reader settings, and other pages keep the moon", async ({ page }) => {
  await page.goto("/papers/paper-1-the-universal-father");
  const header = page.getByRole("banner");
  await expect(header.getByRole("button", { name: "Dark theme" })).toBeHidden();
  await header.getByRole("button", { name: "Account and settings" }).click();
  await page.getByRole("dialog", { name: "Account and settings" }).getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
  // The contents page has the settings too. A page such as About keeps the moon.
  await page.goto("/about");
  await expect(page.getByRole("banner").getByRole("button", { name: "Light theme" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("button", { name: "Account and settings" })).toBeHidden();
});

test("the contents page shows no Continue card to a new visitor", async ({ page }) => {
  await page.goto("/papers");
  await expect(page.getByRole("heading", { name: "Papers", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Continue/ })).toHaveCount(0);
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

test("the page links the favicon, the Apple icon, and the manifest, and each one loads", async ({ page, request }) => {
  await page.goto("/");
  const svgIcon = page.locator('link[rel="icon"][type="image/svg+xml"]');
  const pngIcon = page.locator('link[rel="icon"][type="image/png"]');
  const apple = page.locator('link[rel="apple-touch-icon"]');
  const manifest = page.locator('link[rel="manifest"]');
  await expect(svgIcon).toHaveCount(1);
  await expect(pngIcon).toHaveCount(1);
  await expect(apple).toHaveCount(1);
  await expect(manifest).toHaveCount(1);

  for (const [link, type] of [
    [svgIcon, "image/svg+xml"],
    [pngIcon, "image/png"],
    [apple, "image/png"],
    [manifest, "application/manifest+json"],
  ] as const) {
    const response = await request.get((await link.getAttribute("href"))!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain(type);
  }
  for (const icon of ["/icon-192.png", "/icon-512.png"]) {
    expect((await request.get(icon)).status()).toBe(200);
  }
});

test("the header shows the bookmark mark beside the name, in the theme colors", async ({ page }) => {
  await page.goto("/");
  const brand = page.getByRole("banner").getByRole("link", { name: "UrantiaHub" });
  await expect(brand.locator("svg.mark")).toBeVisible();
  await expect(brand.locator(".mark-tile")).toHaveCSS("fill", "rgb(38, 34, 28)");
  await expect(brand.locator(".mark-shape")).toHaveCSS("fill", "rgb(251, 248, 242)");
  await page.getByRole("banner").getByRole("button", { name: "Dark theme" }).click();
  await expect(brand.locator(".mark-tile")).toHaveCSS("fill", "rgb(230, 223, 208)");
  await expect(brand.locator(".mark-shape")).toHaveCSS("fill", "rgb(23, 21, 15)");
});

// The Foreword stood alone, indented like a list entry with no list around it.
test("the Foreword on the contents page looks like a part title: same left edge, same size", async ({ page }) => {
  await page.goto("/papers");
  const foreword = page.getByRole("heading", { name: "Foreword", level: 2 });
  const part = page.getByRole("heading", { name: "The Central and Superuniverses", level: 2 });
  await expect(foreword.getByRole("link")).toHaveAttribute("href", "/papers/foreword");
  const [a, b] = await Promise.all([foreword.boundingBox(), part.boundingBox()]);
  expect(Math.abs(a!.x - b!.x)).toBeLessThanOrEqual(1);
  expect(await foreword.evaluate((el) => getComputedStyle(el).fontSize)).toBe(await part.evaluate((el) => getComputedStyle(el).fontSize));
});

test.describe("the way back to the reader's place", () => {
  const PLACE = { paperId: "2", sectionId: "1", label: "1. The Infinity of God", at: 1 };

  test("the home page of a new visitor has Read the Papers, and no Continue", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Read the Papers" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue reading" })).toBeHidden();
    await expect(page.locator(".home .all-papers")).toBeHidden();
  });

  test("the home page of a reader with a place has Continue reading first, and it goes to the place", async ({ page }) => {
    await page.addInitScript((place) => window.localStorage.setItem("hub:last-read", JSON.stringify(place)), PLACE);
    await page.goto("/");
    const go = page.getByRole("link", { name: "Continue reading" });
    await expect(go).toBeVisible();
    await expect(page.getByRole("link", { name: "Read the Papers" })).toBeHidden();
    await expect(page.locator(".home-place")).toHaveText("Paper 2 · The Nature of God · 1. The Infinity of God");
    await expect(page.locator(".home .all-papers")).toBeVisible();
    await go.click();
    await page.waitForURL((url) => url.pathname === "/papers/paper-2-the-nature-of-god" && url.hash === "#2:1");
  });

  test("the settings have Continue on the contents page, and the header of a paper has the way to all papers", async ({ page }) => {
    await page.addInitScript((place) => window.localStorage.getItem("hub:last-read") ?? window.localStorage.setItem("hub:last-read", JSON.stringify(place)), PLACE);
    await page.goto("/papers");
    await page.getByRole("button", { name: "Account and settings" }).click();
    const row = page.getByRole("dialog", { name: "Account and settings" }).getByRole("link", { name: /Continue/ });
    await expect(row).toContainText("Paper 2 · 1. The Infinity of God");
    // The contents page is the list itself: it has no icon to it.
    await expect(page.getByRole("link", { name: "All papers", exact: true })).toBeHidden();
    await row.click();
    await page.waitForURL((url) => url.pathname === "/papers/paper-2-the-nature-of-god");
    await page.locator(".site-header").getByRole("link", { name: "All papers" }).click();
    await page.waitForURL((url) => url.pathname === "/papers");
  });
});

// A shared link shows a title, a description, and an image. Each page must have all three.
for (const [path, title] of [
  ["/", "Read the Urantia Papers online | UrantiaHub"],
  ["/papers", "All 196 Urantia Papers: table of contents | UrantiaHub"],
  ["/about", "What are the Urantia Papers? | UrantiaHub"],
  ["/privacy", "Privacy | UrantiaHub"],
  ["/terms", "Terms | UrantiaHub"],
  ["/papers/paper-1-the-universal-father", "Paper 1: The Universal Father | UrantiaHub"],
  ["/search", "Search | UrantiaHub"],
  ["/parallels?ref=1:0.3", "Parallels | UrantiaHub"],
] as const) {
  test(`a shared link to ${path} has a title, a description, and an image that loads`, async ({ page, request }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    const content = (selector: string) => page.locator(selector).first().getAttribute("content");
    expect((await content('meta[name="description"]'))!.length).toBeGreaterThan(40);
    expect(await content('meta[property="og:site_name"]')).toBe("UrantiaHub");
    expect(await content('meta[name="twitter:card"]')).toBe("summary_large_image");
    const image = (await content('meta[property="og:image"]'))!;
    expect(await content('meta[name="twitter:image"]')).toBe(image);
    expect(await content('meta[property="og:image:width"]')).toBe("1200");
    const answer = await request.get(new URL(image).pathname + new URL(image).search);
    expect(answer.status()).toBe(200);
    expect(answer.headers()["content-type"]).toBe("image/png");
  });
}

// The addresses of the Hub before this one. A link in an old email, a bookmark of a browser, and a
// result of a search engine must each go to a page.
for (const [from, to, status] of [
  ["/en", "/", 308],
  ["/en/papers/paper-1-the-universal-father", "/papers/paper-1-the-universal-father", 308],
  ["/en/about", "/about", 308],
  ["/my-library", "/saved", 308],
  ["/my-library/bookmarks", "/saved", 308],
  ["/progress", "/papers", 308],
  ["/explore", "/papers", 308],
  ["/settings", "/papers", 308],
  ["/watch/paper-1-the-universal-father", "/papers/paper-1-the-universal-father", 308],
  ["/privacy-policy", "/privacy", 308],
  ["/cookie-policy", "/privacy", 308],
  ["/auth/sign-in", "/papers", 308],
  ["/terms-of-service", "/terms", 308],
  ["/changelog", "/about", 307],
  ["/community-resources", "/about", 307],
  ["/api/user/unsubscribe?token=abc", "/emails?token=abc", 307],
  ["/api/redirect/papers/by-standard-reference-id/1:0.3", "/papers/paper-1-the-universal-father#1:0.3", 308],
  ["/api/redirect/papers/by-standard-reference-id/999:1.1", "/papers", 307],
] as const) {
  test(`the old address ${from} goes to ${to}`, async ({ request }) => {
    const answer = await request.get(from, { maxRedirects: 0 });
    expect(answer.status()).toBe(status);
    const location = new URL(answer.headers().location, "http://localhost:3100");
    expect(location.pathname + location.search + location.hash).toBe(to);
  });
}

test("an old unsubscribe link lands on a page that says no daily email comes, and the sign-in callback is not taken", async ({ page, request }) => {
  await page.goto("/api/user/unsubscribe?token=abc");
  await expect(page.getByRole("heading", { name: "Emails" })).toBeVisible();
  await expect(page.getByText("UrantiaHub sends no daily emails at this time.")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // `/auth/callback` is a route of this Hub: it must not go where the old sign-in pages go.
  const callback = await request.get("/auth/callback", { maxRedirects: 0 });
  expect(callback.headers().location ?? "").not.toMatch(/\/papers$/);
});

test("the terms page names who runs the site and the law that applies, and the footer links to it", async ({ page }) => {
  await page.goto("/");
  await page.locator(".site-footer").getByRole("link", { name: "Terms" }).click();
  await page.waitForURL("**/terms");
  await expect(page.getByRole("heading", { level: 1, name: "Terms" })).toBeVisible();
  await expect(page.getByText("Adams Technologies LLC, a Texas limited liability company, runs UrantiaHub.")).toBeVisible();
  await expect(page.getByText("It is not affiliated with, endorsed by, or sponsored by Urantia Foundation.")).toBeVisible();
  await expect(page.getByText("The laws of the State of Texas, United States, govern these terms.")).toBeVisible();
});
