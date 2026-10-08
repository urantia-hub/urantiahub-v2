import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "@/app/about/page";
import NotFound from "@/app/not-found";
import PrivacyPage from "@/app/privacy/page";

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
  it("names the one provider and the contact address", () => {
    const { container } = render(<PrivacyPage />);
    expect(screen.getAllByText(/PostHog/).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/Sentry|error report/i);
    expect(screen.getByRole("link", { name: "team@urantiahub.com" })).toHaveAttribute(
      "href",
      "mailto:team@urantiahub.com",
    );
  });
});

describe("Privacy and search", () => {
  it("says what a search records, and that the record has no link to the reader", () => {
    const { container } = render(<PrivacyPage />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/records the words of the search/);
    expect(text).toMatch(/no link to you/);
    expect(text).toMatch(/last five searches/);
    expect(text).toMatch(/last place that you read/);
    // The old promise is no longer true as written.
    expect(text).not.toMatch(/no text that you read or type/);
  });
});

describe("Privacy and the theme choice", () => {
  it("says that the theme choice stays in the browser", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/keeps three things in your browser: your theme choice/)).toBeInTheDocument();
  });
});

describe("NotFound", () => {
  it("offers the contents page", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: "All papers" })).toHaveAttribute("href", "/papers");
  });
});
