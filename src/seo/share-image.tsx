import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BOOKMARK_PATH, BRAND_INK, BRAND_PAPER } from "@/brand/BookmarkMark";

export const SHARE_SIZE = { width: 1200, height: 630 };

// The image that a shared link shows: a small line, a title in the text face, and the mark of the site.
export async function shareImage(kicker: string, title: string): Promise<ImageResponse> {
  const font = await readFile(join(process.cwd(), "node_modules/@fontsource/literata/files/literata-latin-500-normal.woff"));
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
        <div style={{ fontSize: 84, lineHeight: 1.12 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, color: "#8b8375", marginTop: 56 }}>
          <svg width="38" height="38" viewBox="0 0 64 64" style={{ marginRight: 14 }}>
            <rect width="64" height="64" rx="13" fill={BRAND_INK} />
            <path d={BOOKMARK_PATH} fill={BRAND_PAPER} />
          </svg>
          UrantiaHub
        </div>
      </div>
    ),
    { ...SHARE_SIZE, fonts: [{ name: "Literata", data: font, weight: 500, style: "normal" }] },
  );
}
