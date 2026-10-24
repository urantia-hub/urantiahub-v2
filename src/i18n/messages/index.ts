import type { Lang } from "../lang";
import { en, type Messages } from "./en";
import { es } from "./es";

export type { Messages };

export function messages(lang: Lang): Messages {
  return lang === "es" ? es : en;
}
