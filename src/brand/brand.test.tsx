import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { SiteHeader } from "@/components/SiteHeader";
import { BOOKMARK_PATH, BookmarkMark } from "./BookmarkMark";

describe("the bookmark mark", () => {
  it("draws the one shared bookmark shape", () => {
    const { container } = render(<BookmarkMark size={22} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "22");
    expect(container.querySelector("path")).toHaveAttribute("d", BOOKMARK_PATH);
  });

  it("is in the site header beside the name, and the link name stays the name alone", () => {
    render(<SiteHeader />);
    const home = screen.getByRole("link", { name: "UrantiaHub" });
    expect(home).toHaveAttribute("href", "/");
    expect(home.querySelector("svg path")).toHaveAttribute("d", BOOKMARK_PATH);
  });
});

describe("the favicon files", () => {
  const svg = readFileSync("src/app/icon.svg", "utf8");

  it("uses the same shape as the header mark", () => {
    expect(svg).toContain(`d="${BOOKMARK_PATH}"`);
  });

  // A dark tile disappears in a dark browser tab, so the icon swaps its two colors.
  it("swaps its colors for a dark browser tab", () => {
    expect(svg).toMatch(/@media \(prefers-color-scheme: ?dark\)/);
    expect(svg).toContain("#26221c");
    expect(svg).toContain("#fbf8f2");
  });

  it.each([
    ["src/app/icon1.png", 32],
    ["src/app/apple-icon.png", 180],
    ["public/icon-192.png", 192],
    ["public/icon-512.png", 512],
  ])("has %s at %i pixels square", async (file, size) => {
    const meta = await sharp(file).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([size, size, "png"]);
  });

  // iOS and Android cut the corners themselves. A transparent corner shows as black.
  it.each(["src/app/apple-icon.png", "public/icon-192.png", "public/icon-512.png"])(
    "fills %s to each corner with the ink color",
    async (file) => {
      const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
      const corner = [...data.subarray(0, 3)];
      expect(corner).toEqual([0x26, 0x22, 0x1c]);
      if (info.channels === 4) expect(data[3]).toBe(255);
    },
  );
});

describe("the web app manifest", () => {
  it("names the site and lists the two home-screen icons", () => {
    const m = manifest();
    expect(m.name).toBe("UrantiaHub");
    expect(m.short_name).toBe("UrantiaHub");
    expect(m.start_url).toBe("/");
    expect(m.background_color).toBe("#fbf8f2");
    expect(m.theme_color).toBe("#fbf8f2");
    expect(m.icons).toEqual([
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ]);
  });
});
