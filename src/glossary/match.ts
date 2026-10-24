import type { Lang } from "@/i18n/lang";
import { GLOSSARY_BY_LANG, isName, type GlossaryEntry } from "./glossary";

type Form = { text: string; lower: string; entry: GlossaryEntry };

// What differs between the languages: the letters of a word, the small words that do not start a name, the
// ideas that are plain words, the plural forms of a name, and the one member of an order or a race.
export type MatchRules = {
  word: RegExp;
  upper: RegExp;
  smallStart: RegExp;
  plainWords: Set<string>;
  // Names that are also a small word of the language, which the text uses far more: "El" and the article "El".
  smallWords: Set<string>;
  // Each form of a name in the text, the longest first: the name and its plurals, in lowercase.
  plurals(lower: string): string[];
  // The names that a word of the text can be the plural of.
  singulars(word: string): string[];
  // One member of an order or a race, or null.
  singular(name: string): string | null;
};

export const EN_RULES: MatchRules = {
  word: /[A-Za-z0-9]/,
  upper: /[A-Z]/,
  // Another name of an entry counts only if it reads as a name: it has a capital letter or more than one word,
  // and it does not start with a small word. The glossary gives "worlds" as another name of "Melchizedek worlds",
  // "the first" for "Alpha and Omega", and "his wife" for one person.
  smallStart: /^(the|a|an|his|her|its|their|my|our|your)\s/i,
  // Ideas of the glossary that are a verb or a small word in almost each sentence: "it will be", "that being so",
  // "in order to", "the present age". As a term they would be wrong far more times than right.
  plainWords: new Set(
    "will being order present past good actual first last next way end least whole might living individual impersonal lead hail rest well even still just right like kind mean means set long second close live lives state can may must shall one two three four five six seven eight nine ten twelve back left saw found rose lay lie bear fast minute object subject change forms words names needs plans matter".split(
      " ",
    ),
  ),
  smallWords: new Set(),
  // A plural adds "s", or "es" after s, x, z, ch, or sh: "churches", but not "wares" for "war".
  plurals: (lower) => (/(s|x|z|ch|sh)$/.test(lower) ? [`${lower}es`, `${lower}s`, lower] : [`${lower}s`, lower]),
  // A plural of a one-word name starts with the name: "sons" is found under "son".
  singulars: (word) => [word, word.replace(/es$/, ""), word.replace(/s$/, "")],
  // An order or a race has a plural name. One member of it has the name in the singular: "an Andite".
  singular: (name) => (/[^s]s$/.test(name) ? name.slice(0, -1) : null),
};

const ACCENT: Record<string, string> = { a: "á", e: "é", i: "í", o: "ó", u: "ú" };
const PLAIN: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u" };

export const ES_RULES: MatchRules = {
  word: /[\p{L}\p{N}]/u,
  upper: /\p{Lu}/u,
  smallStart: /^(el|la|los|las|un|una|unos|unas|su|sus|lo)\s/i,
  // An idea whose Spanish name is a plain word: "mal" is also "badly", "absoluta" is also "absolute".
  plainWords: new Set("mal absoluta viernes".split(" ")),
  // "Esta" is a person, "Sin" a god, and "Luz" a town, but at the start of a sentence they are "this", "without",
  // and "light".
  smallWords: new Set("el la lo los las un una unos unas al del de y e o u en a con por para su sus este esta esto estos estas ese esa eso esos esas sin luz".split(" ")),
  // "-s" after a vowel, "-es" after a consonant, "-ces" for a final "z". A last vowel with an accent before "n"
  // or "s" loses it: "nación", "naciones".
  plurals: (lower) => {
    if (/[aeiouáéó]$/.test(lower)) return [`${lower}s`, lower];
    if (/z$/.test(lower)) return [`${lower.slice(0, -1)}ces`, lower];
    if (/[íú]$/.test(lower)) return [`${lower}es`, `${lower}s`, lower];
    const plain = lower.replace(/([áéíóú])([ns])$/, (_, vowel: string, end: string) => PLAIN[vowel] + end);
    return /s$/.test(lower) && !/[áéíóú]s$/.test(lower) ? [lower] : [`${plain}es`, lower];
  },
  singulars: (word) => [
    word,
    word.replace(/s$/, ""),
    word.replace(/es$/, ""),
    word.replace(/ces$/, "z"),
    word.replace(/([aeiou])([ns])es$/, (_, vowel: string, end: string) => ACCENT[vowel] + end),
  ],
  // Only a name of one word: the plural of "Hijos de Dios" is in its first word.
  singular: (name) => (/\s/.test(name) ? null : /[^aeiou]es$/.test(name) ? name.slice(0, -2) : /[aeiou]s$/.test(name) ? name.slice(0, -1) : null),
};

const RULES: Record<Lang, MatchRules> = { en: EN_RULES, es: ES_RULES };

const onlyDigits = (text: string) => /^\d+$/.test(text);

// How many more times the Papers must cite one entry than the next, to give it a name that both claim.
const FAR_MORE = 3;

// "Abraham (Old Testament)" is also "Abraham".
const withoutNote = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, "").trim();

// Each form that the text can take, with the one entry that it means. Also the entries that lost another name
// to a second entry. An entry in `contested` keeps no other name of one word.
function collectForms(entries: readonly GlossaryEntry[], rules: MatchRules, contested: ReadonlySet<string> = new Set()): { forms: Form[]; lost: Set<string> } {
  const lost = new Set<string>();
  const firstWord = (text: string) => new RegExp(`${rules.word.source}+`, "u").exec(text)?.[0].toLowerCase() ?? "";
  const readsAsName = (text: string) => (rules.upper.test(text) || /\s/.test(text)) && !rules.smallStart.test(text);
  const taken = new Map<string, Form>();
  // The name of an entry comes first. It wins over another name of a second entry.
  for (const entry of entries) {
    const text = entry.name.trim();
    const lower = text.toLowerCase();
    if (text === "" || onlyDigits(text) || taken.has(lower) || rules.smallWords.has(lower)) continue;
    if (entry.type === "concept" && rules.plainWords.has(lower)) continue;
    // An idea in its everyday sense ("man", "gold") tells a reader nothing that a dictionary does not.
    if (entry.sense === "ordinary") continue;
    taken.set(lower, { text, lower, entry });
  }
  // Then the other names. An idea has none here: the glossary gives "Sons" for the idea "children".
  const claims = new Map<string, Form[]>();
  for (const entry of entries) {
    const base = withoutNote(entry.name);
    const kept = isName(entry) ? entry.aliases.filter(readsAsName) : [];
    const singular = entry.type === "order" || entry.type === "race" ? [entry.name, ...kept].flatMap((name) => rules.singular(name) ?? []) : [];
    const others = [...(base !== entry.name.trim() && readsAsName(base) ? [base] : []), ...kept, ...singular];
    for (const raw of others) {
      const text = raw.trim();
      const lower = text.toLowerCase();
      if (text === "" || onlyDigits(text) || firstWord(text) === "" || rules.smallWords.has(lower)) continue;
      if (entry.type === "concept" && rules.plainWords.has(lower)) continue;
      if (contested.has(entry.id) && !/\s/.test(text)) continue;
      const owner = taken.get(lower);
      if (owner) {
        if (owner.entry.id !== entry.id) lost.add(entry.id);
        continue;
      }
      const list = claims.get(lower) ?? [];
      if (!list.some((form) => form.entry.id === entry.id)) claims.set(lower, [...list, { text, lower, entry }]);
    }
  }
  for (const [lower, list] of claims) {
    // Two entries claim one name. It goes to the one that the Papers cite far more, or to neither.
    const [top, next] = [...list].sort((a, b) => b.entry.citations - a.entry.citations);
    const winner = !next || top.entry.citations >= FAR_MORE * Math.max(1, next.entry.citations) ? top : null;
    if (winner) taken.set(lower, winner);
    for (const form of list) if (form !== winner) lost.add(form.entry.id);
  }
  return { forms: [...taken.values()].filter((form) => firstWord(form.text) !== ""), lost };
}

// The entries that lose another name in English. The Spanish glossary lacks many of the entries that compete
// for a name ("Joseph" has five), so a Spanish name of one word ("José") would go to the one that is there.
export function contestedIn(entries: readonly GlossaryEntry[]): Set<string> {
  return collectForms(entries, EN_RULES).lost;
}

// Builds one search over each name and each other name. A term matches when its name stands in the text
// as whole words. The longest name wins where two overlap. A plain plural matches too.
// The names are kept by their first word, so a text is read one time, word by word. One large pattern
// for 4,456 names took 8 seconds to build.
export function createMatcher(entries: readonly GlossaryEntry[], rules: MatchRules = EN_RULES, contested?: ReadonlySet<string>): (text: string) => GlossaryEntry[] {
  const isWordChar = (char: string | undefined) => char !== undefined && rules.word.test(char);
  const firstWord = (text: string) => new RegExp(`${rules.word.source}+`, "u").exec(text)?.[0].toLowerCase() ?? "";
  const byFirstWord = new Map<string, Form[]>();
  for (const form of collectForms(entries, rules, contested).forms) {
    const key = firstWord(form.text);
    const list = byFirstWord.get(key);
    if (list) list.push(form);
    else byFirstWord.set(key, [form]);
  }
  // Longest first: at one place in the text, the search then takes the longest name.
  for (const forms of byFirstWord.values()) forms.sort((a, b) => b.lower.length - a.lower.length);

  // The end of a form at this place in the text, or -1. A plural can stand there, and then no word character.
  function endOf(form: Form, text: string, lowerText: string, at: number): number {
    for (const each of rules.plurals(form.lower)) {
      if (!lowerText.startsWith(each, at) || isWordChar(text[at + each.length])) continue;
      // A name with capitals is a name only with the same capitals: "Son", not "son"; "I AM", not "I am".
      // The plural keeps the letters that it shares with the name.
      let same = 0;
      while (same < each.length && each[same] === form.lower[same]) same += 1;
      if (rules.upper.test(form.text) && !text.startsWith(form.text.slice(0, same), at)) continue;
      return at + each.length;
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
      const candidates = [...new Set(rules.singulars(word))].flatMap((key) => byFirstWord.get(key) ?? []);
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

const real: Partial<Record<Lang, (text: string) => GlossaryEntry[]>> = {};

// The terms of the real glossary of a language that stand in a text. Each search is built one time, at its first use.
export function termsIn(text: string, lang: Lang = "en"): GlossaryEntry[] {
  real[lang] ??= createMatcher(GLOSSARY_BY_LANG[lang], RULES[lang], lang === "es" ? contestedIn(GLOSSARY_BY_LANG.en) : undefined);
  return real[lang](text);
}
