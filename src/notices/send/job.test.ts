// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { paperById } from "@/content/paper-index";
import { messages } from "@/i18n/messages";
import type { Reader } from "@/notices/due";
import { type Claim, type JobDeps, type OutMail, type Push, runNotices, runSamples } from "./job";

const A = "00000000-0000-4000-8000-0000000000a1";
const B = "00000000-0000-4000-8000-0000000000b2";
const NOW = new Date("2026-10-11T12:00:00Z"); // 7:00 in Chicago
const OFF = { daily: false, reminder: false, releases: false };
const ALL = { daily: true, reminder: true, releases: true };
const device = (name: string, kinds = ["daily"]) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${name}`, p256dh: "p", auth: "a", kinds });
// Each push is on. A reader of a test gets a push when the test gives the reader a device.
const reader = (userId: string, over: Partial<Reader> = {}): Reader => ({ userId, email: `${userId.slice(-2)}@example.com`, settings: { email: { ...OFF, daily: true }, push: ALL, hour: 7, zone: "America/Chicago" }, place: null, devices: [], ...over });

function world(readers: Reader[], over: Partial<JobDeps> = {}) {
  const log: Claim[] = [];
  const out = { mails: [] as OutMail[], pushes: [] as { endpoint: string; push: Push }[], released: [] as Claim[], devices: [] as { gone: string[]; ok: string[] }[], passages: [] as string[] };
  const deps: JobDeps = {
    now: NOW,
    origin: "https://www.urantiahub.com",
    only: null,
    readers: async () => readers,
    claim: async (claims) => {
      const fresh = claims.filter((c) => !log.some((had) => JSON.stringify(had) === JSON.stringify(c)));
      log.push(...fresh);
      return fresh;
    },
    release: async (claims) => void out.released.push(...claims),
    devices: async (report) => void out.devices.push(report),
    passage: async (ref) => {
      out.passages.push(ref);
      return { ref, text: "A passage of the Papers.", paperId: ref.split(":")[0], paperTitle: "A Paper" };
    },
    sendMails: async (mails) => {
      out.mails.push(...mails);
      return mails.map(() => true);
    },
    sendPush: async (to, push) => {
      out.pushes.push({ endpoint: to.endpoint, push });
      return "ok";
    },
    readerKey: async (userId) => `key-of-${userId.slice(-2)}`,
    offUrl: (userId, kind) => `https://www.urantiahub.com/emails?off=${userId.slice(-2)}-${kind}`,
    offPost: (userId, kind) => `https://www.urantiahub.com/api/notices/off?token=${userId.slice(-2)}-${kind}`,
    ...over,
  };
  return { deps, out, log };
}

describe("one run of the notices", () => {
  it("sends the daily passage by email to each reader who is due, with a link to turn it off", async () => {
    const { deps, out } = world([reader(A), reader(B, { settings: { email: { ...OFF, daily: true }, push: ALL, hour: 9, zone: "America/Chicago" } })]);
    expect(await runNotices(deps)).toEqual({ readers: 2, due: 1, claimed: 1, mails: 1, pushes: 0, failed: 0, gone: 0 });
    expect(out.mails).toHaveLength(1);
    expect(out.mails[0].to).toBe("a1@example.com");
    expect(out.mails[0].offUrl).toBe("https://www.urantiahub.com/emails?off=a1-daily");
    expect(out.mails[0].offPost).toBe("https://www.urantiahub.com/api/notices/off?token=a1-daily");
    expect(out.mails[0].text).toContain("https://www.urantiahub.com/notifications");
    expect(out.mails[0].text).toMatch(/Read the paper: https:\/\/www\.urantiahub\.com\/papers\/[a-z0-9-]+#\d+:\d+\.\d+/);
  });

  it("sends one notice one time: a second run in the same hour sends nothing", async () => {
    const { deps, out } = world([reader(A)]);
    await runNotices(deps);
    expect(await runNotices({ ...deps, now: new Date("2026-10-11T12:15:00Z") })).toMatchObject({ due: 1, claimed: 0, mails: 0 });
    expect(out.mails).toHaveLength(1);
  });

  it("reads the passage one time for each date, for all readers", async () => {
    const { deps, out } = world([reader(A), reader(B)]);
    await runNotices(deps);
    expect(out.passages).toHaveLength(1);
    expect(out.mails).toHaveLength(2);
  });

  it("sends a push to each device of the reader, and names the reader in it", async () => {
    const both = reader(A, { devices: [device("one"), device("two")] });
    const { deps, out } = world([both]);
    expect(await runNotices(deps)).toMatchObject({ due: 2, claimed: 2, mails: 1, pushes: 1 });
    expect(out.pushes.map((p) => p.endpoint)).toEqual([device("one").endpoint, device("two").endpoint]);
    expect(out.pushes[0].push).toMatchObject({ for: "key-of-a1", title: "Your passage for today" });
    expect(out.pushes[0].push.path).toMatch(/^\/papers\/[a-z0-9-]+#\d+:\d+\.\d+$/);
    expect(out.devices).toEqual([{ gone: [], ok: [device("one").endpoint, device("two").endpoint] }]);
  });

  it("cuts a long passage in a push, and keeps the reference", async () => {
    const { deps, out } = world([reader(A, { settings: { email: OFF, push: ALL, hour: 7, zone: "America/Chicago" }, devices: [device("one")] })], {
      passage: async (ref) => ({ ref, text: "word ".repeat(100), paperId: ref.split(":")[0], paperTitle: "A Paper" }),
    });
    await runNotices(deps);
    expect(out.pushes[0].push.body.length).toBeLessThan(170);
    expect(out.pushes[0].push.body).toMatch(/… \(\d+:\d+\.\d+\)$/);
  });

  it("reports a device that is gone, and does not try that notice again", async () => {
    const { deps, out } = world([reader(A, { settings: { email: OFF, push: ALL, hour: 7, zone: "America/Chicago" }, devices: [device("old")] })], { sendPush: async () => "gone" });
    expect(await runNotices(deps)).toMatchObject({ pushes: 0, failed: 0, gone: 1 });
    expect(out.devices).toEqual([{ gone: [device("old").endpoint], ok: [] }]);
    expect(out.released).toEqual([]);
  });

  it("gives a notice back when it could not be sent, so the next run tries again", async () => {
    const { deps, out } = world([reader(A, { devices: [device("one")] })], { sendMails: async (mails) => mails.map(() => false), sendPush: async () => "failed" });
    expect(await runNotices(deps)).toMatchObject({ claimed: 2, mails: 0, pushes: 0, failed: 2 });
    expect(out.released.map((c) => c.channel).sort()).toEqual(["email", "push"]);
  });

  it("gives the notices back when the mail service throws, or when the passage cannot be read", async () => {
    const thrown = world([reader(A)], { sendMails: async () => Promise.reject(new Error("down")) });
    expect(await runNotices(thrown.deps)).toMatchObject({ mails: 0, failed: 1 });
    const noPassage = world([reader(A)], { passage: async () => Promise.reject(new Error("down")) });
    expect(await runNotices(noPassage.deps)).toMatchObject({ mails: 0, failed: 1 });
    expect(noPassage.out.mails).toEqual([]);
  });

  it("does not hide what was sent when the report to the account fails", async () => {
    const { deps } = world([reader(A, { devices: [device("one")] })], { devices: async () => Promise.reject(new Error("down")), release: async () => Promise.reject(new Error("down")) });
    expect(await runNotices(deps)).toMatchObject({ mails: 1, pushes: 1 });
  });

  it("sends the reminder with a link to the place", async () => {
    const place = { paperId: "2", sectionId: "1", at: NOW.getTime() - 8 * 86_400_000 };
    const at12 = new Date("2026-10-11T17:00:00Z");
    const { deps, out } = world([reader(A, { settings: { email: { ...OFF, reminder: true }, push: ALL, hour: 3, zone: "America/Chicago" }, place, devices: [device("one", ["reminder"])] })], { now: at12 });
    expect(await runNotices(deps)).toMatchObject({ due: 2, mails: 1, pushes: 1 });
    expect(out.mails[0].subject).toBe("Your place in the Papers");
    expect(out.mails[0].offUrl).toContain("a1-reminder");
    expect(out.pushes[0].push).toMatchObject({ for: "key-of-a1", title: "Your place in Paper 2, The Nature of God", body: "A passage of the Papers …" });
    expect(out.pushes[0].push.path).toMatch(/^\/papers\/paper-2-/);
    // The first paragraph of the section where the reader stopped.
    expect(out.passages).toEqual(["2:1.1", "2:1.1"]);
    expect(out.mails[0].text).toContain("A passage of the Papers …");
  });

  it("sends the reminder with the name of the paper when the words of the section cannot be read", async () => {
    const place = { paperId: "2", sectionId: "1", at: NOW.getTime() - 8 * 86_400_000 };
    const { deps, out } = world([reader(A, { settings: { email: { ...OFF, reminder: true }, push: ALL, hour: 3, zone: "America/Chicago" }, place })], { now: new Date("2026-10-11T17:00:00Z"), passage: async () => Promise.reject(new Error("down")) });
    expect(await runNotices(deps)).toMatchObject({ mails: 1, failed: 0 });
    expect(out.mails[0].text).toContain("You stopped in Paper 2, The Nature of God.");
  });

  it("sends only to the readers of the list while the list is set", async () => {
    const { deps, out } = world([reader(A), reader(B)], { only: [B] });
    expect(await runNotices(deps)).toMatchObject({ readers: 1, mails: 1 });
    expect(out.mails[0].to).toBe("b2@example.com");
    const none = world([reader(A)], { only: [] });
    expect(await runNotices(none.deps)).toMatchObject({ readers: 0, due: 0 });
    expect(vi.isMockFunction(none.deps.claim)).toBe(false);
  });
});

describe("the samples", () => {
  it("are one of each email, to one address, with no claim and no reader", async () => {
    const { deps, out, log } = world([reader(A)]);
    expect(await runSamples(deps, "kelson@example.com", A, "11:1.3")).toEqual({ mails: 3, sent: 3 });
    expect(out.mails.map((mail) => mail.to)).toEqual(["kelson@example.com", "kelson@example.com", "kelson@example.com"]);
    expect(out.mails.map((mail) => mail.subject)).toEqual([expect.stringMatching(/^Your passage for today · /), "Your passage for today · 11:1.3", "Your place in the Papers"]);
    expect(out.mails[2].offUrl).toContain("a1-reminder");
    expect(log).toEqual([]);
    expect(out.pushes).toEqual([]);
  });

  it("are in Spanish when asked, with the Spanish passage and paper, and no release with no Spanish words", async () => {
    const { deps, out, log } = world([]);
    const asked: string[] = [];
    deps.passage = async (ref, lang) => {
      asked.push(lang);
      return { ref, text: "Un pasaje.", paperId: ref.split(":")[0], paperTitle: "Un documento" };
    };
    const news = { date: "2026-10-11", title: "Read offline", changes: ["Keep the Papers."] };
    expect(await runSamples(deps, "me@example.com", A, "11:1.3", news, "es")).toEqual({ mails: 3, sent: 3 });
    const es = messages("es").mail;
    expect(out.mails.map((mail) => mail.subject)).toEqual([expect.stringMatching(/^Tu pasaje de hoy · /), es.dailySubject("11:1.3"), es.reminderSubject]);
    expect(out.mails[0].text).toContain(messages("es").spanishLine);
    expect(out.mails[0].text).toMatch(/https:\/\/www\.urantiahub\.com\/es\/documentos\//);
    expect(out.mails[2].text).toMatch(/https:\/\/www\.urantiahub\.com\/es\/documentos\/documento-2-/);
    expect(new Set(asked)).toEqual(new Set(["es"]));
    expect(log).toEqual([]);
    const withEs = world([]);
    expect(await runSamples(withEs.deps, "me@example.com", A, "11:1.3", { ...news, es: { title: "Sin conexión", changes: ["Guarda los Documentos."] } }, "es")).toEqual({ mails: 4, sent: 4 });
    expect(withEs.out.mails[3].subject).toBe(es.releaseSubject("Sin conexión"));
    expect(withEs.out.mails[3].text).toContain("11 de octubre de 2026");
  });
});

describe("the release notice", () => {
  const news = { date: "2026-10-11", title: "Read offline", changes: ["Keep the Papers on a device.", "Share the exact words."] };
  // 10:00 in Chicago.
  const DAY = new Date("2026-10-11T15:00:00Z");
  const wants = (userId: string, over: Partial<Reader> = {}) => reader(userId, { settings: { email: { ...OFF, releases: true }, push: { ...OFF, releases: true }, hour: 7, zone: "America/Chicago" }, ...over });

  it("goes by email with the title, each change, and a link to the releases page", async () => {
    const { deps, out } = world([wants(A)], { now: DAY, news });
    expect(await runNotices(deps)).toMatchObject({ due: 1, claimed: 1, mails: 1, failed: 0 });
    const mail = out.mails[0];
    expect(mail.subject).toBe("New in UrantiaHub: Read offline");
    expect(mail.text).toContain("Keep the Papers on a device.");
    expect(mail.text).toContain("Share the exact words.");
    expect(mail.text).toContain("See what is new: https://www.urantiahub.com/releases");
    expect(mail.html).toContain("Share the exact words.");
    expect(mail.offUrl).toBe("https://www.urantiahub.com/emails?off=a1-releases");
    expect(out.passages).toEqual([]);
  });

  it("goes as a push that opens the releases page", async () => {
    const { deps, out } = world([wants(A, { email: null, devices: [device("one")] })], { now: DAY, news });
    expect(await runNotices(deps)).toMatchObject({ due: 1, pushes: 1 });
    expect(out.pushes[0].push).toEqual({ for: "key-of-a1", title: "New in UrantiaHub: Read offline", body: "Keep the Papers on a device.", path: "/releases" });
  });

  it("goes one time: a second run sends nothing", async () => {
    const { deps, out } = world([wants(A)], { now: DAY, news });
    await runNotices(deps);
    await runNotices({ ...deps, now: new Date("2026-10-12T15:00:00Z") });
    expect(out.mails).toHaveLength(1);
  });

  it("does not go with no release", async () => {
    const { deps, out } = world([wants(A)], { now: DAY });
    expect(await runNotices(deps)).toMatchObject({ due: 0 });
    expect(out.mails).toEqual([]);
  });

  it("keeps a mark of HTML in a change as text", async () => {
    const { deps, out } = world([wants(A)], { now: DAY, news: { ...news, changes: ["<b>bold</b> & more"] } });
    await runNotices(deps);
    expect(out.mails[0].html).toContain("&lt;b&gt;bold&lt;/b&gt; &amp; more");
  });
});

describe("the sample of the release email", () => {
  it("is added to the samples when a release is given", async () => {
    const { deps, out } = world([]);
    expect(await runSamples(deps, "me@example.com", A, "11:1.3", { date: "2026-10-11", title: "Notifications", changes: ["A passage each day."] })).toEqual({ mails: 4, sent: 4 });
    expect(out.mails[3].subject).toBe("New in UrantiaHub: Notifications");
    expect(out.mails[3].text).toContain("October 11, 2026");
  });
});

describe("the streak push", () => {
  it("sends the text of the streak to each device, with no email", async () => {
    const night = new Date("2026-10-21T04:00:00Z");
    const keeper = reader(A, {
      settings: { email: { ...OFF }, push: { ...OFF, streak: true }, hour: 7, zone: "America/Chicago" },
      devices: [device("one")],
      streak: { on: true, asked: true, goal: 1, goals: [{ from: "2026-09-01", goal: 1 }], hour: 23, zone: "America/Chicago", since: "2026-09-01", longest: 0, marks: {}, at: 1 },
      sectionDays: [{ day: "2026-10-19", count: 1 }],
      lastSection: { paperId: "3", sectionId: "3" },
    });
    const { deps, out, log } = world([keeper], { now: night });
    expect(await runNotices(deps)).toMatchObject({ due: 1, claimed: 1, mails: 0, pushes: 1 });
    expect(log).toEqual([{ userId: A, kind: "streak", key: "2026-10-20", channel: "push" }]);
    expect(out.pushes[0].push).toEqual({ for: "key-of-a1", title: "Keep your 1-day streak 🔥", body: "Listen to “God’s Limitlessness” before you sleep · about 7 minutes", path: "/papers/paper-3-the-attributes-of-god#3:4" });
    // A second run in the same night sends nothing.
    await runNotices(deps);
    expect(out.pushes).toHaveLength(1);
  });
});

describe("a Spanish reader", () => {
  const es = messages("es");
  const spanish = (userId: string, over: Partial<Reader> = {}) => reader(userId, { lang: "es", ...over });
  const asked: [string, string][] = [];
  const passage = async (ref: string, lang: "en" | "es") => {
    asked.push([ref, lang]);
    return { ref, text: lang === "es" ? "Un pasaje de los Documentos." : "A passage of the Papers.", paperId: ref.split(":")[0], paperTitle: lang === "es" ? "Un documento" : "A Paper" };
  };

  it("gets the daily passage in Spanish, and an English reader in the same run gets it in English", async () => {
    asked.length = 0;
    const { deps, out } = world([spanish(A, { devices: [device("one")] }), reader(B)], { passage });
    await runNotices(deps);
    const ref = asked[0][0];
    expect(asked.map(([, lang]) => lang).sort()).toEqual(["en", "es"]);
    const [mine, theirs] = [out.mails.find((m) => m.to === "a1@example.com")!, out.mails.find((m) => m.to === "b2@example.com")!];
    expect(mine.subject).toBe(es.mail.dailySubject(ref));
    expect(mine.text).toContain("Un pasaje de los Documentos.");
    expect(mine.text).toContain(es.spanishLine);
    expect(mine.text).toMatch(new RegExp(`${es.mail.readPaper}: https://www\\.urantiahub\\.com/es/documentos/[a-z0-9-]+#${ref.replace(".", "\\.")}`));
    expect(out.pushes[0].push.title).toBe(es.mail.dailyPush);
    expect(out.pushes[0].push.path).toMatch(/^\/es\/documentos\//);
    expect(theirs.subject).toBe(`Your passage for today · ${ref}`);
    expect(theirs.text).toContain("A passage of the Papers.");
  });

  it("gets no daily notice when the Spanish passage cannot be read, and the claim goes back", async () => {
    const { deps, out } = world([spanish(A), reader(B)], {
      passage: async (ref, lang) => (lang === "es" ? Promise.reject(new Error("down")) : passage(ref, lang)),
    });
    expect(await runNotices(deps)).toMatchObject({ mails: 1, failed: 1 });
    expect(out.mails.map((m) => m.to)).toEqual(["b2@example.com"]);
    expect(out.released).toEqual([expect.objectContaining({ userId: A, kind: "daily" })]);
  });

  it("gets the reminder in Spanish, with the Spanish name of the paper", async () => {
    const place = { paperId: "2", sectionId: "1", at: NOW.getTime() - 8 * 86_400_000 };
    const { deps, out } = world([spanish(A, { settings: { email: { ...OFF, reminder: true }, push: ALL, hour: 3, zone: "America/Chicago" }, place, devices: [device("one", ["reminder"])] })], { now: new Date("2026-10-11T17:00:00Z"), passage });
    await runNotices(deps);
    const name = `Documento 2, ${paperById("2", "es")!.title}`;
    expect(out.mails[0].subject).toBe(es.mail.reminderSubject);
    expect(out.pushes[0].push.title).toBe(es.mail.placePush(name));
    expect(out.pushes[0].push.path).toMatch(/^\/es\/documentos\/documento-2-/);
    expect(asked).toContainEqual(["2:1.1", "es"]);
  });

  const DAY = new Date("2026-10-11T15:00:00Z");
  const wants = (userId: string, over: Partial<Reader> = {}) => reader(userId, { settings: { email: { ...OFF, releases: true }, push: { ...OFF, releases: true }, hour: 7, zone: "America/Chicago" }, ...over });
  const news = { date: "2026-10-11", title: "Read offline", changes: ["Keep the Papers on a device."] };

  it("gets a release in Spanish when the release has Spanish words", async () => {
    const { deps, out } = world([wants(A, { lang: "es", devices: [device("one")] })], { now: DAY, news: { ...news, es: { title: "Sin conexión", changes: ["Guarda los Documentos en un dispositivo."] } } });
    await runNotices(deps);
    expect(out.mails[0].subject).toBe(es.mail.releaseSubject("Sin conexión"));
    expect(out.mails[0].text).toContain("Guarda los Documentos en un dispositivo.");
    expect(out.mails[0].text).toContain("11 de octubre de 2026");
    expect(out.pushes[0].push).toMatchObject({ title: es.mail.releaseSubject("Sin conexión"), body: "Guarda los Documentos en un dispositivo." });
  });

  it("gets no release with no Spanish words, and an English reader still gets it", async () => {
    const { deps, out } = world([wants(A, { lang: "es" }), wants(B)], { now: DAY, news });
    expect(await runNotices(deps)).toMatchObject({ due: 1, mails: 1, failed: 0 });
    expect(out.mails.map((m) => m.to)).toEqual(["b2@example.com"]);
  });
});
