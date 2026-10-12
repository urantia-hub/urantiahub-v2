import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AboutPage from "@/app/about/page";
import NotFound from "@/app/not-found";
import PrivacyPage from "@/app/privacy/page";
import ReleasesPage from "@/app/releases/page";
import ResourcesPage from "@/app/resources/page";
import { RELEASES, releaseDate } from "@/content/releases";
import { RESOURCE_GROUPS } from "@/content/resources";
import { ACCOUNT_ITEMS, ACCOUNT_UPDATED, ACCOUNT_VENDORS, BROWSER_ITEMS, NOTICE_ITEMS, NOTICES_UPDATED, PRIVACY_EMAIL, PRIVACY_UPDATED, VENDORS } from "@/content/privacy";

describe("About", () => {
  it("states the facts and the independence of the project", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
    expect(screen.getByText(/first published in 1955 as The Urantia Book/)).toBeInTheDocument();
    expect(screen.getByText(/not affiliated with Urantia Foundation/)).toBeInTheDocument();
    expect(screen.getByText(/Michael Foundation v\. Urantia Foundation/)).toBeInTheDocument();
  });

  it("links to the narration on Spotify", () => {
    render(<AboutPage />);
    expect(screen.getByRole("link", { name: "listen on Spotify" })).toHaveAttribute("href", "https://open.spotify.com/show/7IDP6RsZbKtUjfEwLLHtuw");
  });

  it("makes no claim about the text", () => {
    const { container } = render(<AboutPage />);
    expect(container.textContent).not.toMatch(/revelation|revealed|truth|divine|inspired|groundbreaking|revolutionary/i);
  });
});

// The page states what is true of the live site. Accounts are on or off by one setting, so the page
// says nothing of accounts while they are off, and states each fact of them when they are on.
describe("Privacy, about accounts", () => {
  const text = () => render(<PrivacyPage />).container.textContent ?? "";
  afterEach(() => vi.unstubAllEnvs());

  it("says nothing of a sign-in while the sign-in is off", () => {
    vi.stubEnv("NEXT_PUBLIC_SIGN_IN", "");
    const page = text();
    expect(page).not.toMatch(/sign in|signed in|UrantiaHub account/i);
    expect(page).toContain("accounts, saved places, and notes are planned");
    expect(page).toContain(PRIVACY_UPDATED);
  });

  it("states what an account holds, the cookies, the companies, and the way to delete it", () => {
    vi.stubEnv("NEXT_PUBLIC_SIGN_IN", "on");
    const page = text();
    expect(page).toContain(ACCOUNT_UPDATED);
    expect(page).toContain("An account is optional");
    for (const item of ACCOUNT_ITEMS) expect(page).toContain(item);
    for (const vendor of ACCOUNT_VENDORS) expect(page).toContain(vendor.name);
    expect(page).toMatch(/One cookie holds your sign-in/);
    // Each thing that the code writes to the account is named, and each thing that it keeps in the browser.
    expect(page).toContain("Which paragraphs you read");
    expect(page).toContain("The paragraphs that you saved");
    expect(page).toContain("Your notes");
    expect(page).toMatch(/the place and the paragraphs that you read also go to your account\. The theme and the text size never leave the device/);
    expect(page).toMatch(/a mark that says which account/i);
    expect(page).toMatch(/remembers that you signed out/);
    expect(page).not.toContain("keeps no identifier in your browser");
    // A signed-in reader has a name in the analytics. The page says what it is and what it is not.
    expect(page).toContain("a code that stands for your account");
    expect(page).not.toContain("with no cookie and no identifier");
    expect(page).not.toContain("No cookie and no identifier.");
    expect(page).toMatch(/delete the account/);
    expect(page).toContain("accounts.urantiahub.com");
    // The old promise is not true any more for a signed-in reader.
    expect(page).not.toContain("They do not leave your device.");
    expect(page).not.toContain("accounts, saved places, and notes are planned");
    expect(page).toMatch(/You can read and listen with no account/);
  });
});

// The notices are on or off by one setting. The page names what a notice stores only while a reader
// can turn one on, and each statement must be true of the code.
describe("Privacy, about notices", () => {
  const text = () => render(<PrivacyPage />).container.textContent ?? "";
  afterEach(() => vi.unstubAllEnvs());

  it("says nothing of notices while they are off, or while the sign-in is off", () => {
    vi.stubEnv("NEXT_PUBLIC_SIGN_IN", "on");
    vi.stubEnv("NEXT_PUBLIC_NOTICES", "");
    expect(text()).not.toMatch(/notice|push service/i);
    expect(text()).toContain(ACCOUNT_UPDATED);
    vi.stubEnv("NEXT_PUBLIC_SIGN_IN", "");
    vi.stubEnv("NEXT_PUBLIC_NOTICES", "on");
    expect(text()).not.toMatch(/notice|push service/i);
  });

  it("names what a notice stores, the email and the device rules, and the way to turn each one off", () => {
    vi.stubEnv("NEXT_PUBLIC_SIGN_IN", "on");
    vi.stubEnv("NEXT_PUBLIC_NOTICES", "on");
    const page = text();
    expect(page).toContain(`Last updated: ${NOTICES_UPDATED}`);
    for (const item of NOTICE_ITEMS) expect(page).toContain(item);
    expect(page).toMatch(/Each one is off until you turn it on/);
    expect(page).toMatch(/loads no picture and has no tracking link/);
    expect(page).toMatch(/turns that email off with one press and no sign-in/);
    expect(page).toMatch(/Google for Chrome, Apple for Safari,\s+Mozilla for Firefox/);
    expect(page).toMatch(/encrypted for your device/);
    expect(page).toMatch(/A push goes to each\s+device where you are signed in and allowed notifications/);
    expect(page).toMatch(/A push\s+shows only while you are signed in on that device/);
    expect(page).toMatch(/When you sign out on a device, we remove that device\s+from your account/);
    expect(page).toMatch(/We keep it for 90 days/);
    expect(page).toMatch(/When you delete the account, we delete all of this/);
  });

  it("says in the table that Resend also sends the notices, in one row", () => {
    vi.stubEnv("NEXT_PUBLIC_SIGN_IN", "on");
    vi.stubEnv("NEXT_PUBLIC_NOTICES", "on");
    render(<PrivacyPage />);
    const rows = screen.getAllByRole("row", { name: /^Resend/ });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("the notices that you chose to get by email");
  });
});

describe("Privacy", () => {
  const text = () => render(<PrivacyPage />).container.textContent ?? "";

  it("has a date, a short version, and a contact address for privacy", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(`Last updated: ${PRIVACY_UPDATED}`)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The short version" })).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: PRIVACY_EMAIL })) expect(link).toHaveAttribute("href", `mailto:${PRIVACY_EMAIL}`);
    expect(PRIVACY_EMAIL).toBe("privacy@urantiahub.com");
  });

  it("names the company that runs the site", () => {
    expect(text()).toMatch(/Adams Technologies LLC runs UrantiaHub\. On this page, “we” means Adams Technologies LLC\./);
  });

  it("has one row for each company that handles data for the site, from one list", () => {
    render(<PrivacyPage />);
    const table = screen.getByRole("table", { name: "Companies that handle data for UrantiaHub" });
    expect(within(table).getAllByRole("row")).toHaveLength(VENDORS.length + 1);
    for (const vendor of VENDORS) {
      const row = within(table).getByRole("row", { name: new RegExp(`^${vendor.name}`) });
      expect(row).toHaveTextContent(vendor.purpose);
      expect(row).toHaveTextContent(vendor.receives);
      expect(within(row).getByRole("link", { name: `${vendor.name} privacy policy` })).toHaveAttribute("href", vendor.policy);
    }
    expect(VENDORS.map((v) => v.name)).toEqual(["Vercel", "PostHog", "Cloudflare", "OpenAI"]);
  });

  it("names each thing that stays in the browser, from one list", () => {
    const page = text();
    expect(BROWSER_ITEMS.length).toBe(6);
    for (const item of BROWSER_ITEMS) expect(page).toContain(item.name);
  });

  it("says what a search records, where its words go, and that the record has no link to the reader", () => {
    const page = text();
    expect(page).toMatch(/records the words of the search/);
    expect(page).toMatch(/no link to you/);
    expect(page).toMatch(/OpenAI/);
    expect(page).toMatch(/log of each request/);
  });

  it("states the choice of the reader, and promises it for analytics only", () => {
    const page = text();
    expect(page).toMatch(/Do Not Track or a Global Privacy Control signal/);
    expect(page).toMatch(/sends no analytics event and makes no record of your searches in its analytics/);
  });

  it("makes no promise that the site cannot keep", () => {
    const page = text();
    expect(page).not.toMatch(/no text that you read or type/);
    expect(page).not.toMatch(/no time of day/);
    expect(page).not.toMatch(/Sentry|error report/i);
    expect(page).not.toMatch(/we never|100%|guarantee/i);
  });

  it("says that the page will change, and how a reader learns of it", () => {
    expect(text()).toMatch(/When this page changes, the date at the top changes/);
  });
});

describe("NotFound", () => {
  it("offers the contents page", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: "All papers" })).toHaveAttribute("href", "/papers");
  });
});

const CLAIM = /revelation|revealed|\btruth\b|divine origin|inspired by God|groundbreaking|revolutionary|largest|oldest|official|best/i;

describe("Resources", () => {
  it("puts the places that UrantiaHub's makers run first, and says which group that is", () => {
    render(<ResourcesPage />);
    expect(RESOURCE_GROUPS[0].ours).toBe(true);
    expect(RESOURCE_GROUPS.filter((group) => group.ours)).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent("By the maker of UrantiaHub");
    expect(screen.getByText(/UrantiaHub runs only the first group/)).toBeInTheDocument();
    expect(RESOURCE_GROUPS[0].resources.map((r) => r.name)).toEqual(["The Papers in an AI assistant", "UrantiaHub on YouTube", "The Urantia Papers on Spotify", "urantia.dev", "Dalamatia"]);
  });

  it("has one link for each resource, which opens in a new tab and says so", () => {
    const { container } = render(<ResourcesPage />);
    const all = RESOURCE_GROUPS.flatMap((group) => group.resources);
    expect(new Set(all.map((r) => r.url)).size).toBe(all.length);
    expect(screen.getAllByRole("link")).toHaveLength(all.length);
    for (const resource of all) {
      const link = container.querySelector(`a[href="${resource.url}"]`);
      expect(link).toHaveTextContent(resource.name);
      expect(link).toHaveTextContent("(opens in a new tab)");
      expect(link).toHaveAttribute("target", "_blank");
      expect(resource.url).toMatch(/^https:\/\//);
    }
  });

  it("makes no claim about the text or about a place, and names the Papers as the site does", () => {
    for (const resource of RESOURCE_GROUPS.flatMap((group) => group.resources)) {
      expect(resource.about).not.toMatch(CLAIM);
      expect(resource.about).not.toMatch(/The Urantia Papers|Urantia Book(?! since)/);
      expect(resource.about).toMatch(/\.$/);
    }
  });
});

describe("Releases", () => {
  it("shows each release, the newest first, with its date in words", () => {
    render(<ReleasesPage />);
    const dates = RELEASES.map((release) => release.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(RELEASES.map((release) => release.title));
    expect(screen.getByText("October 10, 2026")).toHaveAttribute("datetime", "2026-10-10");
    expect(releaseDate("2025-01-18")).toBe("January 18, 2025");
  });

  it("makes no claim about the text", () => {
    for (const change of RELEASES.flatMap((release) => release.changes)) expect(change).not.toMatch(CLAIM);
  });
});
