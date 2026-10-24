import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { excerptPassage, type Passage } from "./fetchers";
import { HOME_PASSAGES, HOME_PASSAGES_ES } from "./passages";

function recorded(ref: string, lang: "en" | "es"): Passage {
  const file = `e2e/fixtures/paragraphs_${ref.replace(":", "_")}${lang === "es" ? ".es" : ""}.json`;
  const { data } = JSON.parse(readFileSync(file, "utf8"));
  return { ref, paperId: data.paperId, paperTitle: data.paperTitle, text: data.text };
}

// The same check as the build, against the paragraphs recorded from the API.
describe("the home passages", () => {
  it("are exact whole sentences of their paragraphs, in both languages", () => {
    for (const entry of HOME_PASSAGES) expect(() => excerptPassage(recorded(entry.ref, "en"), entry), entry.ref).not.toThrow();
    for (const entry of HOME_PASSAGES_ES) expect(() => excerptPassage(recorded(entry.ref, "es"), entry), entry.ref).not.toThrow();
  });
  it("have the same references in the same order in Spanish", () => {
    expect(HOME_PASSAGES_ES.map((p) => p.ref)).toEqual(HOME_PASSAGES.map((p) => p.ref));
  });
});
