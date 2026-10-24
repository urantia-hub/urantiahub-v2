import { Inter, Literata } from "next/font/google";
import { AccountSync } from "@/components/AccountSync";
import { MarkMoment } from "@/components/marks/MarkMoment";
import { NoticeQuestion } from "@/components/notices/NoticeQuestion";
import { OfflineStrip } from "@/components/OfflineStrip";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StreakQuestion } from "@/components/streak/StreakQuestion";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { TEXT_SIZE_INIT_SCRIPT } from "@/lib/text-size";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "@/app/globals.css";

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

// The <html> and <body> of both root layouts. A move between the two languages is a full page load.
export function RootShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html lang={lang} className={`${literata.variable} ${literataItalic.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT + TEXT_SIZE_INIT_SCRIPT }} />
        <a className="skip" href="#main">
          {messages(lang).skip}
        </a>
        <SiteHeader lang={lang} />
        <OfflineStrip lang={lang} />
        <main id="main">{children}</main>
        <SiteFooter lang={lang} />
        <AccountSync />
        {/* The questions and the moments of the streak are in English, as the emails and pushes they offer.
            They wait for an English page. */}
        {lang === "en" && (
          <>
            <NoticeQuestion />
            <StreakQuestion />
            <MarkMoment />
          </>
        )}
      </body>
    </html>
  );
}
