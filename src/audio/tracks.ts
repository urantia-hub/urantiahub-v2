import type { PaperDoc } from "@/content/fetchers";

export type Track = { ref: string; url: string; duration: number };

// The audio for a paper, in reading order. Null if any paragraph has none:
// the voice must not skip text without a word, so such a paper gets no voice.
export function paperTracks(paper: PaperDoc): Track[] | null {
  const tracks: Track[] = [];
  for (const section of paper.sections) {
    for (const paragraph of section.paragraphs) {
      if (!paragraph.audio) return null;
      tracks.push({ ref: paragraph.ref, url: paragraph.audio.url, duration: paragraph.audio.duration });
    }
  }
  return tracks.length > 0 ? tracks : null;
}
