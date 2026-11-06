"use client";
import { useLayoutEffect } from "react";

// Sets each vision picture to the file of the page's theme. It must use nothing from outside: it also runs inline,
// from its own source text.
function swapVisionPictures() {
  const dark = document.documentElement.dataset.theme === "dark";
  for (const img of document.querySelectorAll<HTMLImageElement>(".vision img[data-dark]")) {
    if (!img.dataset.light) img.dataset.light = img.getAttribute("src") ?? "";
    const want = dark ? img.dataset.dark : img.dataset.light;
    if (want && img.getAttribute("src") !== want) img.setAttribute("src", want);
  }
}

// Inline at the first load, before layout, so a lazy picture loads in one theme only.
const SWAP_SCRIPT = `(${swapVisionPictures.toString()})()`;

// After a move by a link (an inline script does not run then), and at each change of the theme.
export function VisionThemeSwap() {
  useLayoutEffect(() => {
    swapVisionPictures();
    const watch = new MutationObserver(swapVisionPictures);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watch.disconnect();
  }, []);
  return <script dangerouslySetInnerHTML={{ __html: SWAP_SCRIPT }} suppressHydrationWarning />;
}

export { swapVisionPictures };
