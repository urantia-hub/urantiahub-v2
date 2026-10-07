import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BOOKMARK_PATH, BRAND_INK, BRAND_PAPER } from "@/brand/BookmarkMark";
import { paperById } from "@/content/paper-index";
import { idFromSlug } from "@/lib/paper-url";

export const alt = "A paper of the Urantia Papers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const paper = id === null ? undefined : paperById(id);
  const font = await readFile(
    join(process.cwd(), "node_modules/@fontsource/literata/files/literata-latin-500-normal.woff"),
  );

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
        <div style={{ fontSize: 30, color: "#8b8375", marginBottom: 36 }}>
          {paper && paper.id !== "0" ? `The Urantia Papers · Paper ${paper.id}` : "The Urantia Papers"}
        </div>
        <div style={{ fontSize: 84, lineHeight: 1.12 }}>{paper?.title ?? "The Urantia Papers"}</div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, color: "#8b8375", marginTop: 56 }}>
          <svg width="38" height="38" viewBox="0 0 64 64" style={{ marginRight: 14 }}>
            <rect width="64" height="64" rx="13" fill={BRAND_INK} />
            <path d={BOOKMARK_PATH} fill={BRAND_PAPER} />
          </svg>
          UrantiaHub
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Literata", data: font, weight: 500, style: "normal" }] },
  );
}
