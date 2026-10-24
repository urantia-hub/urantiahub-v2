"use client";

import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";

// In the header beside the mark, when the reader came from a parallels sheet: the way back to the passage of
// that sheet, at its place and marked (not to the sheet itself). It looks like `HeaderBack`. A plain link, as
// the quotes have: the redirect of a passage address keeps its "#" only on a full load.
export function PairBack({ href, label }: { href: string; label: string }) {
  const start = document.querySelector(".site-header .header-start");
  if (!start) return null;
  return createPortal(
    <a className="hdr-back" href={href}>
      <Icon name="back" />
      <span>{label}</span>
    </a>,
    start,
  );
}
