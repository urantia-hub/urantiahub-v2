// The facts of the Privacy page, as lists. A new vendor or a new thing in the browser is one entry here.
// Each entry must be true of the code that is live. Change the date when the page changes.
export const PRIVACY_UPDATED = "October 8, 2026";
export const PRIVACY_EMAIL = "privacy@urantiahub.com";
// The company that runs the site. Kelson gave this name on 2026-10-08.
export const PRIVACY_OPERATOR = "Adams Technologies LLC";

export type Vendor = { name: string; purpose: string; receives: string; policy: string };

// Each company that handles data for the site: what it does for us, and what it receives.
export const VENDORS: readonly Vendor[] = [
  {
    name: "Vercel",
    purpose: "Hosts the site.",
    receives: "Each request to the site: your IP address, the page address, the time, and your browser type.",
    policy: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "PostHog",
    purpose: "Analytics: which pages and features readers use.",
    receives: "An event for a page or an action, with your IP address. No cookie and no identifier. Also the search records, which have no link to you.",
    policy: "https://posthog.com/privacy",
  },
  {
    name: "Cloudflare",
    purpose: "Serves the audio files, and runs the content service that holds the text.",
    receives: "Your IP address when your browser loads an audio file. The words of a search, from our server.",
    policy: "https://www.cloudflare.com/privacypolicy/",
  },
  {
    name: "OpenAI",
    purpose: "Compares the meaning of a search with the text, for the related passages.",
    receives: "The words of a search, from the content service. Nothing about you.",
    policy: "https://openai.com/policies/privacy-policy/",
  },
];

export type BrowserItem = { name: string; why: string };

// What the site keeps in your browser. None of it leaves your device.
export const BROWSER_ITEMS: readonly BrowserItem[] = [
  { name: "Your theme", why: "so the page opens light or dark, as you chose" },
  { name: "Your text size", why: "so a paper opens at the size that you chose" },
  { name: "The last place that you read", why: "so the contents page can offer to continue there" },
  { name: "Your last five searches", why: "so you can run one again; the Clear control on the search page removes them" },
];
