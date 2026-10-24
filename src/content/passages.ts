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

// The same passages in Spanish, cut from the Spanish paragraph to the same meaning. Kelson approves each one.
export const HOME_PASSAGES_ES: readonly HomePassage[] = [
  {
    ref: "99:1.1",
    text: "Los inventos mecánicos y la difusión del conocimiento están modificando la civilización; ciertos ajustes económicos y cambios sociales son imperativos si se quiere evitar un desastre cultural.",
  },
  {
    ref: "99:1.1",
    text: "La raza humana debe reconciliarse con una sucesión de cambios, ajustes y reajustes. La humanidad está en marcha hacia un destino planetario nuevo y no revelado.",
  },
  {
    ref: "92:7.14",
    text: "El hombre moderno se enfrenta a la tarea de hacer más reajustes de los valores humanos en una sola generación que los que se han hecho en dos mil años.",
  },
  {
    ref: "12:7.9",
    text: "El amor del Padre individualiza de manera absoluta a cada personalidad como un hijo único del Padre Universal, un hijo sin duplicado en la infinitud, una criatura volitiva irreemplazable en toda la eternidad.",
  },
  { ref: "15:14.9" },
  {
    ref: "111:7.1",
    text: "La incertidumbre con seguridad es la esencia de la aventura del Paraíso",
    clause: true,
  },
];
