// What changed in UrantiaHub, the newest first. Add an entry in the same change that ships a thing a
// reader can see. Each line must be true of the live site on that date.

import type { ReleasePictures } from "@/notices/send/mail";

// `notify`: readers who chose "New releases" get one notice of this entry. Mark a few in a year.
// `mail`: the email of the notice with pictures; its files stay in `public/email/` after the send.
export type Release = { date: string; title: string; changes: string[]; notify?: true; mail?: ReleasePictures };

export const RELEASES: Release[] = [
  {
    date: "2026-10-17",
    title: "A streak, an assistant, and more",
    changes: [
      "A streak: one section a day, about five minutes, with marks for papers, parts, and the tools of the Hub. It is off until you turn it on from your page.",
      "Ask an assistant: press a paragraph, then More, and your question opens in Claude, ChatGPT, Gemini, or Grok.",
      "The voice keeps playing with the screen off, to the end of the paper.",
      "Read offline: keep all 197 papers on your device.",
      "Share one sentence: the link shows the exact words.",
      "Your page: your progress, what you saved, and your notifications in one place.",
      "Elsewhere in the Papers: the parallels of a paragraph in other papers come first.",
      "On Android, the keyboard no longer covers the field of a note.",
    ],
    mail: {
      lead: "A streak to read a little each day, an assistant for any paragraph, and all 197 papers on your phone.",
      features: [
        { title: "A streak", line: "Read or listen to one section a day, about five minutes. Collect marks for papers, parts, and the tools of the Hub. Turn it on from your page.", image: "/email/release-2026-10-17/streak.png", alt: "The streak and the marks on the reader's page" },
        { title: "Ask an assistant", line: "Press a paragraph, then More. Your question opens in Claude, ChatGPT, Gemini, or Grok, ready to send.", image: "/email/release-2026-10-17/ask.png", alt: "The questions for an assistant about a paragraph" },
        { title: "Listen with the screen off", line: "The voice keeps playing when your phone is locked, to the end of the paper.", image: "/email/release-2026-10-17/listen.png", alt: "A paper with the voice playing" },
        { title: "Read offline", line: "One switch in the menu keeps all 197 papers on your device. Read with no connection.", image: "/email/release-2026-10-17/offline.png", alt: "A paper open with no connection" },
      ],
      also: [
        { title: "Share one sentence.", line: "The link shows the exact words." },
        { title: "Your page.", line: "Your progress, what you saved, and your notifications in one place." },
        { title: "Elsewhere in the Papers.", line: "The parallels of a paragraph in other papers come first." },
      ],
      video: { url: "https://www.youtube.com/watch?v=_y1Cme5eqeA", image: "/email/release-2026-10-17/video.png", line: "Watch the video · under one minute" },
    },
  },
  {
    date: "2026-10-11",
    title: "Notifications",
    changes: [
      "A passage each day, by email, on a device, or both, at the hour that you choose in your time zone.",
      "One reminder of your place after a week with no reading.",
      "Each one is off until you turn it on: the person button, then Notifications.",
      "The settings and the account are in the header of each page.",
    ],
  },
  {
    date: "2026-10-10",
    title: "The new UrantiaHub",
    changes: [
      "A new reader: one quiet page for each paper, with a light and a dark theme and a choice of text sizes.",
      "A new voice for each paragraph, and the page follows it.",
      "Search by the exact words and by the meaning.",
      "A glossary: the terms of each paragraph.",
      "Parallels: passages of the Papers and of nine other works that are near in meaning.",
      "Save a paragraph, write notes, and keep your place on each device.",
      "Make an image of a paragraph to share.",
      "A page of your progress, a page of resources, and this page.",
      "Not in this release: the AI chat, the Explore page, and the daily emails.",
    ],
  },
  {
    date: "2026-10-02",
    title: "Search, security, and speed",
    changes: ["The site can be installed on a phone.", "Better pages for search engines.", "The dark theme stays between visits."],
  },
  { date: "2025-05-16", title: "Community and resources", changes: ["A page of resources of the community."] },
  {
    date: "2025-01-25",
    title: "Notifications and listening",
    changes: ["Email settings: releases, a reminder to continue, and a daily quote.", "A link to listen on Spotify.", "A button to copy the text of a paragraph."],
  },
  {
    date: "2025-01-18",
    title: "Launch",
    changes: ["A reader with audio.", "Progress, notes, and bookmarks.", "A dark theme.", "Search with tips and recent searches."],
  },
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "2026-10-10" as "October 10, 2026". No clock and no time zone has a part in it.
export function releaseDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

const NOTIFY_DAYS = 4;

// The marked release that readers hear of now: from its date (UTC) and for three days after, so a
// reader in each time zone gets it in the day. Null: none.
export function releaseToNotify(now: Date, list: readonly Release[] = RELEASES): Release | null {
  const marked = list.find((release) => release.notify);
  if (!marked) return null;
  const start = Date.parse(`${marked.date}T00:00:00Z`);
  const age = now.getTime() - start;
  return Number.isFinite(start) && age >= 0 && age < NOTIFY_DAYS * 86_400_000 ? marked : null;
}
