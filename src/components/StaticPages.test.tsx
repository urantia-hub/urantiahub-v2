import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "@/app/about/page";
import NotFound from "@/app/not-found";
import PrivacyPage from "@/app/privacy/page";
import { BROWSER_ITEMS, PRIVACY_EMAIL, PRIVACY_UPDATED, VENDORS } from "@/content/privacy";

describe("About", () => {
  it("states the facts and the independence of the project", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
    expect(screen.getByText(/first published in 1955 as The Urantia Book/)).toBeInTheDocument();
    expect(screen.getByText(/not affiliated with Urantia Foundation/)).toBeInTheDocument();
    expect(screen.getByText(/Michael Foundation v\. Urantia Foundation/)).toBeInTheDocument();
  });

  it("makes no claim about the text", () => {
    const { container } = render(<AboutPage />);
    expect(container.textContent).not.toMatch(/revelation|revealed|truth|divine|inspired|groundbreaking|revolutionary/i);
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
    expect(BROWSER_ITEMS.length).toBe(4);
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
