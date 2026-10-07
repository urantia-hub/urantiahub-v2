"use client";

import { useState } from "react";
import { track } from "@/analytics";

// The paragraph reference. A click sets the fragment (the browser marks the paragraph) and copies the link.
export function ReferenceLink({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  function onClick() {
    track("reference_link_copied", { ref: reference });
    const url = `${window.location.origin}${window.location.pathname}#${reference}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }

  return (
    <>
      <a className="ref" href={`#${reference}`} onClick={onClick}>
        {reference}
      </a>
      {copied && (
        <span className="ref-copied" role="status">
          Link copied
        </span>
      )}
    </>
  );
}
