import { GLOSSARY, type GlossaryEntry } from "./glossary";

type Form = { text: string; lower: string; entry: GlossaryEntry };

const isWordChar = (char: string | undefined) => char !== undefined && /[A-Za-z0-9]/.test(char);
const hasUpper = (text: string) => /[A-Z]/.test(text);
// Another name of an entry counts only if it reads as a name: it has a capital letter or more than one word.
// The glossary gives "worlds" as another name of "Melchizedek worlds", and "parable" for one parable.
const readsAsName = (text: string) => hasUpper(text) || /\s/.test(text);
const firstWord = (text: string) => /[A-Za-z0-9]+/.exec(text)?.[0].toLowerCase() ?? "";

// Builds one search over each name and each other name. A term matches when its name stands in the text
// as whole words. The longest name wins where two overlap. A plain plural matches too.
// The names are kept by their first word, so a text is read one time, word by word. One large pattern
// for 4,456 names took 8 seconds to build.
export function createMatcher(entries: readonly GlossaryEntry[]): (text: string) => GlossaryEntry[] {
  const byFirstWord = new Map<string, Form[]>();
  const claimed = new Set<string>();
  for (const entry of entries) {
    for (const raw of [entry.name, ...entry.aliases.filter(readsAsName)]) {
      const text = raw.trim();
      // An entry such as "7" would match each number in a list.
      if (/^\d+$/.test(text)) continue;
      const lower = text.toLowerCase();
      const key = firstWord(text);
      // The first entry to claim a form keeps it.
      if (text === "" || key === "" || claimed.has(lower)) continue;
      claimed.add(lower);
      byFirstWord.set(key, [...(byFirstWord.get(key) ?? []), { text, lower, entry }]);
    }
  }
  // Longest first: at one place in the text, the search then takes the longest name.
  for (const forms of byFirstWord.values()) forms.sort((a, b) => b.lower.length - a.lower.length);

  // The end of a form at this place in the text, or -1. A plain plural can follow, and then no word character.
  function endOf(form: Form, text: string, lowerText: string, at: number): number {
    if (!lowerText.startsWith(form.lower, at)) return -1;
    // A name with capitals is a name only with the same capitals: "Son", not "son"; "I AM", not "I am".
    if (hasUpper(form.text) && !text.startsWith(form.text, at)) return -1;
    const end = at + form.lower.length;
    for (const plural of ["es", "s", ""]) {
      if (lowerText.startsWith(plural, end) && !isWordChar(text[end + plural.length])) return end + plural.length;
    }
    return -1;
  }

  return (text) => {
    const found: GlossaryEntry[] = [];
    const seen = new Set<string>();
    const lowerText = text.toLowerCase();
    let at = 0;
    while (at < text.length) {
      // Go to the start of the next word.
      if (!isWordChar(text[at]) || isWordChar(text[at - 1])) {
        at += 1;
        continue;
      }
      let wordEnd = at;
      while (isWordChar(text[wordEnd])) wordEnd += 1;
      const word = lowerText.slice(at, wordEnd);
      // A plural of a one-word name starts with the name: "sons" is found under "son".
      const candidates = [word, word.replace(/es$/, ""), word.replace(/s$/, "")].flatMap((key) => byFirstWord.get(key) ?? []);
      let next = at + 1;
      for (const form of candidates.sort((a, b) => b.lower.length - a.lower.length)) {
        const end = endOf(form, text, lowerText, at);
        if (end === -1) continue;
        if (!seen.has(form.entry.id)) {
          seen.add(form.entry.id);
          found.push(form.entry);
        }
        // The words of this name are taken. A shorter name inside it does not match.
        next = end;
        break;
      }
      at = next;
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
