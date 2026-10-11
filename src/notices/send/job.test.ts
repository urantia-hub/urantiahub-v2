// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Reader } from "@/notices/due";
import { type Claim, type JobDeps, type OutMail, type Push, runNotices, runSamples } from "./job";

const A = "00000000-0000-4000-8000-0000000000a1";
const B = "00000000-0000-4000-8000-0000000000b2";
const NOW = new Date("2026-10-11T12:00:00Z"); // 7:00 in Chicago
const OFF = { daily: false, reminder: false, releases: false };
const device = (name: string, kinds = ["daily"]) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${name}`, p256dh: "p", auth: "a", kinds });
const reader = (userId: string, over: Partial<Reader> = {}): Reader => ({ userId, email: `${userId.slice(-2)}@example.com`, settings: { email: { ...OFF, daily: true }, hour: 7, zone: "America/Chicago" }, place: null, devices: [], ...over });

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
    const { deps, out } = world([reader(A), reader(B, { settings: { email: { ...OFF, daily: true }, hour: 9, zone: "America/Chicago" } })]);
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

  it("sends a push to each device that has the notice, and names the reader in it", async () => {
    const both = reader(A, { devices: [device("one"), device("two"), device("other", ["releases"])] });
    const { deps, out } = world([both]);
    expect(await runNotices(deps)).toMatchObject({ due: 2, claimed: 2, mails: 1, pushes: 1 });
    expect(out.pushes.map((p) => p.endpoint)).toEqual([device("one").endpoint, device("two").endpoint]);
    expect(out.pushes[0].push).toMatchObject({ for: "key-of-a1", title: "A passage for today" });
    expect(out.pushes[0].push.path).toMatch(/^\/papers\/[a-z0-9-]+#\d+:\d+\.\d+$/);
    expect(out.devices).toEqual([{ gone: [], ok: [device("one").endpoint, device("two").endpoint] }]);
  });

  it("cuts a long passage in a push, and keeps the reference", async () => {
    const { deps, out } = world([reader(A, { settings: { email: OFF, hour: 7, zone: "America/Chicago" }, devices: [device("one")] })], {
      passage: async (ref) => ({ ref, text: "word ".repeat(100), paperId: ref.split(":")[0], paperTitle: "A Paper" }),
    });
    await runNotices(deps);
    expect(out.pushes[0].push.body.length).toBeLessThan(170);
    expect(out.pushes[0].push.body).toMatch(/… \(\d+:\d+\.\d+\)$/);
  });

  it("reports a device that is gone, and does not try that notice again", async () => {
    const { deps, out } = world([reader(A, { settings: { email: OFF, hour: 7, zone: "America/Chicago" }, devices: [device("old")] })], { sendPush: async () => "gone" });
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
    const { deps, out } = world([reader(A, { settings: { email: { ...OFF, reminder: true }, hour: 3, zone: "America/Chicago" }, place, devices: [device("one", ["reminder"])] })], { now: at12 });
    expect(await runNotices(deps)).toMatchObject({ due: 2, mails: 1, pushes: 1 });
    expect(out.mails[0].subject).toBe("Your place in the Papers");
    expect(out.mails[0].offUrl).toContain("a1-reminder");
    expect(out.pushes[0].push).toMatchObject({ for: "key-of-a1", title: "Your place in the Papers" });
    expect(out.pushes[0].push.path).toMatch(/^\/papers\/paper-2-/);
    expect(out.passages).toEqual([]);
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
    expect(out.mails.map((mail) => mail.subject)).toEqual([expect.stringMatching(/^A passage for today · /), "A passage for today · 11:1.3", "Your place in the Papers"]);
    expect(out.mails[2].offUrl).toContain("a1-reminder");
    expect(log).toEqual([]);
    expect(out.pushes).toEqual([]);
  });
});
