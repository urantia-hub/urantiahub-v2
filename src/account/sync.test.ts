import { beforeEach, describe, expect, it } from "vitest";
import { LAST_READ_KEY } from "@/reader/last-read";
import { ACCOUNT_DATA_KEY, forgetAccountData, markAccountData, SETTINGS_AT_KEY } from "./sync";

beforeEach(() => window.localStorage.clear());

// A second person can sign in on the same browser. What the first person read must not go into the
// second person's account, and must not show on the page after a sign-out.
describe("what a signed-in reader leaves in the browser", () => {
  const place = JSON.stringify({ paperId: "5", sectionId: "1", label: null, at: 100 });

  it("is removed when the reader is signed out: the place, and the time of the settings", () => {
    window.localStorage.setItem(LAST_READ_KEY, place);
    window.localStorage.setItem(SETTINGS_AT_KEY, "200");
    window.localStorage.setItem("theme", "dark");
    markAccountData();
    forgetAccountData();
    expect(window.localStorage.getItem(LAST_READ_KEY)).toBeNull();
    expect(window.localStorage.getItem(SETTINGS_AT_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACCOUNT_DATA_KEY)).toBeNull();
    // The theme is not personal. It stays, so the page does not flash.
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });

  it("stays for a reader who never signed in", () => {
    window.localStorage.setItem(LAST_READ_KEY, place);
    forgetAccountData();
    expect(window.localStorage.getItem(LAST_READ_KEY)).toBe(place);
  });
});
