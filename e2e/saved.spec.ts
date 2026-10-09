import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { stubAudio, tap } from "./audio";

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

const settings = (page: Page) => page.getByRole("dialog", { name: "Account and settings" });
async function signIn(page: Page) {
  await page.getByRole("button", { name: "Account and settings" }).click();
  await settings(page).getByRole("link", { name: /^Sign in/ }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/papers"));
  await expect(page.getByRole("button", { name: "Account and settings" }).locator(".face")).toBeVisible();
}
const savedMark = (page: Page, ref: string) => page.locator(`[id="${ref}"] .mark-saved`);
const at = (ref: string) => ({ ref, createdAt: "2026-10-01T00:00:00.000Z" });
const noteOf = (ref: string, text: string, createdAt = "2026-10-01T00:00:00.000Z") => ({ id: randomUUID(), ref, text, createdAt });
const notes = (page: Page, ref: string) => page.getByRole("dialog", { name: `Your notes on ${ref}` });
const pen = (page: Page, ref: string) => page.locator(`[id="${ref}"] .mark-notes`);
// The row opens the notes on each screen. The pen is for a narrow screen, and the card for a wide one.
async function openNotes(page: Page, ref: string) {
  await tap(page, ref);
  await page.getByRole("button", { name: "Note", exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test.describe("Save, for a reader with no account", () => {
  test("asks for a sign-in, keeps nothing, and returns to the paragraph with the row open", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Save" }).click();
    const ask = page.getByRole("dialog", { name: "Sign in to save this" });
    await expect(ask).toContainText("Your saved paragraphs and notes stay with your account.");
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain("1:0.3");

    await ask.getByRole("link", { name: "Sign in" }).click();
    await page.waitForURL((url) => url.pathname === PAPER && url.hash === "#1:0.3");
    await expect(page.getByTestId("picked-ref")).toHaveText("1:0.3");
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    // The sign-in saved nothing for the reader. The reader presses Save.
    expect((await reader.seen()).saved).toEqual([]);
  });

  test("Not now closes the question and keeps the paragraph marked", async ({ page, context }) => {
    await asReader(context);
    await page.goto(PAPER);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("picked-ref")).toHaveText("1:0.3");
  });
});

test.describe("Save, for a signed-in reader", () => {
  test("saves the paragraph, shows the mark after a reload, and one more press removes it", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
    await expect(savedMark(page, "1:0.3")).toBeVisible();
    await expect.poll(async () => (await reader.seen()).saved.map((b: { ref: string }) => b.ref)).toEqual(["1:0.3"]);

    await page.reload();
    await expect(savedMark(page, "1:0.3")).toBeVisible();
    await expect(page.locator(".mark-saved")).toHaveCount(1);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Saved" }).click();
    await expect(savedMark(page, "1:0.3")).toHaveCount(0);
    await expect.poll(async () => (await reader.seen()).saved).toEqual([]);
    // Nothing of it is in the browser's storage.
    expect(await page.evaluate(() => `${document.cookie} ${JSON.stringify({ ...localStorage })}`)).not.toContain("1:0.3");
  });

  test("the marks move no text when they arrive", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ saved: [at("1:0.1"), at("1:0.3"), at("1:1.2")], notes: [noteOf("1:0.3", "One."), noteOf("1:0.3", "Two."), noteOf("1:2.1", "Three.")] });
    await page.goto(PAPER);
    await signIn(page);
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/me/saved?paper=1", async (route) => {
      await held;
      await route.continue();
    });
    await page.reload();
    const tops = () => page.evaluate(() => ["1:0.1", "1:0.3", "1:1.2", "1:2.1"].map((ref) => Math.round(document.getElementById(ref)!.querySelector(":scope > span:last-child")!.getBoundingClientRect().top + window.scrollY)));
    await expect(page.getByRole("button", { name: "Account and settings" }).locator(".face")).toBeVisible();
    const before = await tops();
    release();
    await expect(page.locator(".mark-saved")).toHaveCount(3);
    await expect(page.locator(".mark-notes")).toHaveCount(2);
    expect(await tops()).toEqual(before);
  });

  test("the mark is as dark as the reference beside it", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ saved: [at("1:0.3")] });
    await page.goto(PAPER);
    await signIn(page);
    await expect(savedMark(page, "1:0.3")).toBeVisible();
    const colors = await page.evaluate(() => {
      const para = document.getElementById("1:0.3")!;
      return [getComputedStyle(para.querySelector(".mark-saved svg")!).color, getComputedStyle(para.querySelector(".ref")!).color];
    });
    expect(colors[0]).toBe(colors[1]);
  });

  test("a save that fails goes back and says so, and the reader stays signed in", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await reader.set({ mode: "down" });
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("This did not save. Try again.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toHaveAttribute("aria-pressed", "false");
    await reader.set({ mode: "ok" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  });

  test("the next person on the same browser sees none of the marks", async ({ page, context }) => {
    const first = await asReader(context);
    await first.set({ saved: [at("1:0.3")] });
    await page.goto(PAPER);
    await signIn(page);
    await expect(savedMark(page, "1:0.3")).toBeVisible();
    await page.getByRole("button", { name: "Account and settings" }).click();
    await settings(page).getByRole("button", { name: "Sign out" }).click();
    await expect(page.locator(".mark-saved")).toHaveCount(0);

    await asReader(context);
    await page.keyboard.press("Escape");
    await signIn(page);
    await tap(page, "1:0.3");
    await expect(page.getByRole("button", { name: "Save" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".mark-saved")).toHaveCount(0);
  });
});

test.describe("Note", () => {
  test("asks a reader with no account to sign in", async ({ page, context }) => {
    await asReader(context);
    await page.goto(PAPER);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Note", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Sign in to save this" })).toBeVisible();
  });

  test("a reader writes a note, sees its mark, changes it, and deletes it", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Note", exact: true }).click();
    const sheet = notes(page, "1:0.3");
    await expect(sheet).toContainText("Only you see them.");
    // With no note yet, the reader is in the field.
    await expect(sheet.getByRole("textbox", { name: "Add a note" })).toBeFocused();
    await page.keyboard.type("Compare with Paper 10.");
    await sheet.getByRole("button", { name: "Save" }).click();
    await expect(sheet.getByRole("listitem")).toHaveText(/Compare with Paper 10\./);
    await expect(page.getByRole("button", { name: "1 note on 1:0.3", includeHidden: true })).toHaveCount(1);
    await expect.poll(async () => (await reader.seen()).notes.map((n: { text: string }) => n.text)).toEqual(["Compare with Paper 10."]);

    // After a reload, the pen opens the notes and marks the paragraph.
    await page.reload();
    await expect(pen(page, "1:0.3")).toHaveCount(1);
    await openNotes(page, "1:0.3");
    await notes(page, "1:0.3").getByRole("button", { name: "Edit" }).click();
    const field = notes(page, "1:0.3").getByRole("textbox", { name: "Your note" });
    await expect(field).toHaveValue("Compare with Paper 10.");
    await field.fill("Compare with Paper 10 and Paper 3.");
    await notes(page, "1:0.3").getByRole("button", { name: "Save" }).click();
    await expect(notes(page, "1:0.3").getByRole("listitem")).toHaveText(/Paper 10 and Paper 3\./);

    await notes(page, "1:0.3").getByRole("button", { name: "Delete" }).click();
    await notes(page, "1:0.3").getByRole("group", { name: "Delete this note?" }).getByRole("button", { name: "Delete" }).click();
    await expect(notes(page, "1:0.3").getByRole("listitem")).toHaveCount(0);
    await expect(pen(page, "1:0.3")).toHaveCount(0);
    await expect.poll(async () => (await reader.seen()).notes).toEqual([]);
    // Nothing of a note is in the browser's storage.
    expect(await page.evaluate(() => `${document.cookie} ${JSON.stringify({ ...localStorage })}`)).not.toContain("Paper 10");
  });

  test("the notes of a paragraph are a thread, the oldest first, with the field at the end", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ notes: [noteOf("1:0.3", "The newer one.", "2026-10-05T00:00:00.000Z"), noteOf("1:0.3", "The older one.", "2026-10-01T00:00:00.000Z"), noteOf("1:0.5", "Elsewhere.")] });
    await page.goto(PAPER);
    await signIn(page);
    await expect(pen(page, "1:0.3")).toHaveText("2");
    await openNotes(page, "1:0.3");
    await expect(notes(page, "1:0.3").locator(".note-text")).toHaveText(["The older one.", "The newer one."]);
    const order = await notes(page, "1:0.3").evaluate((el) => [...el.querySelectorAll(".note-text, textarea")].map((x) => x.tagName));
    expect(order).toEqual(["P", "P", "TEXTAREA"]);
  });

  test("on a narrow screen the pen opens the notes and marks the paragraph", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "a wide screen shows the card, not the pen");
    const reader = await asReader(context);
    await reader.set({ notes: [noteOf("1:0.3", "From the pen.")] });
    await page.goto(PAPER);
    await signIn(page);
    await pen(page, "1:0.3").click();
    await expect(notes(page, "1:0.3")).toContainText("From the pen.");
    await expect(page.getByTestId("picked-ref")).toHaveText("1:0.3");
  });

  test("a note that does not save stays in its field", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Note", exact: true }).click();
    await reader.set({ mode: "down" });
    await notes(page, "1:0.3").getByRole("textbox", { name: "Add a note" }).fill("Do not lose me.");
    await notes(page, "1:0.3").getByRole("button", { name: "Save" }).click();
    await expect(notes(page, "1:0.3").getByRole("alert")).toHaveText("The note did not save. Try again.");
    await expect(notes(page, "1:0.3").getByRole("textbox", { name: "Add a note" })).toHaveValue("Do not lose me.");
    await reader.set({ mode: "ok" });
    await notes(page, "1:0.3").getByRole("button", { name: "Save" }).click();
    await expect(notes(page, "1:0.3").getByRole("listitem")).toHaveText(/Do not lose me\./);
  });

  test("a note with markup characters and a very long word stays inside the sheet", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ notes: [noteOf("1:0.3", `<img src=x onerror="document.title='broken'"> ${"w".repeat(400)}`)] });
    await page.goto(PAPER);
    await signIn(page);
    await expect(pen(page, "1:0.3")).toHaveCount(1);
    await openNotes(page, "1:0.3");
    const sheet = notes(page, "1:0.3");
    await expect(sheet.locator(".note-text")).toContainText("<img src=x");
    expect(await page.title()).not.toBe("broken");
    expect(await sheet.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test("the next person on the same browser sees no pen and no note", async ({ page, context }) => {
    const first = await asReader(context);
    await first.set({ notes: [noteOf("1:0.3", "Mine only.")] });
    await page.goto(PAPER);
    await signIn(page);
    await expect(pen(page, "1:0.3")).toHaveCount(1);
    await page.getByRole("button", { name: "Account and settings" }).click();
    await settings(page).getByRole("button", { name: "Sign out" }).click();
    await expect(page.locator(".mark-notes, .margin-card")).toHaveCount(0);
    await asReader(context);
    await page.keyboard.press("Escape");
    await signIn(page);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Note", exact: true }).click();
    await expect(notes(page, "1:0.3")).toBeVisible();
    await expect(page.getByText("Mine only.")).toHaveCount(0);
  });
});

test.describe("the notes in the margin", () => {
  const card = (page: Page, ref: string) => page.getByRole("complementary", { name: `Your notes on ${ref}` });

  test("a wide screen shows a card beside the paragraph and no pen, and a phone shows the pen and no card", async ({ page, context }, testInfo) => {
    const reader = await asReader(context);
    await reader.set({ notes: [noteOf("1:0.3", "Older.", "2026-10-01T00:00:00.000Z"), noteOf("1:0.3", "Newer.", "2026-10-05T00:00:00.000Z")] });
    await page.goto(PAPER);
    await signIn(page);
    if (testInfo.project.name === "phone") {
      await expect(pen(page, "1:0.3")).toBeVisible();
      await expect(card(page, "1:0.3")).toBeHidden();
      return;
    }
    await expect(card(page, "1:0.3")).toBeVisible();
    await expect(pen(page, "1:0.3")).toBeHidden();
    await expect(card(page, "1:0.3").locator(".margin-text")).toHaveText(["Newer."]);
    // The card starts at the top of its paragraph, at the right of the text, inside the window.
    const boxes = await page.evaluate(() => {
      const box = (el: Element) => el.getBoundingClientRect();
      const para = box(document.getElementById("1:0.3")!);
      const made = box(document.querySelector('.margin-card[data-for="1:0.3"]')!);
      return { paraTop: para.top, paraRight: para.right, top: made.top, left: made.left, right: made.right, wide: window.innerWidth };
    });
    expect(Math.abs(boxes.top - boxes.paraTop)).toBeLessThanOrEqual(1);
    expect(boxes.left).toBeGreaterThanOrEqual(boxes.paraRight);
    expect(boxes.right).toBeLessThanOrEqual(boxes.wide);

    await card(page, "1:0.3").getByRole("button", { name: "1 more note" }).click();
    await expect(card(page, "1:0.3").locator(".margin-text")).toHaveText(["Older.", "Newer."]);
  });

  test("the cards do not overlap, and they move no text", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the margin is for a wide screen");
    const reader = await asReader(context);
    const long = "A long note that takes many lines in a narrow card. ".repeat(14);
    await reader.set({ notes: [noteOf("1:0.1", long), noteOf("1:0.2", "Second card."), noteOf("1:0.3", "Third card.")] });
    await page.goto(PAPER);
    await signIn(page);
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/me/saved?paper=1", async (route) => {
      await held;
      await route.continue();
    });
    await page.reload();
    const tops = () => page.evaluate(() => ["1:0.1", "1:0.2", "1:0.3", "1:1.1"].map((ref) => Math.round(document.getElementById(ref)!.getBoundingClientRect().top + window.scrollY)));
    await expect(page.getByRole("button", { name: "Account and settings" }).locator(".face")).toBeVisible();
    const before = await tops();
    release();
    await expect(page.locator(".margin-card")).toHaveCount(3);
    await card(page, "1:0.1").getByRole("button", { name: "Read more" }).click();
    expect(await tops()).toEqual(before);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const boxes = [...document.querySelectorAll(".margin-card")].map((el) => el.getBoundingClientRect()).sort((a, b) => a.top - b.top);
          return boxes.every((box, i) => i === 0 || box.top >= boxes[i - 1].bottom + 8);
        }),
      )
      .toBe(true);
  });

  test("a press on a note in the card opens Your notes for that paragraph", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the margin is for a wide screen");
    const reader = await asReader(context);
    await reader.set({ notes: [noteOf("1:0.3", "Open me.")] });
    await page.goto(PAPER);
    await signIn(page);
    await card(page, "1:0.3").getByRole("button", { name: "Open your notes on 1:0.3" }).click();
    await expect(notes(page, "1:0.3")).toContainText("Open me.");
    await expect(page.getByTestId("picked-ref")).toHaveText("1:0.3");
  });

  test("a larger text size moves the card with its paragraph", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the margin is for a wide screen");
    const reader = await asReader(context);
    await reader.set({ notes: [noteOf("1:1.1", "Stay with me.")] });
    await page.goto(PAPER);
    await signIn(page);
    await expect(card(page, "1:1.1")).toBeVisible();
    await page.getByRole("button", { name: "Account and settings" }).click();
    await settings(page).getByRole("button", { name: "Larger text" }).click();
    await settings(page).getByRole("button", { name: "Larger text" }).click();
    await expect
      .poll(() => page.evaluate(() => Math.abs(document.querySelector('.margin-card[data-for="1:1.1"]')!.getBoundingClientRect().top - document.getElementById("1:1.1")!.getBoundingClientRect().top)))
      .toBeLessThanOrEqual(1);
  });
});

test.describe("the Saved page", () => {
  const entries = (page: Page) => page.locator(".saved-entry");
  const seed = { saved: [at("1:0.3"), { ref: "2:0.1", createdAt: "2026-10-04T00:00:00.000Z" }], notes: [noteOf("1:0.3", "Compare with Paper 10.", "2026-10-06T00:00:00.000Z"), noteOf("1:1.2", "Ask the group.", "2026-10-02T00:00:00.000Z")] };

  test("asks a reader with no account to sign in, and the sign-in returns to it", async ({ page, context }) => {
    await asReader(context);
    await page.goto("/saved");
    await expect(page.getByText("Sign in to find them here.")).toBeVisible();
    await page.getByRole("link", { name: "Sign in" }).click();
    await page.waitForURL((url) => url.pathname === "/saved");
    await expect(page.getByText("Nothing saved yet")).toBeVisible();
  });

  test("is reached from the account sheet and from the contents page", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set(seed);
    await page.goto(PAPER);
    await signIn(page);
    await page.getByRole("button", { name: "Account and settings" }).click();
    await settings(page).getByRole("link", { name: "Saved" }).click();
    await page.waitForURL("**/saved");
    await expect(entries(page)).toHaveCount(3);
    await page.goto("/papers");
    await page.locator(".toc").getByRole("link", { name: "Saved" }).click();
    await page.waitForURL("**/saved");
  });

  test("lists, searches, filters, and sorts what the reader saved", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set(seed);
    await page.goto(PAPER);
    await signIn(page);
    await page.goto("/saved");
    const refs = () => entries(page).locator("small").evaluateAll((all) => all.map((el) => el.textContent!.split("·")[0].trim()));
    await expect.poll(refs).toEqual(["1:0.3", "2:0.1", "1:1.2"]);
    await page.getByRole("searchbox", { name: "Search what you saved" }).fill("group");
    await expect.poll(refs).toEqual(["1:1.2"]);
    await page.getByRole("searchbox", { name: "Search what you saved" }).fill("");
    await page.getByRole("button", { name: "Paragraphs" }).click();
    await expect.poll(refs).toEqual(["1:0.3", "2:0.1"]);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await page.getByRole("button", { name: /Newest first/ }).click();
    await expect.poll(refs).toEqual(["1:0.3", "1:1.2", "2:0.1"]);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Paper 1 · Paper 1", "Paper 2 · Paper 2"]);
  });

  test("an entry opens the paper at its paragraph", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set(seed);
    await page.goto(PAPER);
    await signIn(page);
    await page.goto("/saved");
    await entries(page).first().locator(".saved-where").click();
    await page.waitForURL((url) => url.pathname === PAPER && url.hash === "#1:0.3");
    await expect(page.getByTestId("picked-ref")).toHaveText("1:0.3");
  });

  test("Remove, Edit, and Delete change the account and the list", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set(seed);
    await page.goto(PAPER);
    await signIn(page);
    await page.goto("/saved");
    await entries(page).nth(1).getByRole("button", { name: /^Remove/ }).click();
    await expect(entries(page)).toHaveCount(2);
    await entries(page).first().getByRole("button", { name: "Edit" }).click();
    await page.getByRole("textbox", { name: "Your note" }).fill("Changed here.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(entries(page).first()).toContainText("Changed here.");
    await entries(page).nth(1).getByRole("button", { name: "Delete" }).click();
    await entries(page).nth(1).getByRole("group", { name: "Delete this note?" }).getByRole("button", { name: "Delete" }).click();
    await expect(entries(page)).toHaveCount(1);
    const seen = await reader.seen();
    expect(seen.saved.map((b: { ref: string }) => b.ref)).toEqual(["1:0.3"]);
    expect(seen.notes.map((n: { text: string }) => n.text)).toEqual(["Changed here."]);
  });

  test("a long thread opens on the page of its paragraph, from the sheet and from the margin", async ({ page, context }, testInfo) => {
    const reader = await asReader(context);
    await reader.set({ notes: Array.from({ length: 12 }, (_, i) => noteOf("1:0.3", `Note ${i + 1}.`, `2026-09-${10 + i}T00:00:00.000Z`)) });
    await page.goto(PAPER);
    await signIn(page);
    await expect(pen(page, "1:0.3")).toHaveCount(1);
    if (testInfo.project.name === "desktop") {
      await page.getByRole("complementary", { name: "Your notes on 1:0.3" }).getByRole("link", { name: "See all 12 notes" }).click();
    } else {
      await openNotes(page, "1:0.3");
      // The sheet shows the last three notes of the thread.
      await expect(notes(page, "1:0.3").locator(".note-text")).toHaveText(["Note 10.", "Note 11.", "Note 12."]);
      await notes(page, "1:0.3").getByRole("link", { name: "See all 12 notes" }).click();
    }
    await page.waitForURL((url) => url.pathname === "/saved" && url.searchParams.get("ref") === "1:0.3");
    await expect(page.getByRole("heading", { name: "Your notes on 1:0.3" })).toBeVisible();
    await expect(page.locator(".saved-page .note-text")).toHaveCount(12);
    await expect(page.locator(".saved-quote")).toHaveText("Text of 1:0.3.");
    await page.getByRole("textbox", { name: "Add a note" }).fill("Note 13.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator(".saved-page .note-text")).toHaveCount(13);
    await page.getByRole("link", { name: "Paper 1" }).click();
    await page.waitForURL((url) => url.pathname === PAPER && url.hash === "#1:0.3");
  });

  test("stays out of search engines", async ({ page, request }) => {
    await page.goto("/saved");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/saved");
  });

  test("the next person on the same browser sees none of it", async ({ page, context }) => {
    const first = await asReader(context);
    await first.set(seed);
    await page.goto(PAPER);
    await signIn(page);
    await page.goto("/saved");
    await expect(entries(page)).toHaveCount(3);
    await page.getByRole("button", { name: "Account and settings" }).click();
    await settings(page).getByRole("button", { name: "Sign out" }).click();
    await expect(entries(page)).toHaveCount(0);
    await expect(page.getByText("Sign in to find them here.")).toBeVisible();
  });
});

test.describe("More", () => {
  test("holds the terms of the paragraph", async ({ page }) => {
    await page.goto(PAPER);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("dialog", { name: "More" }).getByRole("button", { name: "Copy the text" })).toBeVisible();
    await page.getByRole("button", { name: "Terms in this paragraph" }).click();
    await expect(page.getByRole("dialog", { name: "Terms in 1:0.3" })).toBeVisible();
  });
});
