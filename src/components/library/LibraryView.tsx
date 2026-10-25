import Link from "next/link";
import type { LibraryWork } from "@/content/library";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { howHref, textsHref } from "@/i18n/paths";

// The two groups of the Library. The words of "Classics" are the docs' definition of `kind: classic`.
const groups = (lang: Lang) => {
  const t = messages(lang).texts;
  return [
    { kind: "scripture", id: "scriptures", name: t.scriptures, line: t.scripturesLine },
    { kind: "classic", id: "classics", name: t.classics, line: t.classicsLine },
  ] as const;
};

/** "Annie Besant (and Bhagavan Das)" reads as "Annie Besant": the line beside a title is short. */
export const shortTranslator = (translator: string) => translator.replace(/\s*\(.*?\)/g, "");

export const libraryLead = (works: readonly { slug: string }[], lang: Lang = "en") =>
  messages(lang).texts.lead(
    works.some((w) => w.slug === "bible"),
    works.length,
  );

export function LibraryView({ works, lang = "en" }: { works: LibraryWork[]; lang?: Lang }) {
  const t = messages(lang).texts;
  const GROUPS = groups(lang);
  return (
    <div className="toc library">
      <h1>{t.title}</h1>
      <p className="lead">{libraryLead(works, lang)}</p>
      <Link className="how-link" href={howHref(lang)}>
        {t.howLink}
      </Link>
      <nav className="jump" aria-label={t.groupsLabel}>
        {GROUPS.map((g) => (
          <a key={g.id} href={`#${g.id}`}>
            {g.name}
          </a>
        ))}
      </nav>
      {GROUPS.map((g) => (
        <section className="part" id={g.id} key={g.id} aria-labelledby={`group-${g.id}`}>
          <h2 id={`group-${g.id}`}>{g.name}</h2>
          <p className="spons">{g.line}</p>
          <ul className="works">
            {works
              .filter((w) => w.kind === g.kind)
              .map((w) => (
                <li key={w.slug}>
                  <Link href={textsHref(lang, w.slug)}>
                    <span className="t">{w.title}</span>
                    <span className="m">
                      {w.tradition} · {w.byline}
                    </span>
                    <span className="s">{w.summary}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
