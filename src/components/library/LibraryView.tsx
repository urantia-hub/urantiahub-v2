import Link from "next/link";
import type { LibraryWork } from "@/content/library";

// The two groups of the Library. The words of "Classics" are the docs' definition of `kind: classic`.
const GROUPS = [
  { kind: "scripture", id: "scriptures", name: "Scriptures", line: "Texts that their traditions read as sacred." },
  { kind: "classic", id: "classics", name: "Classics", line: "Stories, histories, and teachings of a tradition that are not read as scripture." },
] as const;

/** "Annie Besant (and Bhagavan Das)" reads as "Annie Besant": the line beside a title is short. */
export const shortTranslator = (translator: string) => translator.replace(/\s*\(.*?\)/g, "");

export const libraryLead = (count: number) => `${count} texts of the world's religions, each in the US public domain.`;

export function LibraryView({ works, firstKeys }: { works: LibraryWork[]; firstKeys: Record<string, string> }) {
  return (
    <div className="toc library">
      <h1>Library</h1>
      <p className="lead">{libraryLead(works.length)}</p>
      <nav className="jump" aria-label="Groups">
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
                  <Link href={`/library/${w.slug}/${firstKeys[w.slug]}`}>
                    <span className="t">{w.title}</span>
                    <span className="m">
                      {w.tradition} · {shortTranslator(w.translator)}, {w.year}
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
