import "server-only";
import { UrantiaAPI } from "@urantia/api";
import { Refused } from "./call";
import type { Gateway } from "./data";
import type { SavedGateway } from "./saved-data";

// The only place that asks api.urantia.dev for a reader's own data. `src/content` asks for the Papers.
const api = (token: string) => new UrantiaAPI({ baseUrl: process.env.URANTIA_API_BASE_URL || undefined, token });

// The package reports a failed request as an Error whose message starts with the status.
async function asked<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof Error && /^401\b/.test(error.message)) throw new Refused();
    throw error;
  }
}

const gone = (error: unknown) => error instanceof Error && /^404\b/.test(error.message);

type Listed = { paragraph: { standardReferenceId: string; paperId: string; paperTitle: string; text: string }; createdAt: string };
const mark = (of: Listed) => ({ ref: of.paragraph.standardReferenceId, paperId: of.paragraph.paperId, paperTitle: of.paragraph.paperTitle, text: of.paragraph.text, at: of.createdAt });
const note = (of: Listed & { id: string; text: string }) => ({ ...mark(of), id: of.id, note: of.text });
// The API answers the count as `pagination.total`. The package's type names another field.
const total = (answer: unknown, fallback: number): number => {
  const count = (answer as { pagination?: { total?: unknown } }).pagination?.total;
  return typeof count === "number" ? count : fallback;
};
const PAGE = 100;

export const gateway: Gateway & SavedGateway & { profileName(accessToken: string): Promise<string | null> } = {
  bookmarks: async (token, { paperId, page }) => {
    const answer = await asked(api(token).me.bookmarks.list({ paperId, page, limit: PAGE }));
    return { items: answer.data.map(mark), total: total(answer, answer.data.length) };
  },
  notes: async (token, { paperId, page }) => {
    const answer = await asked(api(token).me.notes.list({ paperId, page, limit: PAGE }));
    return { items: answer.data.map(note), total: total(answer, answer.data.length) };
  },
  addBookmark: async (token, ref) => {
    await asked(api(token).me.bookmarks.create({ ref }));
  },
  removeBookmark: (token, ref) => asked(api(token).me.bookmarks.delete(ref)),
  addNote: async (token, ref, text) => note((await asked(api(token).me.notes.create({ ref, text, format: "plain" }))).data),
  changeNote: async (token, id, text) => {
    try {
      return note((await asked(api(token).me.notes.update(id, { text }))).data);
    } catch (error) {
      if (gone(error)) return null;
      throw error;
    }
  },
  deleteNote: (token, id) => asked(api(token).me.notes.delete(id)),
  preferences: async (token) => (await asked(api(token).me.preferences.get())).data ?? {},
  savePreferences: async (token, patch) => {
    await asked(api(token).me.preferences.update(patch));
  },
  markRead: async (token, refs) => {
    await asked(api(token).me.readingProgress.mark(refs));
  },
  progress: async (token) => (await asked(api(token).me.readingProgress.get())).data ?? [],
  profileName: async (token) => {
    const name = (await asked(api(token).me.get())).data?.name;
    return typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : null;
  },
};
