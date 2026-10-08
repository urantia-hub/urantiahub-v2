"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import { paperById, referenceHref } from "@/content/paper-index";
import { parseReference, referenceProblem } from "@/lib/paper-url";
import { normalizeQuery, searchHref } from "@/search/query";
import { saveRecent } from "@/search/recent";
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

// A neighbor paper as a card: its number above its full title.
function neighbor(entry: NavPaper, direction: "Previous" | "Next") {
  const title = paperById(entry.id)?.title ?? entry.title;
  const numbered = entry.id !== "0";
  return {
    title,
    small: numbered ? `Paper ${entry.id}` : direction,
    name: `${direction} paper: ${numbered ? `Paper ${entry.id}, ` : ""}${title}`,
  };
}

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
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  // The field is empty at each new open. React permits this change of state during a render.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setValue("");
      setError(null);
    }
  }

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

  // After a reload, the entry that the open navigator added is still in the history: the same page twice.
  // One step back removes the need for a second press of Back.
  const healed = useRef(false);
  useEffect(() => {
    if (healed.current) return;
    healed.current = true;
    if (!dialog.current?.open && window.history.state?.navigator) window.history.back();
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("popstate", onClose);
    return () => window.removeEventListener("popstate", onClose);
  }, [open, onClose]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = normalizeQuery(value);
    if (text === "") return;
    const ref = parseReference(text);
    if (ref) {
      track("navigator_used", { kind: "reference" });
      leave(referenceHref(ref));
      return;
    }
    // A number over 196 is a slip of the hand, not a search.
    if (referenceProblem(text) === "range") {
      setError("The papers go from 1 to 196.");
      return;
    }
    saveRecent(text);
    track("search_started", { source: "navigator" });
    leave(searchHref(text));
  }

  function goToSection(section: NavSection) {
    track("navigator_used", { kind: "section" });
    leave(referenceHref({ paperId: paper.id, sectionId: section.id }));
  }

  function goToPaper(href: string) {
    track("navigator_used", { kind: "paper" });
    leave(href);
  }

  const before = previous && neighbor(previous, "Previous");
  const after = next && neighbor(next, "Next");

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
          <div>
            {paper.id !== "0" && <small>Paper {paper.id}</small>}
            <h2>{paper.title}</h2>
          </div>
          <button type="button" className="close" aria-label="Close" onClick={() => leave()}>
            <Icon name="close" />
          </button>
        </div>

        <form className={`goto${value.trim() ? " typed" : ""}`} onSubmit={onSubmit}>
          <Icon name="search" />
          <input
            aria-label="Search, or go to a reference"
            placeholder="Search, or go to a reference"
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
        {error && (
          <p className="goto-error" role="alert">
            {error}
          </p>
        )}

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

        <div className="sheet-foot">
          <div className="hop">
            {previous && before ? (
              <button type="button" aria-label={before.name} onClick={() => goToPaper(previous.href)}>
                <small>
                  <Icon name="paperBefore" />
                  {before.small}
                </small>
                {before.title}
              </button>
            ) : (
              <span />
            )}
            {next && after && (
              <button type="button" className="next" aria-label={after.name} onClick={() => goToPaper(next.href)}>
                <small>
                  {after.small}
                  <Icon name="paperAfter" />
                </small>
                {after.title}
              </button>
            )}
          </div>
          <button
            type="button"
            className="all"
            onClick={() => {
              track("navigator_used", { kind: "contents" });
              leave("/papers");
            }}
          >
            <Icon name="list" />
            <span>All papers</span>
            <Icon name="paperAfter" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
