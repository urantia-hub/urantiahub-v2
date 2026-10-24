import type { Metadata, Viewport } from "next";
import { RootShell } from "@/components/RootShell";
import { SHARE_IMAGE } from "@/seo/metadata";
import { site } from "@/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: { default: "The Urantia Papers | UrantiaHub", template: "%s | UrantiaHub" },
  // For a page that sets none of its own: search, the saved page, and the study page.
  description: "Read the Urantia Papers: the full text of the foreword and all 196 papers, free and with no account.",
  openGraph: { siteName: site.name, type: "website", locale: "en_US", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", images: [SHARE_IMAGE] },
  robots: site.indexable ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f2",
  // The keyboard of Android shrinks the page, so a sheet at the bottom with a field sits above it.
  interactiveWidget: "resizes-content",
};

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>;
}
