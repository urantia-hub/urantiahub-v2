import { describe, expect, it, vi } from "vitest";
import { shareParagraph } from "./share";

const data = { title: "1:0.3 · Paper 1, The Universal Father", url: "https://next.urantiahub.com/papers/paper-1-the-universal-father#1:0.3" };

describe("shareParagraph", () => {
  it("opens the share sheet where the browser has one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    await expect(shareParagraph(data, { share, clipboard: { writeText } }, true)).resolves.toBe("sheet");
    expect(share).toHaveBeenCalledWith(data);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("does nothing more when the reader closes the sheet", async () => {
    const share = vi.fn().mockRejectedValue({ name: "AbortError" });
    const writeText = vi.fn();
    await expect(shareParagraph(data, { share, clipboard: { writeText } }, true)).resolves.toBe("none");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the link when the sheet fails for another reason", async () => {
    const share = vi.fn().mockRejectedValue({ name: "NotAllowedError" });
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareParagraph(data, { share, clipboard: { writeText } }, true)).resolves.toBe("copy");
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  // On a computer the share window of the browser is odd. A link in the clipboard is what a reader expects.
  it("copies the link on a device with no touch, although the browser has a share sheet", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareParagraph(data, { share, clipboard: { writeText } }, false)).resolves.toBe("copy");
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it("copies the link where the browser has no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareParagraph(data, { clipboard: { writeText } }, true)).resolves.toBe("copy");
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it("reports nothing when the clipboard is blocked or absent", async () => {
    await expect(shareParagraph(data, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) } })).resolves.toBe("none");
    await expect(shareParagraph(data, {})).resolves.toBe("none");
  });
});
