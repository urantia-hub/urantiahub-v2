// The home page shows one of these, selected at random. Kelson approves each one.
// A passage is a whole paragraph, or one or more whole sentences of it, exact and in order.
// The build compares each text with the paragraph from the API and fails on any difference
// (excerptPassage in fetchers.ts). To add a passage, copy the sentences from the API response.
// `clause: true` marks a passage that ends at a dash or a semicolon of the source, not at the
// end of a sentence. Use it only for a paragraph that is one long sentence.
export type HomePassage = { ref: string; text?: string; clause?: boolean };

export const HOME_PASSAGES: readonly HomePassage[] = [
  {
    ref: "99:1.1",
    text: "Mechanical inventions and the dissemination of knowledge are modifying civilization; certain economic adjustments and social changes are imperative if cultural disaster is to be avoided.",
  },
  {
    ref: "99:1.1",
    text: "The human race must become reconciled to a procession of changes, adjustments, and readjustments. Mankind is on the march toward a new and unrevealed planetary destiny.",
  },
  {
    ref: "92:7.14",
    text: "Modern man is confronted with the task of making more readjustments of human values in one generation than have been made in two thousand years.",
  },
  {
    ref: "12:7.9",
    text: "The love of the Father absolutely individualizes each personality as a unique child of the Universal Father, a child without duplicate in infinity, a will creature irreplaceable in all eternity.",
  },
  { ref: "15:14.9" },
  {
    ref: "111:7.1",
    text: "Uncertainty with security is the essence of the Paradise adventure",
    clause: true,
  },
];
