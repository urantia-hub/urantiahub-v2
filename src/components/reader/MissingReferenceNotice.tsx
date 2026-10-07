"use client";

import { useEffect, useState } from "react";
import { parseReference } from "@/lib/paper-url";

// Tells the reader when the link pointed at a paragraph that this paper does not have.
export function MissingReferenceNotice({ paperId }: { paperId: string }) {
  const [missing, setMissing] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      let target = "";
      try {
        target = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        target = window.location.hash.slice(1);
      }
      const ref = parseReference(target);
      // Section 0 exists in each paper but has no heading, so it is never "missing".
      const isParagraphOrSection =
        ref !== null &&
        ref.paperId === paperId &&
        ref.sectionId !== undefined &&
        !(ref.sectionId === "0" && ref.paragraphId === undefined);
      const isMissing = isParagraphOrSection && !document.getElementById(target);
      setMissing(isMissing ? target : null);
      // The notice is at the top of the paper. A reader in the middle of it must see it.
      if (isMissing) window.scrollTo({ top: 0 });
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [paperId]);

  if (!missing) return null;
  return (
    <p className="notice" role="status">
      Reference {missing} is not in this paper.
    </p>
  );
}
