type ShareData = { title: string; url: string };
type Nav = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText(text: string): Promise<void> };
};

// Sends a paragraph link: the share sheet where the browser has one, the clipboard where it has not.
// Returns what happened, so the caller can report it and show "Link copied".
export async function shareParagraph(data: ShareData, nav: Nav = navigator): Promise<"sheet" | "copy" | "none"> {
  if (typeof nav.share === "function") {
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
