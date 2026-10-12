// "Ask an assistant": the reader's own assistant gets a question about a paragraph or a paper. The Hub
// calls no model and pays for none. It writes the question and opens the assistant with it.

export type AssistantId = "claude" | "chatgpt" | "gemini" | "grok";
// `prefill`: the assistant reads the question from its address. With none, the reader pastes it.
export type Assistant = { id: AssistantId; name: string; address: string; prefill: boolean };

export const ASSISTANTS: readonly Assistant[] = [
  { id: "claude", name: "Claude", address: "https://claude.ai/new?q=", prefill: true },
  { id: "chatgpt", name: "ChatGPT", address: "https://chatgpt.com/?q=", prefill: true },
  { id: "gemini", name: "Gemini", address: "https://gemini.google.com/app", prefill: false },
  { id: "grok", name: "Grok", address: "https://grok.com/?q=", prefill: true },
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

export type Before = { ref: string; text: string };
type Paper = { id: string; title: string };

// The question travels in an address, and an address has a limit. This is the room for the paragraphs
// before the one that the reader asks about.
export const CONTEXT_ROOM = 3200;

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
const paperLine = (paper: Paper) => (paper.id === "0" ? `"${paper.title}"` : `Paper ${paper.id}, "${paper.title}"`);

// Where the assistant finds more than the question holds. The connector first; the public service for an
// assistant with none. Only public reading addresses: never one of an account.
function more(lines: string[], example: string): string {
  return [
    "More is there if you need it. If you have the Urantia Papers connector, use it. If you do not, the same data is public at these addresses, with no key:",
    ...lines.map((line) => `- ${line}`),
    `- A search by meaning: ${API}/search/semantic?q=your+words`,
    `- All the addresses: ${API}/openapi.json`,
    "",
    `Cite each paragraph that you use by its reference, such as ${example}. Tell me when you are not sure.`,
  ].join("\n");
}

type ParagraphAsk = { question: string; paper: Paper; section: { id: string; title: string | null } | null; before: readonly Before[]; ref: string; text: string; link: string };

export function paragraphPrompt({ question, paper, section, before, ref, text, link }: ParagraphAsk): string {
  const { kept, cut } = contextWithin(before);
  const parts = [question, `From the Urantia Papers:\n${paperLine(paper)}\n${section ? `Section ${section.id}${section.title ? `, "${section.title}"` : ""}` : "The opening of the paper"}`];
  if (kept.length > 0) parts.push(`The paragraphs before it in this section${cut ? " (the nearest ones)" : ""}, for context:\n${kept.map((one) => `${one.ref} ${one.text}`).join("\n\n")}`);
  parts.push(`The paragraph that I ask about:\n${ref} ${text}`, `On UrantiaHub: ${link}`);
  parts.push(
    more(
      [
        `This paragraph with the meaning of its terms, and the passages near to it in meaning in the Papers, in the Bible, and in the texts of other religions: ${API}/paragraphs/${ref}?include=entities,urantiaParallels,bibleParallels,scriptureParallels`,
        `The whole paper: ${API}/papers/${paper.id}`,
      ],
      ref,
    ),
  );
  return parts.join("\n\n");
}

export function paperPrompt({ question, paper, link }: { question: string; paper: Paper; link: string }): string {
  return [
    question,
    `From the Urantia Papers:\n${paperLine(paper)}\nOn UrantiaHub: ${link}`,
    more([`The whole paper, with each paragraph and its reference: ${API}/papers/${paper.id}`, `One paragraph with the meaning of its terms and the passages near to it in meaning: ${API}/paragraphs/${paper.id}:0.1?include=entities,urantiaParallels,bibleParallels,scriptureParallels`], `${paper.id}:0.1`),
  ].join("\n\n");
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
