// What this device read and heard on one reading day, for one reader. It finds the sections that the
// reader finished. Only a finished section goes to the account; the paragraphs stay here, for one day.

export const DAY_LOG_KEY = "hub:day-log";
const READ_SHARE = 0.9;
const MAX_REFS = 3000;

type Log = { reader: string; day: string; read: string[]; heard: string[]; done: string[] };
export type Finished = { sectionId: string; how: "read" | "heard" };

function load(reader: string, day: string): Log {
  const empty: Log = { reader, day, read: [], heard: [], done: [] };
  try {
    const stored = JSON.parse(window.localStorage.getItem(DAY_LOG_KEY) ?? "null") as Partial<Log> | null;
    if (!stored || stored.reader !== reader || stored.day !== day) return empty;
    const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
    return { reader, day, read: list(stored.read), heard: list(stored.heard), done: list(stored.done) };
  } catch {
    return empty;
  }
}

function save(log: Log): void {
  try {
    window.localStorage.setItem(DAY_LOG_KEY, JSON.stringify(log));
  } catch {
    // Storage is full or blocked. The section is then not counted on this device.
  }
}

function note(field: "read" | "heard", reader: string, day: string, refs: readonly string[]): void {
  if (refs.length === 0) return;
  const log = load(reader, day);
  const all = new Set(log[field]);
  for (const ref of refs) if (all.size < MAX_REFS) all.add(ref);
  save({ ...log, [field]: [...all] });
}

export const noteRead = (reader: string, day: string, refs: readonly string[]) => note("read", reader, day, refs);
export const noteHeard = (reader: string, day: string, refs: readonly string[]) => note("heard", reader, day, refs);

// The sections of a paper that this device finished today and did not answer before. A section needs
// nine of ten of its paragraphs, or each one when it has one or two.
export function finished(reader: string, day: string, sections: readonly { id: string; refs: readonly string[] }[]): Finished[] {
  const log = load(reader, day);
  const read = new Set(log.read);
  const heard = new Set(log.heard);
  const out: Finished[] = [];
  for (const section of sections) {
    if (section.refs.length === 0 || log.done.includes(section.refs[0])) continue;
    const got = section.refs.filter((ref) => read.has(ref) || heard.has(ref)).length;
    const need = section.refs.length <= 2 ? section.refs.length : Math.ceil(section.refs.length * READ_SHARE);
    if (got < need) continue;
    const byEar = section.refs.filter((ref) => heard.has(ref)).length;
    out.push({ sectionId: section.id, how: byEar * 2 > section.refs.length ? "heard" : "read" });
    // A section is known by its first paragraph, which names the paper and the section.
    log.done.push(section.refs[0]);
  }
  if (out.length > 0) save(log);
  return out;
}

export function clearDayLog(): void {
  try {
    window.localStorage.removeItem(DAY_LOG_KEY);
  } catch {
    // Storage is blocked: nothing is kept.
  }
}
