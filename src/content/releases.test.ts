// @vitest-environment node
import { describe, expect, it } from "vitest";
import { RELEASES, type Release, releaseToNotify } from "./releases";

const at = (iso: string) => new Date(iso);
const list: Release[] = [
  { date: "2026-10-20", title: "Quiet", changes: ["A small thing."] },
  { date: "2026-10-18", title: "Offline", changes: ["Read with no connection."], notify: true },
  { date: "2026-10-01", title: "Old", changes: ["An old thing."], notify: true },
];

describe("the release that readers hear of", () => {
  it("is the newest marked release, from its date and for three days after", () => {
    expect(releaseToNotify(at("2026-10-18T00:00:00Z"), list)?.title).toBe("Offline");
    expect(releaseToNotify(at("2026-10-21T23:59:00Z"), list)?.title).toBe("Offline");
  });

  it("is none before the date, after the days, or with no mark", () => {
    expect(releaseToNotify(at("2026-10-17T23:59:00Z"), list)).toBeNull();
    expect(releaseToNotify(at("2026-10-22T00:00:00Z"), list)).toBeNull();
    expect(releaseToNotify(at("2026-10-20T12:00:00Z"), [list[0]])).toBeNull();
  });

  it("is none for a date that is not a date", () => {
    expect(releaseToNotify(at("2026-10-18T12:00:00Z"), [{ date: "soon", title: "X", changes: ["Y"], notify: true }])).toBeNull();
  });

  it("each release of the site has a date, a title, and a change", () => {
    for (const release of RELEASES) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.title.length).toBeGreaterThan(0);
      expect(release.changes.length).toBeGreaterThan(0);
    }
  });
});
