import type { Metadata, Viewport } from "next";
import { Inter, Literata } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { site } from "@/site";
import "./globals.css";

const literata = Literata({ subsets: ["latin"], variable: "--font-literata", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: { default: "The Urantia Papers | UrantiaHub", template: "%s | UrantiaHub" },
  robots: site.indexable ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#17150f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${literata.variable} ${inter.variable}`}>
      <body>
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
