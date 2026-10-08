import { describe, expect, it } from "vitest";
import type { PaperDoc } from "@/content/fetchers";
import { paperTracks } from "./tracks";

const para = (ref: string, audio: { url: string; duration: number } | null) => ({ ref, text: ref, html: ref, audio });
const paper = (paragraphs: ReturnType<typeof para>[][]): PaperDoc => ({
  id: "1",
  title: "The Universal Father",
  partId: "1",
  sections: paragraphs.map((list, i) => ({ id: String(i), title: i ? `Section ${i}` : null, paragraphs: list })),
});

describe("paperTracks", () => {
  it("lists every paragraph in reading order", () => {
    const tracks = paperTracks(
      paper([[para("1:0.1", { url: "https://cdn.urantia.dev/a.mp3", duration: 10 })], [para("1:1.1", { url: "https://cdn.urantia.dev/b.mp3", duration: 20 })]]),
    );
    expect(tracks).toEqual([
      { ref: "1:0.1", url: "https://cdn.urantia.dev/a.mp3", duration: 10 },
      { ref: "1:1.1", url: "https://cdn.urantia.dev/b.mp3", duration: 20 },
    ]);
  });

  // A voice that skips a paragraph without a word is worse than no voice.
  it("gives null when one paragraph has no audio", () => {
    expect(paperTracks(paper([[para("1:0.1", { url: "https://cdn.urantia.dev/a.mp3", duration: 10 }), para("1:0.2", null)]]))).toBeNull();
  });
});
