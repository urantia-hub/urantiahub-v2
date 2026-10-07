// Writes the favicon and home-screen icon files from the one bookmark shape.
// Run with: bun run icons. Commit the files that it writes.
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { BOOKMARK_PATH, BRAND_INK, BRAND_PAPER } from "../src/brand/BookmarkMark";

// The browser tab icon. It swaps its two colors in a dark tab, where a dark tile disappears.
const adaptive = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    .tile { fill: ${BRAND_INK}; }
    .shape { fill: ${BRAND_PAPER}; }
    @media (prefers-color-scheme: dark) {
      .tile { fill: ${BRAND_PAPER}; }
      .shape { fill: ${BRAND_INK}; }
    }
  </style>
  <rect class="tile" width="64" height="64" rx="13" />
  <path class="shape" d="${BOOKMARK_PATH}" />
</svg>
`;

// For an old browser with no SVG favicon: the same tile with round corners, on a clear background.
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="13" fill="${BRAND_INK}"/><path fill="${BRAND_PAPER}" d="${BOOKMARK_PATH}"/></svg>`;

// For iOS and Android: the color fills each corner, because the device cuts the corners itself.
// The bookmark is smaller, so it stays inside the area that a round mask keeps.
const fullBleed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${BRAND_INK}"/><g transform="translate(32 32) scale(0.74) translate(-32 -33)"><path fill="${BRAND_PAPER}" d="${BOOKMARK_PATH}"/></g></svg>`;

async function png(svg: string, size: number, file: string, opaque: boolean) {
  let image = sharp(Buffer.from(svg), { density: 72 * (size / 64) * 4 }).resize(size, size);
  if (opaque) image = image.flatten({ background: BRAND_INK });
  await image.png().toFile(file);
  console.log(`wrote ${file} (${size}px)`);
}

mkdirSync("public", { recursive: true });
writeFileSync("src/app/icon.svg", adaptive);
console.log("wrote src/app/icon.svg");
await png(tile, 32, "src/app/icon1.png", false);
await png(fullBleed, 180, "src/app/apple-icon.png", true);
await png(fullBleed, 192, "public/icon-192.png", true);
await png(fullBleed, 512, "public/icon-512.png", true);
