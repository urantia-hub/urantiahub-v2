import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BOOKMARK_PATH, BRAND_INK, BRAND_PAPER } from "@/brand/BookmarkMark";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { shortNames } from "@/library/header-back";
import { pairOf, type PairSide } from "@/pair/pair";
import { cardQuote, pairSize } from "@/pair/view";
import { SHARE_SIZE, shareImage } from "./share-image";

const readFont = () => readFile(join(process.cwd(), "node_modules/@fontsource/literata/files/literata-latin-500-normal.woff"));


const Side = ({ side, name, size }: { side: PairSide; name: string; size: number }) => (
  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 20, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8b8375" }}>{name}</div>
    <div style={{ fontSize: 22, color: "#8b8375", marginTop: 8, height: 30 }}>{side.kind ?? ""}</div>
    <div style={{ fontSize: size, lineHeight: 1.38, marginTop: 18 }}>{`“${cardQuote(side.words).replace(/^“/, "")}”`}</div>
    <div style={{ fontSize: 26, color: "#756d5f", marginTop: "auto", paddingTop: 20 }}>{side.shortRef}</div>
  </div>
);

// The picture of a pair link: two columns with a thin rule, and at the foot the mark and "Two passages".
// It is light in each theme, and it has no site name, as the picture of a one-paragraph link.
export async function pairPicture(parts: readonly string[], lang: Lang = "en"): Promise<ImageResponse> {
  const t = messages(lang).pair;
  const pair = await pairOf(parts, undefined, lang);
  if (!pair || "go" in pair) return shareImage(t.twoPassages, t.papers);
  const font = await readFont();
  const size = pairSize(Math.max(cardQuote(pair.a.words).length, cardQuote(pair.b.words).length));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fbf8f2", color: "#26221c", fontFamily: "Literata", padding: "56px 72px 44px" }}>
        <div style={{ display: "flex", flex: 1 }}>
          <Side side={pair.a} name={pair.a.eyebrow} size={size} />
          <div style={{ width: 1, background: "#e7e0d2", margin: "0 44px" }} />
          {/* The short name keeps the eyebrow on one line, so the two quotes start on one line. */}
          <Side side={pair.b} name={shortNames(lang)[pair.work] ?? pair.b.eyebrow} size={size} />
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 26, color: "#8b8375", marginTop: 28 }}>
          <svg width={40} height={40} viewBox="0 0 64 64" style={{ marginRight: 14 }}>
            <rect width="64" height="64" rx="13" fill={BRAND_INK} />
            <path d={BOOKMARK_PATH} fill={BRAND_PAPER} />
          </svg>
          {t.twoPassages}
        </div>
      </div>
    ),
    {
      ...SHARE_SIZE,
      fonts: [{ name: "Literata", data: font, weight: 500, style: "normal" }],
    },
  );
}
