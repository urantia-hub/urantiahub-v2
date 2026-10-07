import type { Metadata, Viewport } from "next";
import { Inter, Literata } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
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
  robots: site.indexable ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${literata.variable} ${literataItalic.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <a className="skip" href="#main">
          Skip to the text
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
