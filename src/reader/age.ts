// How long ago, in the words of a reader: "today", "yesterday", "3 days ago", "last month".
const DAY = 86_400_000;
const words = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function age(at: string, now: number = Date.now()): string {
  const then = Date.parse(at);
  if (!Number.isFinite(then)) return "";
  const days = Math.max(0, Math.floor((now - then) / DAY));
  if (days < 7) return words.format(-days, "day");
  if (days < 30) return words.format(-Math.floor(days / 7), "week");
  if (days < 365) return words.format(-Math.floor(days / 30), "month");
  return words.format(-Math.floor(days / 365), "year");
}
