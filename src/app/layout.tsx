import type { Metadata, Viewport } from "next";
import { Inter, Literata } from "next/font/google";
import { AccountSync } from "@/components/AccountSync";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TEXT_SIZE_INIT_SCRIPT } from "@/lib/text-size";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { SHARE_IMAGE } from "@/seo/metadata";
import { site } from "@/site";
import "./globals.css";

// The optical-size axis gives large headings finer shapes.
// Only the upright text face is on the path to the first paint, so only it is preloaded.
// The italic and the interface face load when the page uses them.
// Both Literata calls give the family name "Literata", so the browser picks the true italic by itself.
// The italic has no optical-size axis: it shows only at text sizes, and the axis doubles the file.
const literata = Literata({ subsets: ["latin"], axes: ["opsz"], variable: "--font-literata", display: "swap" });
const literataItalic = Literata({
  subsets: ["latin"],
  style: "italic",
  variable: "--font-literata-italic",
  display: "swap",
  preload: false,
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${literata.variable} ${literataItalic.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT + TEXT_SIZE_INIT_SCRIPT }} />
        <a className="skip" href="#main">
          Skip to the text
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <AccountSync />
      </body>
    </html>
  );
}
