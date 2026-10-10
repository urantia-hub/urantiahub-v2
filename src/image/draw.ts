import { BOOKMARK_PATH } from "@/brand/BookmarkMark";
import { fit, type Measure } from "./compose";

// The image of one paragraph: 4 by 5, the form of a post in a feed.
export const WIDTH = 1080;
export const HEIGHT = 1350;

// The looks are the colors of the Hub. No photograph: a photograph needs a source with a license.
export const LOOKS = [
  { id: "paper", name: "Paper", bg: "#fbf8f2", ink: "#26221c" },
  { id: "night", name: "Night", bg: "#17150f", ink: "#e6dfd0" },
  { id: "wheat", name: "Wheat", bg: "#f3ead2", ink: "#26221c" },
  { id: "sage", name: "Sage", bg: "#e4efe3", ink: "#1c2a21" },
  { id: "indigo", name: "Indigo", bg: "#312e81", ink: "#eef0ff" },
] as const;
export type Look = (typeof LOOKS)[number];

const SIDE = 96;
const TEXT_TOP = 232;
const ROOM = { width: WIDTH - SIDE * 2, height: 900, sizes: [66, 60, 54, 48, 44, 40], lineHeight: 1.5 } as const;
// At the start the maker takes the sentences that fit at a type that is easy to read in a feed.
const EASY = { ...ROOM, sizes: ROOM.sizes.filter((size) => size >= 54) };

export type Fonts = { text: string; ui: string };
const textFont = (fonts: Fonts, size: number) => `400 ${size}px ${fonts.text}`;

export function measureWith(context: CanvasRenderingContext2D, fonts: Fonts): Measure {
  return (text, size) => {
    context.font = textFont(fonts, size);
    return context.measureText(text).width;
  };
}

/** True when the text fits the image at a type size that a reader can read on a phone. */
export const fits = (text: string, measure: Measure): boolean => fit(text, ROOM, measure) !== null;

/** True when the text fits at a type that is easy to read in a feed. */
export const fitsWell = (text: string, measure: Measure): boolean => fit(text, EASY, measure) !== null;

/** Draws the image. False when the text does not fit: the canvas then shows the frame with no text. */
export function draw(canvas: HTMLCanvasElement, fonts: Fonts, look: Look, reference: string, text: string): boolean {
  const context = canvas.getContext("2d");
  if (!context) return false;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  context.fillStyle = look.bg;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = look.ink;
  context.textBaseline = "alphabetic";

  // The source, in small capitals.
  context.globalAlpha = 0.62;
  context.font = `600 25px ${fonts.ui}`;
  if ("letterSpacing" in context) context.letterSpacing = "4px";
  context.fillText(`THE URANTIA PAPERS · ${reference}`.toUpperCase(), SIDE, 150);
  if ("letterSpacing" in context) context.letterSpacing = "0px";
  context.globalAlpha = 1;

  const laid = fit(text, ROOM, measureWith(context, fonts));
  if (laid) {
    context.font = textFont(fonts, laid.size);
    laid.lines.forEach((line, i) => context.fillText(line, SIDE, TEXT_TOP + laid.size + i * laid.size * ROOM.lineHeight));
  }

  // The mark and the name of the site.
  const tile = 46;
  const top = HEIGHT - 150;
  context.globalAlpha = 0.8;
  context.beginPath();
  context.roundRect(SIDE, top, tile, tile, 10);
  context.fill();
  context.save();
  context.translate(SIDE, top);
  context.scale(tile / 64, tile / 64);
  context.fillStyle = look.bg;
  context.fill(new Path2D(BOOKMARK_PATH));
  context.restore();
  context.fillStyle = look.ink;
  context.font = `500 28px ${fonts.ui}`;
  context.fillText("urantiahub.com", SIDE + tile + 16, top + 33);
  context.globalAlpha = 1;
  return laid !== null;
}
