import { GLOSSARY, type GlossaryEntry } from "./glossary";

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const startsUpper = (text: string) => /^[A-Z]/.test(text);

// Builds one search over each name and each other name. A term matches when its name stands in the text
// as whole words. The longest name wins where two overlap. A plain plural matches too.
export function createMatcher(entries: readonly GlossaryEntry[]): (text: string) => GlossaryEntry[] {
  // The form that the text can take, in lower case, to its entry. The first entry to claim a form keeps it.
  const byForm = new Map<string, { entry: GlossaryEntry; form: string }>();
  for (const entry of entries) {
    for (const form of [entry.name, ...entry.aliases]) {
      const clean = form.trim();
      if (clean !== "" && !byForm.has(clean.toLowerCase())) byForm.set(clean.toLowerCase(), { entry, form: clean });
    }
  }
  if (byForm.size === 0) return () => [];

  // Longest first: at one place in the text, the search then takes the longest name.
  const forms = [...byForm.keys()].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(?<![A-Za-z0-9])(${forms.map(escape).join("|")})(es|s)?(?![A-Za-z0-9])`, "gi");

  return (text) => {
    const found: GlossaryEntry[] = [];
    const seen = new Set<string>();
    for (const match of text.matchAll(pattern)) {
      const hit = byForm.get(match[1].toLowerCase());
      if (!hit || seen.has(hit.entry.id)) continue;
      // A name with a capital letter is a name only with its capital: "Son", not "son".
      if (startsUpper(hit.form) && !startsUpper(match[1])) continue;
      seen.add(hit.entry.id);
      found.push(hit.entry);
    }
    return found;
  };
}

let real: ((text: string) => GlossaryEntry[]) | null = null;

// The terms of the real glossary that stand in a text. The search is built one time, at the first use.
export function termsIn(text: string): GlossaryEntry[] {
  real ??= createMatcher(GLOSSARY);
  return real(text);
}
