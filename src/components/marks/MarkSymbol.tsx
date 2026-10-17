import { useId } from "react";
import type { Tier } from "@/marks/list";

// The symbol of a mark: a bookmark in the look of its tier (mock streaks-and-marks.html), with a line
// glyph or a number. The gold and the deep blue belong to the marks only.
const SHAPE = "M6 3h48v64l-24-14-24 14z";
const GLYPHS: Record<string, React.ReactNode> = {
  sec: <path d="M20 22h20M20 29h20M20 36h13" />,
  listen: (
    <>
      <path d="M20 26v9h5l7 6V20l-7 6z" />
      <path d="M36 25a7 7 0 0 1 0 11" />
    </>
  ),
  search: (
    <>
      <circle cx="28" cy="28" r="7" />
      <path d="M33 33l6 6" />
    </>
  ),
  par: <path d="M21 20v20M39 20v20M25 30h10" />,
  note: <path d="M22 39l14-14 3 3-14 14h-3z" />,
  img: (
    <>
      <rect x="20" y="21" width="20" height="17" rx="2" />
      <path d="M21 36l6-7 5 5 3-3 5 5" />
    </>
  ),
  share: <path d="M30 20v14M24 26l6-6 6 6M22 31v8h16v-8" />,
  book: <path d="M30 24c-4-3-8-3-11-2v16c3-1 7-1 11 2 4-3 8-3 11-2V22c-3-1-7-1-11 2zM30 24v16" />,
};

function Glyph({ symbol, fill }: { symbol: string; fill: string }) {
  if (symbol === "terms")
    return (
      <text x="30" y="35" className="mark-text" fill={fill} stroke="none" style={{ fontSize: 15 }}>
        Aa
      </text>
    );
  const glyph = GLYPHS[symbol];
  if (glyph) return <>{glyph}</>;
  const size = symbol.length > 3 ? 11 : symbol.length > 2 ? 13 : 15;
  return (
    <text x="30" y={symbol.length > 2 ? 35 : 36} className="mark-text" fill={fill} stroke="none" style={{ fontSize: size }}>
      {symbol}
    </text>
  );
}

type Look = { full: string; faint: string; edge: string | null; edgeWidth: number; ink: string; text: string };
const LOOKS: Record<Tier, (gold: string) => Look> = {
  1: () => ({ full: "var(--raised)", faint: "var(--raised)", edge: "var(--ink)", edgeWidth: 2, ink: "var(--ink)", text: "var(--ink)" }),
  2: () => ({ full: "var(--voice-line)", faint: "color-mix(in srgb, var(--voice-line) 20%, transparent)", edge: null, edgeWidth: 0, ink: "#fff", text: "#fff" }),
  3: (gold) => ({ full: "#2a2620", faint: "#2a262044", edge: `url(#${gold})`, edgeWidth: 3.2, ink: `url(#${gold})`, text: "#e7c873" }),
  4: (gold) => ({ full: "#24245e", faint: "#24245e44", edge: `url(#${gold})`, edgeWidth: 3.4, ink: `url(#${gold})`, text: "#e9c867" }),
};
const STOPS: Record<3 | 4, [string, string, string]> = { 3: ["#f3dc8f", "#c9a24a", "#8a6420"], 4: ["#fbe9a8", "#d4a843", "#8a6420"] };

// `moment`: the parts that the moment of a new mark moves: a fill that rises inside the shape, an edge
// that draws itself, and the star. Without it the symbol is still.
export function MarkSymbol({ tier, symbol, moment = false, className }: { tier: Tier; symbol: string; moment?: boolean; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gold = `gold-${id}`;
  const clip = `clip-${id}`;
  const look = LOOKS[tier](gold);
  // A Ribbon mark fills with the yellow of the page as its ink arrives.
  const fill = tier === 1 ? "var(--mark)" : look.full;
  return (
    <svg viewBox="0 0 60 72" className={`mark-symbol tier-${tier}${className ? ` ${className}` : ""}`} aria-hidden="true">
      <defs>
        {tier >= 3 && (
          <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
            {STOPS[tier as 3 | 4].map((color, i) => (
              <stop key={color} offset={i / 2} stopColor={color} />
            ))}
          </linearGradient>
        )}
        {moment && (
          <clipPath id={clip}>
            <path d={SHAPE} />
          </clipPath>
        )}
      </defs>
      <path d={SHAPE} fill={moment ? look.faint : look.full} />
      {moment && (
        <g clipPath={`url(#${clip})`}>
          <rect className="mark-fill" x="0" y="0" width="60" height="72" fill={fill} />
        </g>
      )}
      {look.edge && <path className="mark-edge" d={SHAPE} fill="none" stroke={look.edge} strokeWidth={look.edgeWidth} strokeLinejoin="round" pathLength={1} />}
      {tier === 2 && <path d="M10 7h40v54l-20-11.5L10 61z" fill="none" stroke="#ffffff88" strokeWidth="1.2" strokeDasharray="3 2.5" />}
      {tier === 3 && <path d="M11 8h38v52l-19-11-19 11z" fill="none" stroke="#c9a24a66" strokeWidth="1" />}
      {tier === 4 && (
        <>
          <path d="M11 8h38v51l-19-11-19 11z" fill="none" stroke={`url(#${gold})`} strokeWidth="1.2" />
          <g fill="#d4a843">
            <circle cx="15" cy="13" r="1.6" />
            <circle cx="45" cy="13" r="1.6" />
            <circle cx="15" cy="50" r="1.2" />
            <circle cx="45" cy="50" r="1.2" />
            <path className="mark-star" d="M30 9l1.6 3.2 3.4.5-2.5 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4-2.5-2.4 3.4-.5z" />
          </g>
        </>
      )}
      <g className="mark-glyph" fill="none" stroke={look.ink} strokeWidth={tier === 1 ? 2 : 2.2} strokeLinecap="round" strokeLinejoin="round">
        <Glyph symbol={symbol} fill={look.text} />
      </g>
    </svg>
  );
}
