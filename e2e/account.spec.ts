import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const STANDIN = "http://localhost:4010";
const PAPER = "/papers/paper-1-the-universal-father";

// Each test is one reader of its own on the stand-in.
async function asReader(context: BrowserContext) {
  const id = randomUUID();
  await context.addCookies([{ name: "e2e_reader", value: id, url: STANDIN }]);
  const set = async (values: object) => (await context.request.post(`${STANDIN}/__reader/${id}`, { data: values })).json();
  const seen = async () => (await context.request.get(`${STANDIN}/__reader/${id}`)).json();
  return { id, set, seen };
}

const openSettings = (page: Page) => page.getByRole("button", { name: "Account and settings" }).click();
const sheet = (page: Page) => page.getByRole("dialog", { name: "Account and settings" });

async function signIn(page: Page) {
  await openSettings(page);
  await sheet(page).getByRole("link", { name: /^Sign in/ }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/papers"));
  await openSettings(page);
  await expect(sheet(page).getByRole("button", { name: "Sign out" })).toBeVisible();
}

test.describe("a sign-in from a paper", () => {
  test("returns the reader to the same paragraph, and shows the account in the settings", async ({ page, context }) => {
    await asReader(context);
    await page.goto(`${PAPER}#1:0.3`);
    await openSettings(page);
    await expect(sheet(page).getByText("Keep your place and your settings on each device")).toBeVisible();
    await sheet(page).getByRole("link", { name: /^Sign in/ }).click();
    await page.waitForURL((url) => url.pathname === PAPER && url.hash === "#1:0.3");

    await openSettings(page);
    const account = sheet(page).getByRole("link", { name: /Ana Reader/ });
    await expect(account).toHaveAttribute("href", "https://accounts.urantiahub.com");
    await expect(account).toHaveAttribute("target", "_blank");
    await expect(sheet(page).getByRole("link", { name: /^Sign in/ })).toHaveCount(0);
    // One row for the account, and "Sign out". No second link to the same page.
    await expect(sheet(page).locator(".account-row")).toHaveCount(2);
  });

  test("keeps no token where a script can read it", async ({ page, context }) => {
    await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    const cookies = await context.cookies("http://localhost:3100");
    const session = cookies.find((cookie) => cookie.name === "hub_session");
    expect(session?.httpOnly).toBe(true);
    expect(session?.value).not.toContain("at.");
    const readable = await page.evaluate(() => `${document.cookie} ${JSON.stringify({ ...localStorage })}`);
    expect(readable).not.toMatch(/\b[ar]t\./);
    expect(readable).not.toContain("hub_session");
  });

  test("a sign-out stays on the page, and the next sign-in is not silent", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await sheet(page).getByRole("button", { name: "Sign out" }).click();
    await expect(sheet(page).getByRole("link", { name: /^Sign in/ })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(PAPER);
    expect((await reader.seen()).revoked).toBe(1);

    await sheet(page).getByRole("link", { name: /^Sign in/ }).click();
    await page.waitForURL((url) => url.pathname === PAPER);
    expect((await reader.seen()).prompts).toEqual([null, "select_account"]);
  });

  test("says so, on the same page, when the sign-in does not finish", async ({ page, context }) => {
    const reader = await asReader(context);
    for (const mode of ["exchange-fails", "deny"]) {
      await reader.set({ mode });
      await page.goto(PAPER);
      await openSettings(page);
      await sheet(page).getByRole("link", { name: /^Sign in/ }).click();
      await page.waitForURL((url) => url.pathname === PAPER);
      await openSettings(page);
      await expect(sheet(page).getByText("The sign-in did not finish. Try again.")).toBeVisible();
      await expect(sheet(page).getByRole("link", { name: /^Sign in/ })).toBeVisible();
    }
  });
});

// Kelson, 2026-10-09: the icon is a person. Signed in, it is the reader's initial.
test.describe("the icon that opens the settings and the account", () => {
  test("is a person for a reader with no account, and the reader's initial after a sign-in", async ({ page, context }) => {
    await asReader(context);
    for (const path of [PAPER, "/papers"]) {
      await page.goto(path);
      const button = page.getByRole("button", { name: "Account and settings" });
      await expect(button.locator("svg")).toBeVisible();
      await expect(button.locator(".face")).toHaveCount(0);
    }
    await page.goto(PAPER);
    await signIn(page);
    await page.keyboard.press("Escape");
    for (const path of [PAPER, "/papers"]) {
      await page.goto(path);
      const button = page.getByRole("button", { name: "Account and settings" });
      await expect(button.locator(".face")).toHaveText("A");
      await expect(button.locator("svg")).toHaveCount(0);
      const box = (await button.locator(".face").boundingBox())!;
      expect(Math.round(box.width)).toBe(Math.round(box.height));
    }
  });
});

test.describe("the top bar of a paper", () => {
  test("shows the mark only, and the mark is the way home", async ({ page }) => {
    await page.goto(PAPER);
    const brand = page.locator(".site-header .brand");
    await expect(brand).toHaveAccessibleName("UrantiaHub");
    expect((await brand.boundingBox())!.width).toBeLessThan(40);
    await brand.click();
    await page.waitForURL((url) => url.pathname === "/");
    // Each other page keeps the name.
    expect((await page.locator(".site-header .brand").boundingBox())!.width).toBeGreaterThan(80);
  });
});

// Kelson, 2026-10-09: the contents page has the header of a paper. The mark only, search, and settings.
test.describe("the header of the contents page", () => {
  test("shows the mark, search, and settings, and no name or page links", async ({ page }) => {
    await page.goto("/papers");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Papers" })).toBeHidden();
    await expect(header.getByRole("link", { name: "About" })).toBeHidden();
    await expect(header.getByRole("button", { name: /theme/ })).toBeHidden();
    await expect(header.getByRole("link", { name: "Search" })).toBeVisible();
    expect((await page.locator(".site-header .brand").boundingBox())!.width).toBeLessThan(40);
    // "About" is in the footer of each page.
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  });

  test("its settings hold the theme and the account, and no text size", async ({ page, context }) => {
    await asReader(context);
    await page.goto("/papers");
    await openSettings(page);
    await expect(sheet(page).getByRole("button", { name: "Dark" })).toBeVisible();
    await expect(sheet(page).getByRole("button", { name: "Larger text" })).toBeHidden();
    await sheet(page).getByRole("link", { name: /^Sign in/ }).click();
    await page.waitForURL((url) => url.pathname === "/papers");
    await openSettings(page);
    await expect(sheet(page).getByRole("link", { name: /Ana Reader/ })).toBeVisible();
    await sheet(page).getByRole("button", { name: "Sign out" }).click();
    await expect(sheet(page).getByRole("link", { name: /^Sign in/ })).toBeVisible();
  });

  test("the home page keeps the name, the links, and the moon", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "About" })).toBeVisible();
    await expect(header.getByRole("button", { name: /theme/ })).toBeVisible();
    await expect(header.getByRole("button", { name: "Account and settings" })).toBeHidden();
  });
});

test.describe("the contents page", () => {
  test("invites a signed-out reader one time, and not a signed-in reader", async ({ page, context }) => {
    await asReader(context);
    await page.goto("/papers");
    const invite = page.locator(".invite");
    await expect(invite.getByText("Keep your place and your settings")).toBeVisible();
    await invite.getByRole("link", { name: "Sign in" }).click();
    await page.waitForURL((url) => url.pathname === "/papers");
    await expect(page.getByRole("heading", { level: 1, name: "Papers" })).toBeVisible();
    await expect(invite).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Papers" })).toBeVisible();
    await expect(invite).toHaveCount(0);
  });

  test("shows the place from another device", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ preferences: { "hub.place": { paperId: "2", sectionId: "3", label: "3. Justice and Righteousness", at: Date.now() - 60_000 } } });
    await page.goto("/papers");
    await expect(page.locator(".continue")).toHaveCount(0);
    await page.locator(".invite").getByRole("link", { name: "Sign in" }).click();
    await page.waitForURL((url) => url.pathname === "/papers");
    const card = page.locator(".continue");
    await expect(card).toContainText("The Nature of God");
    await expect(card).toContainText("3. Justice and Righteousness");
  });
});

test.describe("what follows the reader", () => {
  test("the place goes to the account when the reader reads", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await expect.poll(async () => (await reader.seen()).preferences["hub.place"]?.paperId).toBe("1");
  });

  test("a newer place in this browser wins over an older one in the account", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ preferences: { "hub.place": { paperId: "2", sectionId: "3", label: null, at: Date.now() - 86_400_000 } } });
    await page.goto(PAPER);
    await signIn(page);
    await expect.poll(async () => (await reader.seen()).preferences["hub.place"]?.paperId).toBe("1");
  });

  test("the theme and the text size come from the account, and a change goes back to it", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ preferences: { "hub.reader": { theme: "dark", textSize: 4, at: Date.now() - 60_000 } } });
    await page.goto(PAPER);
    await signIn(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-text-size", "4");

    await sheet(page).getByRole("button", { name: "Light" }).click();
    await expect.poll(async () => (await reader.seen()).preferences["hub.reader"]?.theme).toBe("light");
    expect((await reader.seen()).preferences["hub.reader"].textSize).toBe(4);
  });
});

// A second person can sign in on the same browser.
test.describe("a browser that two people use", () => {
  test("does not show the first reader's place after a sign-out, and does not give it to the next reader", async ({ page, context }) => {
    const first = await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await expect.poll(async () => (await first.seen()).preferences["hub.place"]?.paperId).toBe("1");
    await sheet(page).getByRole("button", { name: "Sign out" }).click();
    await expect(sheet(page).getByRole("link", { name: /^Sign in/ })).toBeVisible();

    await page.goto("/papers");
    await expect(page.locator(".invite")).toBeVisible();
    await expect(page.locator(".continue")).toHaveCount(0);

    const second = await asReader(context);
    await page.locator(".invite").getByRole("link", { name: "Sign in" }).click();
    await page.waitForURL((url) => url.pathname === "/papers");
    await expect(page.locator(".invite")).toHaveCount(0);
    await expect(page.locator(".continue")).toHaveCount(0);
    expect((await second.seen()).preferences["hub.place"]).toBeUndefined();
    expect((await second.seen()).writes).toBe(0);
  });

  // A tab from before the sign-out can still be open. It speaks for the first reader.
  test("refuses a write from a page that still speaks for the reader before", async ({ page, context }) => {
    await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    const firstKey = (await (await page.request.get("/api/auth/session")).json()).user.key as string;
    await sheet(page).getByRole("button", { name: "Sign out" }).click();
    await expect(sheet(page).getByRole("link", { name: /^Sign in/ })).toBeVisible();

    const second = await asReader(context);
    await sheet(page).getByRole("link", { name: /^Sign in/ }).click();
    await page.waitForURL((url) => url.pathname === PAPER);
    await expect.poll(async () => (await second.seen()).preferences["hub.place"]?.paperId).toBe("1");
    const writes = (await second.seen()).writes;

    const status = await page.evaluate(async (key) => {
      const place = { paperId: "5", sectionId: "1", label: null, at: Date.now() + 1000 };
      return (await fetch("/api/me/place", { method: "PUT", headers: { "content-type": "application/json", "x-hub-reader": key }, body: JSON.stringify(place) })).status;
    }, firstKey);
    expect(status).toBe(409);
    expect((await second.seen()).writes).toBe(writes);
    expect((await second.seen()).preferences["hub.place"].paperId).toBe("1");
  });

  test("says that the reader is still signed in when the sign-out does not reach the server", async ({ page, context }) => {
    await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await page.route("**/api/auth/signout", (route) => route.abort());
    await sheet(page).getByRole("button", { name: "Sign out" }).click();
    await expect(sheet(page).getByText("The sign-out did not finish, so you are still signed in. Try again.")).toBeVisible();
    await expect(sheet(page).getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});

test.describe("what the reader read", () => {
  test("a paragraph that stays in view goes to the account, and one that a fast scroll passed does not", async ({ page, context }) => {
    const reader = await asReader(context);
    // The test moves the clock of the page, so it does not wait for the real time.
    await page.clock.install();
    await page.goto(PAPER);
    await signIn(page);
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await page.request.get("/api/auth/session")).ok()).toBe(true);
    // The first paragraphs are in view. Each needs 8 seconds at most, and a batch goes out after 30.
    await page.clock.fastForward(10_000);
    expect((await reader.seen()).read).toEqual([]);
    await page.clock.fastForward(31_000);
    await expect.poll(async () => (await reader.seen()).read.length).toBeGreaterThan(0);
    const read = (await reader.seen()).read as string[];
    expect(read.every((ref) => /^1:\d+\.\d+$/.test(ref))).toBe(true);
    expect(read).toContain("1:0.1");
    // The end of the paper was never on the screen.
    expect(read.some((ref) => ref.startsWith("1:7."))).toBe(false);
  });

  test("goes out when the reader leaves the paper", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.clock.install();
    await page.goto(PAPER);
    await signIn(page);
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await page.request.get("/api/auth/session")).ok()).toBe(true);
    await page.clock.fastForward(9000);
    await page.goto("/papers");
    await expect.poll(async () => (await reader.seen()).read.length).toBeGreaterThan(0);
  });

  test("is not recorded for a reader with no account", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.clock.install();
    await page.goto(PAPER);
    await expect(page.getByRole("heading", { level: 1, name: "The Universal Father" })).toBeVisible();
    await page.clock.fastForward(40_000);
    await page.goto("/papers");
    await expect(page.locator(".invite")).toBeVisible();
    expect((await reader.seen()).batches).toEqual([]);
  });

  test("the contents page says Read, and the section of the paper where the reader is", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({
      progress: [
        { paperId: "0", readCount: 100, totalParagraphs: 100 },
        { paperId: "1", readCount: 58, totalParagraphs: 60 },
        { paperId: "3", readCount: 10, totalParagraphs: 60 },
      ],
      preferences: { "hub.place": { paperId: "2", sectionId: "3", label: "3. Justice and Righteousness", at: Date.now() - 60_000 } },
    });
    await page.goto("/papers");
    await expect(page.locator(".toc .mark")).toHaveCount(0);
    await page.locator(".invite").getByRole("link", { name: "Sign in" }).click();
    await page.waitForURL((url) => url.pathname === "/papers");
    const row = (title: string) => page.locator(".toc .papers li", { hasText: title });
    await expect(row("The Universal Father").locator(".mark")).toHaveText("Read");
    // The word must be readable. A pale color on the paper passed each other test and could not be seen.
    const [ink, paper] = await row("The Universal Father").locator(".mark").evaluate((mark) => {
      const light = (color: string) => { const [r, g, b] = color.match(/\d+/g)!.map(Number); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      return [light(getComputedStyle(mark).color), light(getComputedStyle(document.body).backgroundColor)];
    });
    expect(paper - ink).toBeGreaterThan(100);
    await expect(row("The Nature of God").locator(".mark")).toHaveText("Section 3 of 7");
    await expect(row("The Attributes of God").locator(".mark")).toHaveCount(0);
    await expect(page.locator("#foreword .mark")).toHaveText("Read");
    await expect(page.locator(".toc .mark")).toHaveCount(3);

    // After a sign-out the marks are gone.
    await openSettings(page);
    await sheet(page).getByRole("button", { name: "Sign out" }).click();
    await expect(page.locator(".toc .mark")).toHaveCount(0);
  });
});

test.describe("when the service has a problem", () => {
  test("a reader stays signed in while the API is down, and reads as before", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await reader.set({ mode: "down" });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "The Universal Father" })).toBeVisible();
    await openSettings(page);
    await expect(sheet(page).getByRole("button", { name: "Sign out" })).toBeVisible();
    // No line about a problem: the reader did nothing wrong, and reading works.
    await expect(sheet(page).locator(".account-rows p")).toHaveCount(0);
  });

  test("a reader whose access was removed is signed out quietly", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await reader.set({ mode: "refused" });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "The Universal Father" })).toBeVisible();
    await openSettings(page);
    await expect(sheet(page).getByRole("link", { name: /^Sign in/ })).toBeVisible();
    expect((await context.cookies("http://localhost:3100")).some((cookie) => cookie.name === "hub_session")).toBe(false);
  });
});

test.describe("the account routes", () => {
  test("answer nothing of a reader to a request with no session", async ({ request }) => {
    expect((await request.get("/api/me/reader")).status()).toBe(401);
    expect(await (await request.get("/api/auth/session")).json()).toEqual({ enabled: true, user: null });
    expect((await request.put("/api/me/place", { data: {}, headers: { origin: "http://localhost:3100" } })).status()).toBe(401);
  });

  test("refuse a write and a sign-out from another site", async ({ request }) => {
    expect((await request.post("/api/auth/signout", { headers: { origin: "https://evil.example" } })).status()).toBe(403);
    expect((await request.put("/api/me/settings", { data: {}, headers: { origin: "https://evil.example" } })).status()).toBe(403);
  });
});
