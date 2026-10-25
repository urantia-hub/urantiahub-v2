import type { Metadata } from "next";
import type { PaperEntry } from "@/content/paper-index";
import { type Lang, spanishOn } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref, homeHref, pageHref, paperHref } from "@/i18n/paths";
import { absoluteUrl, site } from "@/site";

// A page description from exact text: one line, cut at a word.
export function describe(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

type PageInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  absoluteTitle?: boolean;
  // A page with an image of its own (an `opengraph-image` file beside it) takes that one.
  ownImage?: boolean;
  lang?: Lang;
  // The address of the same page in the other language.
  twin?: string;
};

// The image of each English page that has none of its own: `src/app/opengraph-image.tsx`. A Spanish page
// names none: `src/app/(es)/es/opengraph-image.tsx` gives it, at an address with a suffix of the build.
export const SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "The Urantia Papers on UrantiaHub" };

export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  absoluteTitle = false,
  ownImage = false,
  lang = "en",
  twin,
}: PageInput): Metadata {
  const url = absoluteUrl(path);
  // A page that sets `openGraph` loses the image of the layout, so each page names it again.
  const images = ownImage || lang === "es" ? {} : { images: [SHARE_IMAGE] };
  // The twin pages name each other only while the Spanish reader is on.
  const english = absoluteUrl(lang === "en" ? path : (twin ?? path));
  const languages =
    twin && spanishOn() ? { en: english, es: absoluteUrl(lang === "es" ? path : twin), "x-default": english } : undefined;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: languages ? { canonical: url, languages } : { canonical: url },
    openGraph: { title, description, url, siteName: site.name, type, locale: lang === "es" ? "es_LA" : "en_US", ...images },
    twitter: { card: "summary_large_image", title, description, ...images },
  };
}

// A reader's own page: out of each search engine, at each index setting. The two twins name each other
// while Spanish is on, so the first page of a visit opens in the reader's language. `en`: the English path.
export function ownPageMetadata(title: string, en: string): Metadata {
  const robots = { index: false, follow: false };
  if (!spanishOn()) return { title, robots };
  return { title, robots, alternates: { languages: { en: absoluteUrl(en), es: absoluteUrl(pageHref("es", en)) } } };
}

export function paperHeadline(paper: { id: string; title: string }, lang: Lang = "en"): string {
  return paper.id === "0" ? paper.title : messages(lang).paperHeadline(Number(paper.id), paper.title);
}

export function websiteJsonLd(): object {
  return { "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: absoluteUrl("/") };
}

export function paperJsonLd(paper: PaperEntry, description: string, lang: Lang = "en"): object[] {
  const url = absoluteUrl(paperHref(lang, Number(paper.id)));
  const t = messages(lang);
  const headline = paperHeadline(paper, lang);
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline,
      description,
      url,
      mainEntityOfPage: url,
      inLanguage: lang,
      isPartOf: { "@type": "Book", name: t.thePapers, url: absoluteUrl(contentsHref(lang)) },
      publisher: { "@type": "Organization", name: site.name, url: absoluteUrl("/") },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl(homeHref(lang)) },
        { "@type": "ListItem", position: 2, name: t.papersCrumb, item: absoluteUrl(contentsHref(lang)) },
        { "@type": "ListItem", position: 3, name: headline, item: url },
      ],
    },
  ];
}
