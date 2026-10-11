// @vitest-environment node
import { describe, expect, it } from "vitest";
import passages from "@/content/daily-passages.json";
import { dueNotices, localTime, passageFor, type Reader } from "./due";

const at = (iso: string) => new Date(iso);
const OFF = { daily: false, reminder: false, releases: false };
const device = (kinds: string[]) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${kinds.join("-") || "none"}`, p256dh: "p", auth: "a", kinds });
const reader = (over: Partial<Reader> = {}): Reader => ({
  userId: "00000000-0000-4000-8000-0000000000a1",
  email: "reader@example.com",
  settings: { email: { ...OFF, daily: true }, hour: 7, zone: "America/Chicago" },
  place: null,
  devices: [],
  ...over,
});
const kinds = (list: ReturnType<typeof dueNotices>) => list.map((n) => `${n.kind}/${n.channel}/${n.key}`);

describe("the local time of a reader", () => {
  it("is the date and the hour in the reader's zone", () => {
    expect(localTime(at("2026-10-11T12:05:00Z"), "America/Chicago")).toEqual({ date: "2026-10-11", hour: 7 });
    expect(localTime(at("2026-10-11T01:35:00Z"), "Asia/Kolkata")).toEqual({ date: "2026-10-11", hour: 7 });
    expect(localTime(at("2026-10-10T20:00:00Z"), "Australia/Sydney")).toEqual({ date: "2026-10-11", hour: 7 });
    expect(localTime(at("2026-10-11T00:30:00Z"), "America/Chicago")).toEqual({ date: "2026-10-10", hour: 19 });
    expect(localTime(at("2026-10-11T04:00:00Z"), "UTC")).toEqual({ date: "2026-10-11", hour: 4 });
  });

  it("follows the change of the clock: the same local hour before and after", () => {
    // Chicago: UTC-5 until November 1, 2026, then UTC-6.
    expect(localTime(at("2026-10-31T12:00:00Z"), "America/Chicago").hour).toBe(7);
    expect(localTime(at("2026-11-02T13:00:00Z"), "America/Chicago").hour).toBe(7);
  });

  it("is UTC for a zone that the runtime does not know", () => {
    expect(localTime(at("2026-10-11T04:00:00Z"), "Mars/Olympus")).toEqual({ date: "2026-10-11", hour: 4 });
  });
});

describe("the daily passage", () => {
  it("is due in the reader's hour only, with the local date as its key", () => {
    expect(kinds(dueNotices(reader(), at("2026-10-11T12:00:00Z")))).toEqual(["daily/email/2026-10-11"]);
    expect(kinds(dueNotices(reader(), at("2026-10-11T12:45:00Z")))).toEqual(["daily/email/2026-10-11"]);
    expect(dueNotices(reader(), at("2026-10-11T11:59:00Z"))).toEqual([]);
    expect(dueNotices(reader(), at("2026-10-11T13:00:00Z"))).toEqual([]);
  });

  it("comes within the hour in a zone with a half-hour offset", () => {
    const india = reader({ settings: { email: { ...OFF, daily: true }, hour: 7, zone: "Asia/Kolkata" } });
    expect(dueNotices(india, at("2026-10-11T01:15:00Z"))).toEqual([]);
    expect(kinds(dueNotices(india, at("2026-10-11T01:30:00Z")))).toEqual(["daily/email/2026-10-11"]);
  });

  it("goes by email, as a push to each device of the reader, or both", () => {
    const PUSH = { ...OFF, daily: true };
    const both = reader({ settings: { email: { ...OFF, daily: true }, push: PUSH, hour: 7, zone: "America/Chicago" }, devices: [device([]), device(["x"])] });
    const due = dueNotices(both, at("2026-10-11T12:00:00Z"));
    expect(kinds(due)).toEqual(["daily/email/2026-10-11", "daily/push/2026-10-11"]);
    expect(due[1].devices).toHaveLength(2);
    const pushOnly = reader({ settings: { email: OFF, push: PUSH, hour: 7, zone: "America/Chicago" }, devices: [device([])] });
    expect(kinds(dueNotices(pushOnly, at("2026-10-11T12:00:00Z")))).toEqual(["daily/push/2026-10-11"]);
  });

  it("sends no push with no device, with the push off, or for a record from before push was a setting", () => {
    const noon = at("2026-10-11T12:00:00Z");
    expect(dueNotices(reader({ settings: { email: OFF, push: { ...OFF, daily: true }, hour: 7, zone: "America/Chicago" } }), noon)).toEqual([]);
    expect(dueNotices(reader({ settings: { email: OFF, push: { ...OFF, reminder: true }, hour: 7, zone: "America/Chicago" }, devices: [device([])] }), noon)).toEqual([]);
    expect(dueNotices(reader({ settings: { email: OFF, hour: 7, zone: "America/Chicago" }, devices: [device(["daily"])] }), noon)).toEqual([]);
  });

  it("does not go by email to a reader with no address, and sends nothing to a reader with no settings", () => {
    expect(dueNotices(reader({ email: null }), at("2026-10-11T12:00:00Z"))).toEqual([]);
    expect(dueNotices(reader({ settings: null, devices: [device([])] }), at("2026-10-11T07:10:00Z"))).toEqual([]);
  });
});

describe("the reminder", () => {
  const DAY = 86_400_000;
  const now = at("2026-10-11T17:00:00Z"); // 12:00 in Chicago
  const left = (days: number) => ({ paperId: "2", sectionId: "1", at: now.getTime() - days * DAY });
  const on = (place: unknown, over: Partial<Reader> = {}) => reader({ settings: { email: { ...OFF, reminder: true }, hour: 3, zone: "America/Chicago" }, place, ...over });

  it("is due after seven days with no reading, one time for one place", () => {
    const due = dueNotices(on(left(8)), now);
    expect(kinds(due)).toEqual([`reminder/email/${left(8).at}`]);
    expect(due[0].place).toEqual({ paperId: "2", sectionId: "1" });
  });

  it("is not due before seven days, after thirty, or for a reader with no place", () => {
    expect(dueNotices(on(left(6.9)), now)).toEqual([]);
    expect(dueNotices(on(left(31)), now)).toEqual([]);
    expect(dueNotices(on(null), now)).toEqual([]);
    expect(dueNotices(on({ paperId: "999", sectionId: "1", at: left(8).at }), now)).toEqual([]);
    expect(dueNotices(on("x"), now)).toEqual([]);
  });

  it("comes only in the day of the reader, from 9:00 to 20:00", () => {
    expect(dueNotices(on(left(8)), at("2026-10-11T13:59:00Z"))).toEqual([]); // 8:59
    expect(dueNotices(on(left(8)), at("2026-10-11T14:00:00Z"))).toHaveLength(1); // 9:00
    expect(dueNotices(on(left(8)), at("2026-10-12T00:59:00Z"))).toHaveLength(1); // 19:59
    expect(dueNotices(on(left(8)), at("2026-10-12T01:00:00Z"))).toEqual([]); // 20:00
  });
});

describe("the passage of a date", () => {
  it("is the same for each reader on one date, and moves one place each day", () => {
    const list = ["a", "b", "c"];
    expect(passageFor("2026-01-01", list)).toBe("a");
    expect(passageFor("2026-01-02", list)).toBe("b");
    expect(passageFor("2026-01-04", list)).toBe("a");
    expect(passageFor("2025-12-31", list)).toBe("c");
    expect(passageFor("not a date", list)).toBe("a");
  });

  it("comes from the list of 119 that Kelson chose: each a reference, and each one time", () => {
    expect(passages).toHaveLength(119);
    expect(new Set(passages).size).toBe(119);
    for (const ref of passages) expect(ref).toMatch(/^\d{1,3}:\d{1,3}\.\d{1,3}$/);
    expect(passages).toContain(passageFor("2026-10-11"));
  });
});
