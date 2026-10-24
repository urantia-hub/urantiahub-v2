// Questions that people bring. A new visitor sees one from each group on the search screen, chosen at random.
// They are the Hub's own copy. They do not claim that the text answers them. Kelson approves each change.
// Before a question enters the pool, run it against the live search and read its first results.
import type { Lang } from "@/i18n/lang";

type Groups = readonly { name: string; questions: readonly string[] }[];

export const STARTER_GROUPS: Groups = [
  { name: "Today", questions: ["Why is the world in such turmoil?", "Where is civilization going?", "How do I live without fear?"] },
  { name: "The person", questions: ["What happens after death?", "What is the soul?", "How do I find peace of mind?"] },
  { name: "The universe", questions: ["How big is the universe?", "What are angels?", "Is there life on other worlds?"] },
  { name: "The story of our world", questions: ["When did humans come to the Americas?", "How did life begin on earth?", "Where did marriage come from?", "Why do people fear ghosts?"] },
  { name: "Jesus", questions: ["Where did Jesus travel before his public ministry?", "What was Jesus like as a child?", "What did Jesus teach about prayer?"] },
];

// The same groups in Spanish (2026-10-24). Each question was run against the live Spanish search, and its
// first results were read.
const STARTER_GROUPS_ES: Groups = [
  { name: "Hoy", questions: ["¿Por qué el mundo está tan agitado?", "¿Hacia dónde va la civilización?", "¿Cómo vivo sin miedo?"] },
  { name: "La persona", questions: ["¿Qué pasa después de la muerte?", "¿Qué es el alma?", "¿Cómo encuentro la paz interior?"] },
  { name: "El universo", questions: ["¿Qué tan grande es el universo?", "¿Qué son los ángeles?", "¿Hay vida en otros mundos?"] },
  { name: "La historia de nuestro mundo", questions: ["¿Cuándo llegaron los humanos a América?", "¿Cómo comenzó la vida en la tierra?", "¿De dónde vino el matrimonio?", "¿Por qué la gente teme a los fantasmas?"] },
  { name: "Jesús", questions: ["¿Adónde viajó Jesús antes de su ministerio público?", "¿Cómo era Jesús de niño?", "¿Qué enseñó Jesús sobre la oración?"] },
];

export const startersFor = (lang: Lang): Groups => (lang === "es" ? STARTER_GROUPS_ES : STARTER_GROUPS);
