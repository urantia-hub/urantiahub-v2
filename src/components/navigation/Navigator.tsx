"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { track } from "@/analytics";
import { PARTS, paperPath, partNumeral, referenceHref, type PaperEntry } from "@/content/paper-index";
import { parseReference } from "@/lib/paper-url";
import { sectionLabel, type NavPaper, type NavSection } from "./nav-state";

type Props = {
  open: boolean;
  onClose: () => void;
  paper: { id: string; title: string };
  sections: NavSection[];
  current: string;
  previous: NavPaper | null;
  next: NavPaper | null;
  // A real navigation, so that the CSS :target state changes. Tests replace it.
  // `replace` is true when the destination takes the place of the navigator's own history entry.
  navigate?: (href: string, replace: boolean) => void;
};

const PAPER_PARTS = PARTS.filter((part) => part.id !== "0");

export function Navigator({
  open,
  onClose,
  paper,
  sections,
  current,
  previous,
  next,
  navigate = (href, replace) => (replace ? window.location.replace(href) : window.location.assign(href)),
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const leaving = useRef(false);
  const [tab, setTab] = useState<"this" | "all">("this");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<PaperEntry | null>(null);

  // The open navigator owns one history entry, so the back control closes it.
  // With a destination, that entry is replaced. A step back would make the browser
  // restore the old scroll position and undo the jump.
  const leave = useCallback(
    (href?: string) => {
      if (leaving.current) return;
      const ownsEntry = Boolean(window.history.state?.navigator);
      if (href) {
        leaving.current = true;
        onClose();
        navigate(href, ownsEntry);
      } else if (ownsEntry) {
        window.history.back();
      } else {
        onClose();
      }
    },
    [navigate, onClose],
  );

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      leaving.current = false;
      el.showModal();
      window.history.pushState({ navigator: true }, "");
    }
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("popstate", onClose);
    return () => window.removeEventListener("popstate", onClose);
  }, [open, onClose]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ref = parseReference(value);
    if (!ref) {
      setError("Use a form such as 99, 99:1, or 99:1.1.");
      return;
    }
    track("navigator_used", { kind: "reference" });
    leave(referenceHref(ref));
  }

  function goToSection(section: NavSection) {
    track("navigator_used", { kind: "section" });
    leave(
      section.id === "0"
        ? `${paperPath(paper.id)}#paper-top`
        : referenceHref({ paperId: paper.id, sectionId: section.id }),
    );
  }

  function goToPaper(href: string) {
    track("navigator_used", { kind: "paper" });
    leave(href);
  }

  return (
    <dialog
      ref={dialog}
      className="navigator"
      aria-label="Navigator"
      onClose={() => leave()}
      onClick={(event) => {
        if (event.target === dialog.current) leave();
      }}
    >
      <div className="sheet">
        <div className="sheet-top">
          <form className="goto" onSubmit={onSubmit}>
            <input
              aria-label="Go to a reference"
              placeholder="Go to a reference: 99:1.1"
              autoComplete="off"
              autoCapitalize="off"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
            />
            <button type="submit">Go</button>
          </form>
          <button type="button" className="close" onClick={() => leave()}>
            Close
          </button>
        </div>
        {error && (
          <p className="goto-error" role="alert">
            {error}
          </p>
        )}

        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "this"} onClick={() => setTab("this")}>
            This paper
          </button>
          <button type="button" role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>
            All papers
          </button>
        </div>

        {tab === "this" ? (
          <div className="pane" role="tabpanel" aria-label="This paper">
            <ul className="secs">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    aria-current={section.id === current ? "true" : undefined}
                    onClick={() => goToSection(section)}
                  >
                    {sectionLabel(section)}
                  </button>
                </li>
              ))}
            </ul>
            <div className="hop">
              {previous && (
                <button type="button" onClick={() => goToPaper(previous.href)}>
                  <small>Previous</small>
                  {previous.title}
                </button>
              )}
              {next && (
                <button type="button" onClick={() => goToPaper(next.href)}>
                  <small>Next</small>
                  {next.title}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="pane" role="tabpanel" aria-label="All papers">
            <button type="button" className="foreword" onClick={() => goToPaper(paperPath("0"))}>
              Foreword
            </button>
            {PAPER_PARTS.map((part) => (
              <div
                className="part-grid"
                role="group"
                aria-label={`Part ${partNumeral(part.id)}: ${part.title}`}
                key={part.id}
              >
                <p className="eyebrow">Part {partNumeral(part.id)}</p>
                <p className="part-title">{part.title}</p>
                <div className="grid">
                  {part.papers.map((entry) => (
                    <button
                      type="button"
                      key={entry.id}
                      className={entry.id === picked?.id ? "pick" : entry.id === paper.id ? "here" : undefined}
                      aria-pressed={entry.id === picked?.id}
                      onClick={() => setPicked(entry)}
                    >
                      {entry.id}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "all" && picked && (
          <div className="picked">
            <div>
              <small>Paper {picked.id}</small>
              <span>{picked.title}</span>
            </div>
            <button type="button" onClick={() => goToPaper(paperPath(picked.id))}>
              Open
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
