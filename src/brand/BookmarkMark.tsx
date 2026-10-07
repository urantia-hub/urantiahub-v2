// The UrantiaHub mark: a bookmark, because the Hub keeps the reader's place.
// One shape for the header, the favicon, the home-screen icons, and the share image.
// Drawn in a 64 by 64 box. scripts/make-icons.ts reads this path to write the icon files.
export const BOOKMARK_PATH =
  "M21 12h22a2 2 0 0 1 2 2v39.2a1.4 1.4 0 0 1-2.3 1.1L32 44.6 21.3 54.3A1.4 1.4 0 0 1 19 53.2V14a2 2 0 0 1 2-2z";

export const BRAND_INK = "#26221c";
export const BRAND_PAPER = "#fbf8f2";

// The tile takes the text color and the bookmark takes the page color, so the mark follows the theme.
export function BookmarkMark({ size }: { size: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect className="mark-tile" width="64" height="64" rx="13" />
      <path className="mark-shape" d={BOOKMARK_PATH} />
    </svg>
  );
}
