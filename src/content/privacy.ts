// The facts of the Privacy page, as lists. A new vendor or a new thing in the browser is one entry here.
// Each entry must be true of the code that is live. Change the date when the page changes.
export const PRIVACY_UPDATED = "October 19, 2026";
// The date of the page while a reader can sign in. See `accountsOn` in the page.
export const ACCOUNT_UPDATED = "October 12, 2026";
// The date of the page while a reader can turn on a notice. See `noticesOn` in the page.
export const NOTICES_UPDATED = "October 12, 2026";
// The date of the page while a reader can keep a streak. See `streaksOn` in the page.
export const STREAKS_UPDATED = "October 19, 2026";
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
  { name: "The paragraph where the voice stopped", why: "so the paper can offer to continue listening there" },
  { name: "The last page that you read in each world text", why: "so the page of that work can offer to continue there" },
  { name: "The papers, if you turn on Read offline", why: "so you can read with no connection; turn it off, and they leave the device" },
  { name: "The assistant that you chose, if you use Ask an assistant", why: "so the next question opens in the same one" },
  { name: "Your last five searches", why: "so you can run one again; the Clear control on the search page removes them" },
];

// With Spanish on (NEXT_PUBLIC_SPANISH): the language that the reader chose in the language sheet.
export const LANGUAGE_UPDATED = "October 24, 2026";
export const LANGUAGE_ITEM: BrowserItem = { name: "The language that you chose to read in", why: "so the site does not offer the other language again" };

// With Spanish on, the account also holds the language, so it follows the reader to each device.
export const ACCOUNT_LANGUAGE_ITEM = "The language that you chose to read in, and when you chose it";

// What an account holds for the Hub. Each entry is one thing that `src/account` writes.
export const ACCOUNT_ITEMS: readonly string[] = [
  "Your email address, and your name if your account has one",
  "The last place that you read",
  "Which paragraphs you read, and when",
  "The paragraphs that you saved",
  "Your notes",
];

// What PostHog receives while a reader can sign in. It takes the place of the PostHog entry above.
export const ACCOUNT_POSTHOG: Vendor = {
  name: "PostHog",
  purpose: "Analytics: which pages and features readers use.",
  receives: "An event for a page or an action, with your IP address. No cookie. While you are signed in, also a code that stands for your account: not your email address and not your name. Also the search records, which have no link to you.",
  policy: "https://posthog.com/privacy",
};

// The companies that handle the data of an account. They are in the table only while a reader can sign in.
export const ACCOUNT_VENDORS: readonly Vendor[] = [
  {
    name: "Supabase",
    purpose: "Holds the accounts, and what an account keeps.",
    receives: "Your email address, your name and picture if you sign in with Google, the last place that you read, which paragraphs you read, the paragraphs that you saved, and your notes.",
    policy: "https://supabase.com/privacy",
  },
  {
    name: "Resend",
    purpose: "Sends the email with the sign-in code.",
    receives: "Your email address and the code.",
    policy: "https://resend.com/legal/privacy-policy",
  },
  {
    name: "Google",
    purpose: "Signs you in, only if you choose “Continue with Google”.",
    receives: "That you signed in to UrantiaHub. Google gives us your email address, your name, and your picture.",
    policy: "https://policies.google.com/privacy",
  },
];

// What an account holds for the notices, while a reader can turn one on. Each entry is one thing
// that the notice routes of the API store.
export const NOTICE_ITEMS: readonly string[] = [
  "Which notices you turned on, and if each one goes by email, as a push, or both",
  "The hour of the daily passage, and your time zone",
  "For each device where you allowed notifications: its address at the push service of the browser, two keys that encrypt a push for that device, and a short name such as “Chrome on Android”",
  "A record of each notice that we sent you: which notice, for which day, and by email or to a device. We keep it for 90 days, so that no notice goes out two times",
];

// With the notices on, Resend also sends the emails that a reader chose.
export const NOTICE_RESEND: Vendor = {
  name: "Resend",
  purpose: "Sends the email with the sign-in code, and the notices that you chose to get by email.",
  receives: "Your email address, and the text of the email.",
  policy: "https://resend.com/legal/privacy-policy",
};

// What an account holds for the streak, while a reader can keep one. Each entry is one thing that
// `src/account/streak-data.ts` or the API stores.
export const STREAK_ITEMS: readonly string[] = [
  "If you keep a streak: each section that you finished, the day, and if you read it or listened to it",
  "Your streak settings: on or off, the sections a day, your time zone, the day that you started, and your longest streak",
  "If you keep a streak: the pages of the world texts that you finished, for the marks",
];

// What the browser keeps for the streak of a signed-in reader. The day log never goes to the account.
export const STREAK_BROWSER_ITEM: BrowserItem = {
  name: "The paragraphs that you read or heard today, while you are signed in",
  why: "so the site can tell when you finish a section for the streak; the next day replaces them, a sign-out removes them, and only a finished section goes to your account",
};

// What the browser keeps of the pages of the world texts. Only a finished page goes to the account.
export const STREAK_TEXT_ITEM: BrowserItem = {
  name: "The passages that you read on a page of a world text, while you are signed in and keep a streak",
  why: "so the site can tell when you finish the page for the marks; a finished page leaves them, a sign-out removes them, and only the finished page goes to your account",
};

// With the streak on, Supabase also holds the finished sections.
export const STREAK_SUPABASE_RECEIVES = "the sections that you finished each day, the pages of the world texts that you finished, your streak settings";
