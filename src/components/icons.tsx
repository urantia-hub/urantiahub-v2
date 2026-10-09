// The Hub's icons, family B. One 24 by 24 grid.
// Player icons are solid. Solid means the voice.
// Tool icons are a line of 1.9 with round ends. A line means an action.
// Check each new icon on one sheet with the full set: two icons can look alike.
const SOLID = {
  play: ["M8 5v14l11-7z"],
  pause: ["M7 5h3.8v14H7z", "M13.2 5H17v14h-3.8z"],
  previous: ["M6 6h2.2v12H6z", "M20 6v12l-9.5-6z"],
  next: ["M15.8 6H18v12h-2.2z", "M4 6l9.5 6L4 18z"],
  // The one solid icon that is not the voice: a paragraph that the reader saved.
  saved: ["M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"],
} as const;

const LINE = {
  share: ["M12 15V4", "M8 7.5l4-4 4 4", "M6 11v7.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V11"],
  close: ["M6.5 6.5l11 11", "M17.5 6.5l-11 11"],
  // A ribbon: save this paragraph.
  save: ["M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"],
  // A pen: the reader's notes on a paragraph.
  note: ["M5 19l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L9 18l-4 1z", "M14.5 6.5l3 3"],
  more: ["M6 12h.01", "M12 12h.01", "M18 12h.01"],
  copy: ["M10 8h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z", "M5 15V6a1 1 0 0 1 1-1h9"],
  paperBefore: ["M14.5 6l-6 6 6 6"],
  paperAfter: ["M9.5 6l6 6-6 6"],
  back: ["M19 12H5", "M11 6l-6 6 6 6"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7.5V12l3 2"],
  question: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7", "M12 16.5h.01"],
  page: ["M7 3.5h7.5L19 8v10.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 7 3.5z"],
  // An open book: the glossary terms of a paragraph.
  terms: ["M12 6.5C9.5 4.9 6.9 4.6 4 5.5V18c2.9-.9 5.5-.6 8 1", "M12 6.5c2.5-1.6 5.1-1.9 8-1V18c-2.9-.9-5.5-.6-8 1z"],
  // Three sliders: the settings of the reader.
  settings: ["M4 7h9", "M17 7h3", "M4 12h3", "M11 12h9", "M4 17h11", "M19 17h1", "M17 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0z", "M11 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z", "M19 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"],
  search: ["M17.5 11a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z", "M16 16l4 4"],
  list: ["M8.5 7h11", "M8.5 12h11", "M8.5 17h11", "M4.5 7h.01", "M4.5 12h.01", "M4.5 17h.01"],
  // A person: the reader's account.
  person: ["M15.5 8.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z", "M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"],
  // An arrow out of a box: the link opens another site.
  external: ["M14 5h5v5", "M19 5l-8 8", "M11 7H6v11h11v-5"],
  // An arrow out of a door.
  signOut: ["M10 5H6v14h4", "M14 8l4 4-4 4", "M18 12h-8"],
  moon: ["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"],
  sun: ["M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z", "M12 3v2", "M12 19v2", "M3 12h2", "M19 12h2", "M5.6 5.6l1.4 1.4", "M17 17l1.4 1.4", "M5.6 18.4l1.4-1.4", "M17 7l1.4-1.4"],
} as const;

export type IconName = keyof typeof SOLID | keyof typeof LINE;

export function Icon({ name }: { name: IconName }) {
  const solid = name in SOLID;
  const paths: readonly string[] = solid ? SOLID[name as keyof typeof SOLID] : LINE[name as keyof typeof LINE];
  const paint = solid
    ? { fill: "currentColor" }
    : { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...paint}>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
