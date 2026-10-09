// One request for the reader of this page, from a page that keeps its own state.
import { accountKey, markSignedOut } from "./client";
import { noteStatus } from "./limited";
import { readerChanged } from "./sync";

// The answer, or null when there is none to use. A session that ended, or another reader, is handled here.
export async function readerCall(path: string, init: RequestInit = {}): Promise<unknown> {
  const key = accountKey();
  if (!key) return null;
  try {
    const response = await fetch(path, { ...init, headers: { accept: "application/json", "content-type": "application/json", "x-hub-reader": key } });
    noteStatus(response.status);
    // The reader of the page changed while the answer was on its way.
    if (accountKey() !== key) return null;
    if (response.status === 401) markSignedOut();
    else if (response.status === 409) void readerChanged();
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    noteStatus(null);
    return null;
  }
}
