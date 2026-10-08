import { GLOSSARY, isName, type GlossaryEntry } from "./glossary";

type Form = { text: string; lower: string; entry: GlossaryEntry };

const isWordChar = (char: string | undefined) => char !== undefined && /[A-Za-z0-9]/.test(char);
const hasUpper = (text: string) => /[A-Z]/.test(text);
const firstWord = (text: string) => /[A-Za-z0-9]+/.exec(text)?.[0].toLowerCase() ?? "";
const onlyDigits = (text: string) => /^\d+$/.test(text);

// Another name of an entry counts only if it reads as a name: it has a capital letter or more than one word,
// and it does not start with a small word. The glossary gives "worlds" as another name of "Melchizedek worlds",
// "the first" for "Alpha and Omega", and "his wife" for one person.
const SMALL_START = /^(the|a|an|his|her|its|their|my|our|your)\s/i;
const readsAsName = (text: string) => (hasUpper(text) || /\s/.test(text)) && !SMALL_START.test(text);

// Ideas of the glossary that are a verb or a small word in almost each sentence: "it will be", "that being so",
// "in order to", "the present age". As a term they would be wrong far more times than right.
const PLAIN_WORDS = new Set(
  "will being order present past good actual first last next way end least whole might living individual impersonal lead hail rest well even still just right like kind mean means set long second close live lives state can may must shall one two three four five six seven eight nine ten twelve back left saw found rose lay lie bear fast minute object subject change forms words names needs plans matter"
    .split(" "),
);

// How many more times the Papers must cite one entry than the next, to give it a name that both claim.
const FAR_MORE = 3;

// "Abraham (Old Testament)" is also "Abraham".
const withoutNote = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, "").trim();

// Each form that the text can take, with the one entry that it means.
function collectForms(entries: readonly GlossaryEntry[]): Form[] {
  const taken = new Map<string, Form>();
  // The name of an entry comes first. It wins over another name of a second entry.
  for (const entry of entries) {
    const text = entry.name.trim();
    const lower = text.toLowerCase();
    if (text === "" || onlyDigits(text) || taken.has(lower)) continue;
    if (entry.type === "concept" && PLAIN_WORDS.has(lower)) continue;
    taken.set(lower, { text, lower, entry });
  }
  // Then the other names. An idea has none here: the glossary gives "Sons" for the idea "children".
  const claims = new Map<string, Form[]>();
  for (const entry of entries) {
    const base = withoutNote(entry.name);
    const kept = isName(entry) ? entry.aliases.filter(readsAsName) : [];
    // An order or a race has a plural name. One member of it has the name in the singular: "an Andite".
    const singular = entry.type === "order" || entry.type === "race" ? [entry.name, ...kept].filter((name) => /[^s]s$/.test(name)).map((name) => name.slice(0, -1)) : [];
    const others = [...(base !== entry.name.trim() && readsAsName(base) ? [base] : []), ...kept, ...singular];
    for (const raw of others) {
      const text = raw.trim();
      const lower = text.toLowerCase();
      if (text === "" || onlyDigits(text) || firstWord(text) === "" || taken.has(lower)) continue;
      if (entry.type === "concept" && PLAIN_WORDS.has(lower)) continue;
      const list = claims.get(lower) ?? [];
      if (!list.some((form) => form.entry.id === entry.id)) claims.set(lower, [...list, { text, lower, entry }]);
    }
  }
  for (const [lower, list] of claims) {
    // Two entries claim one name. It goes to the one that the Papers cite far more, or to neither.
    const [top, next] = [...list].sort((a, b) => b.entry.citations - a.entry.citations);
    if (!next || top.entry.citations >= FAR_MORE * Math.max(1, next.entry.citations)) taken.set(lower, top);
  }
  return [...taken.values()].filter((form) => firstWord(form.text) !== "");
}

// Builds one search over each name and each other name. A term matches when its name stands in the text
// as whole words. The longest name wins where two overlap. A plain plural matches too.
// The names are kept by their first word, so a text is read one time, word by word. One large pattern
// for 4,456 names took 8 seconds to build.
export function createMatcher(entries: readonly GlossaryEntry[]): (text: string) => GlossaryEntry[] {
  const byFirstWord = new Map<string, Form[]>();
  for (const form of collectForms(entries)) {
    const key = firstWord(form.text);
    const list = byFirstWord.get(key);
    if (list) list.push(form);
    else byFirstWord.set(key, [form]);
  }
  // Longest first: at one place in the text, the search then takes the longest name.
  for (const forms of byFirstWord.values()) forms.sort((a, b) => b.lower.length - a.lower.length);

  // The end of a form at this place in the text, or -1. A plain plural can follow, and then no word character.
  function endOf(form: Form, text: string, lowerText: string, at: number): number {
    if (!lowerText.startsWith(form.lower, at)) return -1;
    // A name with capitals is a name only with the same capitals: "Son", not "son"; "I AM", not "I am".
    if (hasUpper(form.text) && !text.startsWith(form.text, at)) return -1;
    const end = at + form.lower.length;
    // A plural adds "s", or "es" after s, x, z, ch, or sh: "churches", but not "wares" for "war".
    const plurals = /(s|x|z|ch|sh)$/.test(form.lower) ? ["es", "s", ""] : ["s", ""];
    for (const plural of plurals) {
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
