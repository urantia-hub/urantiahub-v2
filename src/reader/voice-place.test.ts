import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearVoicePlace, readVoicePlace, saveVoicePlace } from "./voice-place";

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(1_000_000);
});
afterEach(() => vi.useRealTimers());

describe("the place where the voice stopped", () => {
  it("keeps the paper and the paragraph", () => {
    saveVoicePlace({ paperId: "1", ref: "1:2.3" });
    expect(readVoicePlace()).toMatchObject({ paperId: "1", ref: "1:2.3" });
  });

  it("gives the same value while the stored text is the same", () => {
    saveVoicePlace({ paperId: "1", ref: "1:2.3" });
    expect(readVoicePlace()).toBe(readVoicePlace());
  });

  it("forgets a place after 30 days", () => {
    saveVoicePlace({ paperId: "1", ref: "1:2.3" });
    vi.setSystemTime(1_000_000 + 31 * DAY);
    expect(readVoicePlace()).toBeNull();
  });

  it("forgets the place when cleared, and reads a broken value as nothing", () => {
    saveVoicePlace({ paperId: "1", ref: "1:2.3" });
    clearVoicePlace();
    expect(readVoicePlace()).toBeNull();
    window.localStorage.setItem("hub:voice-place", "{not json");
    expect(readVoicePlace()).toBeNull();
  });
});
