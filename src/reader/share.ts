type ShareData = { title: string; url: string };
type Nav = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText(text: string): Promise<void> };
};

// A phone or a tablet: the share sheet of the device is what its reader knows.
const touch = () => typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches ?? false);

// Sends a paragraph link: the share sheet on a touch device that has one, the clipboard on each other.
// On a computer the share window of the browser is odd, and a copied link is what a reader expects.
// Returns what happened, so the caller can report it and show "Link copied".
export async function shareParagraph(data: ShareData, nav: Nav = navigator, sheet: boolean = touch()): Promise<"sheet" | "copy" | "none"> {
  if (sheet && typeof nav.share === "function") {
    try {
      await nav.share(data);
      return "sheet";
    } catch (error) {
      // The reader closed the sheet. That is a choice, not a fault.
      if ((error as { name?: string } | null)?.name === "AbortError") return "none";
    }
  }
  try {
    if (!nav.clipboard) return "none";
    await nav.clipboard.writeText(data.url);
    return "copy";
  } catch {
    return "none";
  }
}
