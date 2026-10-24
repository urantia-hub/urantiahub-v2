import type { Lang } from "@/i18n/lang";

// "Ask an assistant": the reader's own assistant gets a question about a paragraph or a paper. The Hub
// calls no model and pays for none. It writes the question and opens the assistant with it.

export type AssistantId = "claude" | "chatgpt" | "gemini" | "grok";
// `prefill`: the assistant reads the question from its address. With none, the reader pastes it.
// `home`: the page to open for a paste. `maxLink`: the longest address that the assistant takes.
export type Assistant = { id: AssistantId; name: string; address: string; home: string; prefill: boolean; maxLink?: number };

export const ASSISTANTS: readonly Assistant[] = [
  { id: "claude", name: "Claude", address: "https://claude.ai/new?q=", home: "https://claude.ai/new", prefill: true },
  { id: "chatgpt", name: "ChatGPT", address: "https://chatgpt.com/?q=", home: "https://chatgpt.com/", prefill: true },
  { id: "gemini", name: "Gemini", address: "https://gemini.google.com/app", home: "https://gemini.google.com/app", prefill: false },
  // The server of Grok takes about 8,000 characters of headers in all (measured 2026-10-12: error 431
  // above that), and the cookies of a signed-in reader are a part of them. 2,000 leaves room for those.
  { id: "grok", name: "Grok", address: "https://grok.com/?q=", home: "https://grok.com/", prefill: true, maxLink: 2000 },
];

// Approved copy (Kelson, 2026-10-12). A question about a visual names no form: each assistant has its own
// way to draw, and a named way is out of date first.
export const PARAGRAPH_QUESTIONS: readonly string[] = [
  "Explain this paragraph in plain words.",
  "What do the unusual terms here mean?",
  "Where else do the Papers speak of this?",
  "How do other traditions speak of this idea?",
  "Make a visual of these ideas, in the form that you think is best.",
];
export const PAPER_QUESTIONS: readonly string[] = [
  "Give me the short version of this paper.",
  "Walk me through this paper, section by section.",
  "Which ideas here are hard, and what do they mean?",
  "Give me five questions for a study group.",
  "Make a visual of the ideas of this paper, in the form that you think is best.",
];

// Spanish copy: the paragraph questions are the five of the mock (2026-10-23), the paper questions are in
// the same voice.
const PARAGRAPH_QUESTIONS_ES: readonly string[] = [
  "Explica este párrafo con palabras sencillas.",
  "¿Qué significan los términos poco comunes de aquí?",
  "¿En qué otras partes hablan los Documentos de esto?",
  "¿Cómo hablan otras tradiciones de esta idea?",
  "Haz un esquema visual de estas ideas, en la forma que te parezca mejor.",
];
const PAPER_QUESTIONS_ES: readonly string[] = [
  "Dame la versión breve de este documento.",
  "Guíame por este documento, sección por sección.",
  "¿Qué ideas de aquí son difíciles, y qué significan?",
  "Dame cinco preguntas para un grupo de estudio.",
  "Haz un esquema visual de las ideas de este documento, en la forma que te parezca mejor.",
];

export function questionsFor(about: "paragraph" | "paper", lang: Lang): readonly string[] {
  if (about === "paragraph") return lang === "es" ? PARAGRAPH_QUESTIONS_ES : PARAGRAPH_QUESTIONS;
  return lang === "es" ? PAPER_QUESTIONS_ES : PAPER_QUESTIONS;
}

export type Before = { ref: string; text: string };
type Paper = { id: string; title: string };

// The room for the paragraphs before the one that the reader asks about. Small on purpose: the question
// travels in an address, and a reader sees it in the box of the assistant. The assistant can read more.
export const CONTEXT_ROOM = 1200;

// The paragraphs nearest to the reader's one, as many as fit. Never one from the middle left out.
export function contextWithin(before: readonly Before[], room: number = CONTEXT_ROOM): { kept: Before[]; cut: boolean } {
  const kept: Before[] = [];
  let used = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    const size = before[i].ref.length + 1 + before[i].text.length;
    if (used + size > room) return { kept, cut: true };
    used += size;
    kept.unshift(before[i]);
  }
  return { kept, cut: false };
}

const API = "https://api.urantia.dev";

// The fixed words of a question, in each language.
const WORDS = {
  en: {
    papers: "The Urantia Papers",
    paper: (id: string) => `Paper ${id}`,
    section: "section",
    opening: "the opening of the paper",
    before: "Before it, for context:",
    asking: "I ask about this paragraph:",
    onHub: "On UrantiaHub:",
    more: (what: string, address: string, example: string) =>
      `For more, use the Urantia Papers connector if you have it. If not, ${what} at ${address} (all addresses: ${API}/openapi.json). Cite paragraphs by reference, such as ${example}.`,
    paragraphPublic: "the paragraph with its terms and its parallels is public",
    paperPublic: "the whole paper is public",
  },
  es: {
    papers: "Los Documentos de Urantia",
    paper: (id: string) => `Documento ${id}`,
    section: "sección",
    opening: "la apertura del documento",
    before: "Antes, como contexto:",
    asking: "Pregunto por este párrafo:",
    onHub: "En UrantiaHub:",
    more: (what: string, address: string, example: string) =>
      `Para más, usa el conector de los Documentos de Urantia si lo tienes. Si no, ${what} en ${address} (todas las direcciones: ${API}/openapi.json). Cita los párrafos por su referencia, como ${example}.`,
    paragraphPublic: "el párrafo con sus términos y sus paralelos es público",
    paperPublic: "el documento entero es público",
  },
} as const;

const paperLine = (paper: Paper, lang: Lang) => (paper.id === "0" ? `"${paper.title}"` : `${WORDS[lang].paper(paper.id)}, "${paper.title}"`);
// The API gives the Spanish text with `lang=es`.
const langQuery = (lang: Lang, joiner: "?" | "&") => (lang === "es" ? `${joiner}lang=es` : "");

type ParagraphAsk = { question: string; paper: Paper; section: { id: string; title: string | null } | null; before: readonly Before[]; ref: string; text: string; link: string; lang?: Lang };

// Short on purpose (Kelson, 2026-10-12): the question, where the paragraph is, the nearest paragraphs
// before it, the paragraph, and one sentence on where more is.
export function paragraphPrompt({ question, paper, section, before, ref, text, link, lang = "en" }: ParagraphAsk): string {
  const w = WORDS[lang];
  const { kept } = contextWithin(before);
  const place = section ? `${w.section} ${section.id}${section.title ? `, "${section.title}"` : ""}` : w.opening;
  const parts = [question, `${w.papers}, ${paperLine(paper, lang)}, ${place}.`];
  if (kept.length > 0) parts.push(`${w.before}\n${kept.map((one) => `${one.ref} ${one.text}`).join("\n\n")}`);
  parts.push(`${w.asking}\n${ref} ${text}`, `${w.onHub} ${link}`);
  parts.push(w.more(w.paragraphPublic, `${API}/paragraphs/${ref}?include=entities,urantiaParallels,bibleParallels,scriptureParallels${langQuery(lang, "&")}`, ref));
  return parts.join("\n\n");
}

export function paperPrompt({ question, paper, link, lang = "en" }: { question: string; paper: Paper; link: string; lang?: Lang }): string {
  const w = WORDS[lang];
  return [question, `${w.papers}, ${paperLine(paper, lang)}.\n${w.onHub} ${link}`, w.more(w.paperPublic, `${API}/papers/${paper.id}${langQuery(lang, "?")}`, `${paper.id}:0.1`)].join("\n\n");
}

// True when the question can go in the address. If not, the reader pastes it.
export function canPrefill(id: AssistantId, prompt: string): boolean {
  const assistant = ASSISTANTS.find((one) => one.id === id) ?? ASSISTANTS[0];
  if (!assistant.prefill) return false;
  return assistant.maxLink === undefined || assistant.address.length + encodeURIComponent(prompt).length <= assistant.maxLink;
}

// The address that opens the assistant. With `prefill`, the question is in it.
export function assistantHref(id: AssistantId, prompt: string): string {
  const assistant = ASSISTANTS.find((one) => one.id === id) ?? ASSISTANTS[0];
  return assistant.prefill ? `${assistant.address}${encodeURIComponent(prompt)}` : assistant.address;
}

// The button below the title of a paper asks the controls of the paper to open the sheet.
export const ASK_PAPER_EVENT = "hub:ask-paper";

const KEY = "hub:assistant";

// The reader's assistant, kept in this browser so the next time is one press.
export function rememberedAssistant(): AssistantId {
  try {
    const value = window.localStorage.getItem(KEY);
    return ASSISTANTS.some((one) => one.id === value) ? (value as AssistantId) : ASSISTANTS[0].id;
  } catch {
    return ASSISTANTS[0].id;
  }
}
export function rememberAssistant(id: AssistantId): void {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // No storage: the choice lasts for this sheet only.
  }
}
