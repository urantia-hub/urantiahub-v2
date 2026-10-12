"use client";

import { Icon } from "@/components/icons";
import { ASK_PAPER_EVENT } from "@/reader/assistant";

// Below the title of a paper. The controls of the paper own the sheet, so this only asks for it.
// It keeps its room with no script, and shows when the controls run: see `.ask-paper` in reader.css.
export function AskPaperButton() {
  return (
    <button type="button" className="ask-paper" onClick={() => window.dispatchEvent(new Event(ASK_PAPER_EVENT))}>
      <Icon name="ask" />
      Ask an assistant about this paper
    </button>
  );
}
