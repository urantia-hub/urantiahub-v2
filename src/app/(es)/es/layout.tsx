import type { Metadata, Viewport } from "next";
import { RootShell } from "@/components/RootShell";
import { SHARE_IMAGE } from "@/seo/metadata";
import { site } from "@/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: { default: "Los Documentos de Urantia | UrantiaHub", template: "%s | UrantiaHub" },
  description: "Lea Los Documentos de Urantia en español: el prólogo y los 196 documentos, sin cuenta.",
  openGraph: { siteName: site.name, type: "website", locale: "es_LA", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", images: [SHARE_IMAGE] },
  robots: site.indexable ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f2",
  interactiveWidget: "resizes-content",
};

export default function SpanishLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="es">{children}</RootShell>;
}
