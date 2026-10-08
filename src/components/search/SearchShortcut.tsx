"use client";

import { useEffect } from "react";

// The slash key opens the search screen, as on many sites. It is for a reader with a keyboard.
// It presses the search link of the header, so the navigation is the same as a click.
export function SearchShortcut() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      if (window.location.pathname === "/search") document.querySelector<HTMLInputElement>('input[name="q"]')?.focus();
      else document.querySelector<HTMLAnchorElement>('.site-header a[href="/search"]')?.click();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
