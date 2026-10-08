import { expect, test, type Page } from "@playwright/test";

const PAPER_1 = "/papers/paper-1-the-universal-father";
const field = (page: Page) => page.getByRole("searchbox", { name: "Search the Papers" });
// The box arrives as a stream and then becomes ready for input. A test that types must wait for that.
async function openSearch(page: Page, address = "/search") {
  await page.goto(address);
  await expect(page.locator(".search-bar[data-ready]")).toBeVisible();
}
const group = (page: Page, name: string) => page.getByRole("region", { name });
const refs = (page: Page, name: string) => group(page, name).locator(".result footer").evaluateAll((els) => els.map((el) => el.firstChild?.textContent ?? ""));

test("a paper page header has icons only, and the search icon opens the search screen", async ({ page }) => {
  await page.goto(PAPER_1);
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Papers" })).toBeHidden();
  await expect(header.getByRole("link", { name: "About" })).toBeHidden();
  await header.getByRole("link", { name: "Search" }).click();
  await expect(page).toHaveURL("/search");
  await expect(page.locator(".search-bar[data-ready]")).toBeVisible();
  await expect(field(page)).toBeFocused();
  await expect(page.getByRole("banner")).toBeHidden();
});

test("other pages keep their links and gain the search icon", async ({ page }) => {
  await page.goto("/papers");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "About" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Search" })).toBeVisible();
});

test("a new visitor sees five starter questions, one from each group, and one tap runs the search", async ({ page }) => {
  await openSearch(page, "/search");
  const starters = group(page, "Ask in your own words");
  await expect(starters.locator(".starter-group")).toHaveCount(5);
  await expect(starters.getByRole("link")).toHaveCount(5);
  for (const one of await starters.locator(".starter-group").all()) await expect(one.getByRole("link")).toHaveCount(1);
  const first = starters.getByRole("link").first();
  const text = (await first.textContent())!;
  await first.click();
  await expect(page).toHaveURL(`/search?q=${encodeURIComponent(text)}`);
  await expect(field(page)).toHaveValue(text);
});

test("the starter questions do not change after the page shows", async ({ page }) => {
  await openSearch(page, "/search");
  const shown = () => group(page, "Ask in your own words").getByRole("link").allTextContents();
  const before = await shown();
  await page.waitForTimeout(600);
  expect(await shown()).toEqual(before);
});

test("a title word gives papers at once, and a tap opens the paper", async ({ page }) => {
  await openSearch(page, "/search");
  await field(page).fill("nature");
  const go = group(page, "Go to");
  await expect(go.getByRole("link").first()).toContainText("The Nature of God");
  await expect(page.getByRole("button", { name: "Search the Papers for “nature”" })).toBeVisible();
  await go.getByRole("link", { name: /The Nature of God/ }).click();
  await expect(page).toHaveURL("/papers/paper-2-the-nature-of-god");
  await page.goBack();
  await expect(page).toHaveURL("/search");
});

test("a reference gives only the jump, and Enter goes to the paragraph with its mark", async ({ page }) => {
  await openSearch(page, "/search");
  await field(page).fill("99:1.1");
  await expect(group(page, "Go to").getByRole("link")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Search the Papers for/ })).toHaveCount(0);
  await field(page).press("Enter");
  await expect(page).toHaveURL("/papers/paper-99-the-social-problems-of-religion#99:1.1");
  await expect(page.locator('[id="99:1.1"]')).toHaveCSS("background-color", "rgb(243, 234, 210)");
});

test("words show exact matches first, with the words marked, then related passages, and no paragraph twice", async ({ page }) => {
  await openSearch(page, "/search");
  await field(page).fill("thought adjuster");
  await field(page).press("Enter");
  await expect(page).toHaveURL("/search?q=thought%20adjuster");
  const exact = group(page, "Exact matches");
  const related = group(page, "Related passages");
  await expect(exact.locator(".result")).toHaveCount(5);
  await expect(related.locator(".result").first()).toBeVisible();
  await expect(exact.locator("mark").first()).toHaveText(/thought|adjuster/i);
  await expect(related.locator("mark")).toHaveCount(0);
  const [a, b] = [await exact.boundingBox(), await related.boundingBox()];
  expect(a!.y).toBeLessThan(b!.y);
  const shown = [...(await refs(page, "Exact matches")), ...(await refs(page, "Related passages"))];
  expect(new Set(shown).size).toBe(shown.length);
  // The direct hits for the same text stay above the groups.
  await expect(group(page, "Go to").getByRole("link")).toHaveCount(2);
});

test("a question shows related passages first", async ({ page }) => {
  await openSearch(page, "/search?q=what%20happens%20after%20death");
  const related = group(page, "Related passages");
  const exact = group(page, "Exact matches");
  await expect(related.locator(".result")).toHaveCount(5);
  await expect(exact.getByRole("heading")).toBeVisible();
  expect((await related.boundingBox())!.y).toBeLessThan((await exact.boundingBox())!.y);
});

test("a result links to its paragraph", async ({ page }) => {
  await openSearch(page, "/search?q=thought%20adjuster");
  const first = group(page, "Exact matches").locator(".result").first();
  const reference = (await first.locator("footer").evaluate((el) => el.firstChild?.textContent))!;
  const href = (await first.getAttribute("href"))!;
  expect(href).toMatch(new RegExp(`^/papers/paper-\\d+-[a-z0-9-]+#${reference.replace(".", "\\.")}$`));
});

test("all exact matches open as a list with pages", async ({ page }) => {
  await openSearch(page, "/search?q=thought%20adjuster");
  await page.getByRole("link", { name: /^All \d+ exact matches$/ }).click();
  await expect(page).toHaveURL("/search?q=thought%20adjuster&all=exact");
  await expect(page.locator(".result")).toHaveCount(20);
  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL("/search?q=thought%20adjuster&all=exact&page=2");
  await expect(page.locator(".result").first()).toBeVisible();
  await page.getByRole("link", { name: "Back to both groups" }).click();
  await expect(page).toHaveURL("/search?q=thought%20adjuster");
});

// Review Focus 2.
test("one failed search does not take the other group down", async ({ page }) => {
  await openSearch(page, "/search?q=fail%20related");
  await expect(group(page, "Related passages")).toContainText("The search did not load.");
  await expect(group(page, "Related passages").getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/search?q=fail%20related");
  await expect(group(page, "Exact matches")).toContainText("No paragraph has all of these words.");
});

test("a search with no result says so in each group", async ({ page }) => {
  await openSearch(page, "/search?q=zzzzqqqq");
  await expect(group(page, "Exact matches")).toContainText("No paragraph has all of these words.");
  await expect(group(page, "Related passages")).toContainText("No related passage.");
});

test("a search shows under Recent at the next visit, and Clear removes it", async ({ page }) => {
  await openSearch(page, "/search");
  await field(page).fill("thought adjuster");
  await page.getByRole("button", { name: "Search the Papers for “thought adjuster”" }).click();
  await expect(page).toHaveURL("/search?q=thought%20adjuster");
  await openSearch(page, "/search");
  const recent = group(page, "Recent");
  await expect(recent.getByRole("link", { name: "thought adjuster" })).toBeVisible();
  await recent.getByRole("button", { name: "Clear" }).click();
  await expect(group(page, "Ask in your own words")).toBeVisible();
});

test("the navigator field searches for text that is not a reference", async ({ page }) => {
  await page.goto(PAPER_1);
  await page.getByRole("button", { name: /Open the navigator/ }).click();
  const input = page.getByRole("textbox", { name: "Search, or go to a reference" });
  await input.fill("thought adjuster");
  await input.press("Enter");
  await expect(page).toHaveURL("/search?q=thought%20adjuster");
  await expect(group(page, "Exact matches").locator(".result")).toHaveCount(5);
});

// Review Focus 4.
test("a huge or hostile query is cut and shown as text", async ({ page }) => {
  await page.goto(`/search?q=${encodeURIComponent(`<img src=x onerror=alert(1)>${"x".repeat(5000)}`)}`);
  await expect(field(page)).toHaveValue(/^<img src=x/);
  const value = await field(page).inputValue();
  expect(value.length).toBe(200);
  expect(value.startsWith("<img src=x")).toBe(true);
  await expect(page.locator("img[src='x']")).toHaveCount(0);
  await expect(group(page, "Exact matches")).toContainText("No paragraph has all of these words.");
});

test("a results page is not for a search engine", async ({ page }) => {
  await openSearch(page, "/search?q=thought%20adjuster");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("the results column is centered with margins on a desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the column rule is a desktop rule");
  await openSearch(page, "/search?q=thought%20adjuster");
  const box = (await page.locator(".search-wrap.results").boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(641);
  expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(8);
});
