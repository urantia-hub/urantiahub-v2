// The Hub's icons, family B. One 24 by 24 grid.
// Player icons are solid. Solid means the voice.
// Tool icons are a line of 1.9 with round ends. A line means an action.
// Check each new icon on one sheet with the full set: two icons can look alike.
const SOLID = {
  play: ["M8 5v14l11-7z"],
  pause: ["M7 5h3.8v14H7z", "M13.2 5H17v14h-3.8z"],
  previous: ["M6 6h2.2v12H6z", "M20 6v12l-9.5-6z"],
  next: ["M15.8 6H18v12h-2.2z", "M4 6l9.5 6L4 18z"],
} as const;

const LINE = {
  share: ["M12 15V4", "M8 7.5l4-4 4 4", "M6 11v7.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V11"],
  close: ["M6.5 6.5l11 11", "M17.5 6.5l-11 11"],
  paperBefore: ["M14.5 6l-6 6 6 6"],
  paperAfter: ["M9.5 6l6 6-6 6"],
  search: ["M17.5 11a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z", "M16 16l4 4"],
  list: ["M8.5 7h11", "M8.5 12h11", "M8.5 17h11", "M4.5 7h.01", "M4.5 12h.01", "M4.5 17h.01"],
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
