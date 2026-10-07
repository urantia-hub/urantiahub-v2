import type { Metadata } from "next";
import { paperPath, type PaperEntry } from "@/content/paper-index";
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
};

export function pageMetadata({ title, description, path, type = "website", absoluteTitle = false }: PageInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: site.name, type, locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function paperHeadline(paper: { id: string; title: string }): string {
  return paper.id === "0" ? paper.title : `Paper ${paper.id}: ${paper.title}`;
}

export function websiteJsonLd(): object {
  return { "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: absoluteUrl("/") };
}

export function paperJsonLd(paper: PaperEntry, description: string): object[] {
  const url = absoluteUrl(paperPath(paper.id));
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: paperHeadline(paper),
      description,
      url,
      mainEntityOfPage: url,
      inLanguage: "en",
      isPartOf: { "@type": "Book", name: "The Urantia Papers", url: absoluteUrl("/papers") },
      publisher: { "@type": "Organization", name: site.name, url: absoluteUrl("/") },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Papers", item: absoluteUrl("/papers") },
        { "@type": "ListItem", position: 3, name: paperHeadline(paper), item: url },
      ],
    },
  ];
}
