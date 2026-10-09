// Which papers the signed-in reader read, for the contents page. The browser asks when that page opens.

import { accountKey } from "./client";

const NONE: ReadonlySet<string> = new Set();
let read: ReadonlySet<string> = NONE;
const listeners = new Set<() => void>();

function set(next: ReadonlySet<string>) {
  read = next;
  for (const listener of listeners) listener();
}

export const readPapers = (): ReadonlySet<string> => read;
export const noReadPapers = (): ReadonlySet<string> => NONE;

export function subscribeToProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearProgress(): void {
  if (read !== NONE) set(NONE);
}

export async function loadProgress(): Promise<void> {
  const key = accountKey();
  if (!key) return;
  try {
    const response = await fetch("/api/me/progress", { headers: { accept: "application/json", "x-hub-reader": key } });
    if (!response.ok) return;
    const body = (await response.json()) as { read?: unknown };
    // The reader was signed out, or changed, while the answer was on its way.
    if (accountKey() !== key) return;
    set(new Set(Array.isArray(body.read) ? body.read.filter((id): id is string => typeof id === "string") : []));
  } catch {
    // No answer. The page shows no marks, and reading works as before.
  }
}
