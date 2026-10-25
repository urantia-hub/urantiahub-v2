// The words of the marks in each language. The English is the list itself (`list.ts`); the Spanish is
// here, by id, so the ids and the rules stay in one place.

import type { Lang } from "@/i18n/lang";
import { markById, type Tier, TIERS } from "./list";

const NAMES_ES: Record<string, string> = {
  "first-section": "Primera sección",
  "first-listen": "Primera escucha",
  search: "Búsqueda",
  parallels: "Paralelos",
  terms: "Términos",
  note: "Primera nota",
  image: "Imagen",
  share: "Primer enlace",
  "first-text": "Primera obra",
  foreword: "Prólogo",
  "texts-1": "Una obra completa",
  "texts-5": "5 obras",
  "texts-10": "10 obras",
  book: "El libro completo",
  "texts-all": "Todas las obras",
};

const EFFORTS_ES: Record<string, string> = {
  "a page of any work": "una página de cualquier obra",
  "a week": "una semana",
  "every page of one work": "cada página de una obra",
  "a month": "un mes",
  "3 months": "3 meses",
  "a year": "un año",
};

const TIERS_ES: Record<Tier, { name: string; line: string }> = {
  1: { name: "Cinta", line: "unos minutos cada una" },
  2: { name: "Seda", line: "horas, o una semana" },
  3: { name: "Dorado", line: "decenas de horas" },
  4: { name: "Iluminado", line: "las más raras" },
};

// "about 18 hours" → "unas 18 horas", inside a longer effort too.
function hoursEs(text: string): string {
  return text
    .replace(/about 1 hour\b/g, "cerca de 1 hora")
    .replace(/about (\d+) hours/g, "unas $1 horas")
    .replace(/^from /, "desde ")
    .replace(/^all 197 papers · /, "los 197 documentos · ")
    .replace(/^all 22, the Bible too · /, "las 22, también la Biblia · ");
}

function nameEs(id: string): string {
  const mark = markById(id);
  if (!mark) return id;
  const rule = mark.rule;
  if (NAMES_ES[id]) return NAMES_ES[id];
  if (rule.kind === "papers") return rule.count === 1 ? "1 documento" : `${rule.count} documentos`;
  if (rule.kind === "part") return `Parte ${mark.symbol}`;
  if (rule.kind === "streak") return `Racha de ${rule.days} días`;
  return mark.name;
}

export type MarkWords = { name(id: string): string; effort(id: string): string; tier(tier: Tier): { name: string; line: string } };

export function markWords(lang: Lang): MarkWords {
  if (lang === "es") {
    return {
      name: nameEs,
      effort: (id) => {
        const effort = markById(id)?.effort ?? "";
        return EFFORTS_ES[effort] ?? hoursEs(effort);
      },
      tier: (tier) => TIERS_ES[tier],
    };
  }
  return {
    name: (id) => markById(id)?.name ?? id,
    effort: (id) => markById(id)?.effort ?? "",
    tier: (tier) => {
      const found = TIERS.find((t) => t.tier === tier);
      return { name: found?.name ?? "", line: found?.line ?? "" };
    },
  };
}
