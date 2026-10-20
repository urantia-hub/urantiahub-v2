import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BOOKMARK_PATH, BRAND_INK, BRAND_PAPER } from "@/brand/BookmarkMark";
import { cutWords } from "@/reader/share-link";

export const SHARE_SIZE = { width: 1200, height: 630 };

const readFont = () => readFile(join(process.cwd(), "node_modules/@fontsource/literata/files/literata-latin-500-normal.woff"));

// The title is smaller when it is long, so that it fits in two lines.
export const titleSize = (title: string) => (title.length <= 40 ? 84 : title.length <= 64 ? 66 : 54);

const SiteMark = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ marginRight: 14 }}>
    <rect width="64" height="64" rx="13" fill={BRAND_INK} />
    <path d={BOOKMARK_PATH} fill={BRAND_PAPER} />
  </svg>
);

// The image that a shared link shows: a small line, a title in the text face, and the mark of the site.
export async function shareImage(kicker: string, title: string): Promise<ImageResponse> {
  const font = await readFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#fbf8f2",
          color: "#26221c",
          fontFamily: "Literata",
          padding: 90,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 30, color: "#8b8375", marginBottom: 36 }}>{kicker}</div>
        <div style={{ fontSize: titleSize(title), lineHeight: 1.12 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, color: "#8b8375", marginTop: 56 }}>
          <SiteMark size={38} />
          UrantiaHub
        </div>
      </div>
    ),
    { ...SHARE_SIZE, fonts: [{ name: "Literata", data: font, weight: 500, style: "normal" }] },
  );
}

// The image of World texts: the title over the short name of each work, so a shared link shows what is there.
export async function textsImage(kicker: string, names: readonly string[]): Promise<ImageResponse> {
  const font = await readFont();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#fbf8f2", color: "#26221c", fontFamily: "Literata", padding: "70px 90px", textAlign: "center" }}>
        <div style={{ fontSize: 30, color: "#8b8375", marginBottom: 26 }}>{kicker}</div>
        <div style={{ fontSize: 84, lineHeight: 1.12 }}>World texts</div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", fontSize: 23, lineHeight: 1.6, color: "#756d5f", marginTop: 34, maxWidth: 980 }}>
          {names.map((name, i) => (
            <span key={name} style={{ display: "flex", whiteSpace: "nowrap" }}>
              {name}
              {i < names.length - 1 && <span style={{ margin: "0 12px", color: "#b3aa99" }}>·</span>}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, color: "#8b8375", marginTop: 40 }}>
          <SiteMark size={38} />
          UrantiaHub
        </div>
      </div>
    ),
    { ...SHARE_SIZE, fonts: [{ name: "Literata", data: font, weight: 500, style: "normal" }] },
  );
}

// The image of a shared paragraph: the words, the mark with "The Urantia Papers", and the reference.
// The type is smaller for more words, and a long text is cut at a word.
export async function sharedImage(words: string, ref: string): Promise<ImageResponse> {
  const font = await readFont();
  const text = cutWords(words, 300);
  const size = text.length < 90 ? 66 : text.length <= 190 ? 50 : 41;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", background: "#fbf8f2", color: "#26221c", fontFamily: "Literata", padding: "64px 96px" }}>
        <div style={{ fontSize: size, lineHeight: 1.4 }}>{text}</div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, color: "#8b8375", marginTop: 44 }}>
          <SiteMark size={40} />
          The Urantia Papers
          <div style={{ marginLeft: "auto", color: "#756d5f" }}>{ref}</div>
        </div>
      </div>
    ),
    { ...SHARE_SIZE, fonts: [{ name: "Literata", data: font, weight: 500, style: "normal" }] },
  );
}
