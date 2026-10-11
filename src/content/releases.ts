// What changed in UrantiaHub, the newest first. Add an entry in the same change that ships a thing a
// reader can see. Each line must be true of the live site on that date.

export type Release = { date: string; title: string; changes: string[] };

export const RELEASES: Release[] = [
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
