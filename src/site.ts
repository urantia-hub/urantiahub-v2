const origin = (process.env.SITE_ORIGIN || "http://localhost:3000").replace(/\/+$/, "");

// One place for the name, the origin, and the index setting.
export const site = {
  name: "UrantiaHub",
  origin,
  indexable: process.env.SITE_INDEXABLE === "on",
} as const;

export function absoluteUrl(path: string): string {
  return `${site.origin}${path}`;
}
