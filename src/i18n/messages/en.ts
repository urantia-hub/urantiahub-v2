export const en = {
  skip: "Skip to the text",
  paperEyebrow: (numeral: string, id: number) => `Part ${numeral} · Paper ${id}`,
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends (...args: infer A) => string ? (...args: A) => string : string };
export type Messages = Widen<typeof en>;
