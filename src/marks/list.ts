// The 30 marks of the streak, in four tiers. The ids are stable: a later public profile shows them.
// A time is the reading at 100 words a minute; `list.test.ts` computes each one again from the index.

export type Tier = 1 | 2 | 3 | 4;
export type MarkRule =
  | { kind: "first-section" }
  | { kind: "first-listen" }
  | { kind: "tool" }
  | { kind: "papers"; count: number }
  | { kind: "part"; partId: string }
  | { kind: "streak"; days: number };
export type Mark = { id: string; tier: Tier; symbol: string; name: string; effort: string; rule: MarkRule };

export const TIERS: { tier: Tier; name: string; line: string }[] = [
  { tier: 1, name: "Ribbon", line: "a few minutes each" },
  { tier: 2, name: "Silk", line: "hours, or a week" },
  { tier: 3, name: "Gilt", line: "dozens of hours" },
  { tier: 4, name: "Illuminated", line: "the rarest" },
];

const tool = (id: string, symbol: string, name: string, effort = "1 min"): Mark => ({ id, tier: 1, symbol, name, effort, rule: { kind: "tool" } });
const papers = (count: number, tier: Tier, effort: string): Mark => ({ id: `papers-${count}`, tier, symbol: String(count), name: count === 1 ? "1 paper" : `${count} papers`, effort, rule: { kind: "papers", count } });
const part = (partId: string, numeral: string, effort: string): Mark => ({ id: `part-${partId}`, tier: 3, symbol: numeral, name: `Part ${numeral}`, effort, rule: { kind: "part", partId } });
const streak = (days: number, tier: Tier, effort: string): Mark => ({ id: `streak-${days}`, tier, symbol: String(days), name: `${days}-day streak`, effort, rule: { kind: "streak", days } });

export const MARKS: readonly Mark[] = [
  { id: "first-section", tier: 1, symbol: "sec", name: "First section", effort: "5 min", rule: { kind: "first-section" } },
  { id: "first-listen", tier: 1, symbol: "listen", name: "First listen", effort: "5 min", rule: { kind: "first-listen" } },
  tool("search", "search", "Search"),
  tool("parallels", "par", "Parallels"),
  tool("terms", "terms", "Terms"),
  tool("note", "note", "First note"),
  tool("image", "img", "Image", "2 min"),
  tool("share", "share", "First share"),
  papers(1, 2, "about 1 hour"),
  { id: "foreword", tier: 2, symbol: "book", name: "Foreword", effort: "about 1 hour", rule: { kind: "part", partId: "0" } },
  papers(5, 2, "about 5 hours"),
  papers(10, 2, "about 9 hours"),
  streak(7, 2, "a week"),
  papers(20, 3, "about 18 hours"),
  papers(30, 3, "about 28 hours"),
  papers(40, 3, "about 37 hours"),
  papers(50, 3, "about 46 hours"),
  papers(75, 3, "about 69 hours"),
  papers(100, 3, "about 92 hours"),
  papers(125, 3, "about 115 hours"),
  papers(150, 3, "about 138 hours"),
  papers(175, 3, "about 161 hours"),
  part("1", "I", "about 28 hours"),
  part("2", "II", "about 24 hours"),
  part("3", "III", "about 55 hours"),
  part("4", "IV", "about 73 hours"),
  streak(30, 3, "a month"),
  streak(100, 3, "3 months"),
  { id: "book", tier: 4, symbol: "197", name: "The whole book", effort: "all 197 papers · about 181 hours", rule: { kind: "papers", count: 197 } },
  streak(365, 4, "a year of days"),
];

export const TOOL_MARKS = MARKS.filter((mark) => mark.rule.kind === "tool").map((mark) => mark.id);
export const markById = (id: string): Mark | undefined => MARKS.find((mark) => mark.id === id);
