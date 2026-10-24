import Link from "next/link";
import { PARTS_BY_LANG, paperPath, partNumeral } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { LIBRARY_LINKS } from "@/library/flags";
import { PLACE_INIT_SCRIPT } from "@/reader/place-script";
import { SignInInvite } from "./AccountRows";
import { Icon } from "./icons";
import { ContinueCard } from "./ContinueCard";
import { PaperMark, ProgressLoader } from "./PaperMark";


// `libraryLinks` is a prop so a test can render both states of the flag.
// The World texts are in English, so a Spanish page names them "Otras obras" and links to the English page.
export function ContentsView({ libraryLinks = LIBRARY_LINKS, lang = "en" }: { libraryLinks?: boolean; lang?: Lang }) {
  const t = messages(lang);
  const all = PARTS_BY_LANG[lang];
  const foreword = all[0].papers[0];
  const parts = all.filter((part) => part.id !== "0");
  return (
    <div className="toc">
      <h1>{t.contentsTitle}</h1>
      <p className="lead">{t.contentsLead}</p>
      <script dangerouslySetInnerHTML={{ __html: PLACE_INIT_SCRIPT }} />
      <ContinueCard lang={lang} />
      <SignInInvite lang={lang} />
      <ProgressLoader />
      <nav className="jump" aria-label={t.parts}>
        {parts.map((part) => (
          <a key={part.id} href={`#part-${part.id}`}>
            {t.partShort(partNumeral(part.id))}
          </a>
        ))}
        {libraryLinks && (
          <Link href="/texts" hrefLang={lang === "en" ? undefined : "en"}>
            {t.worldTexts}
          </Link>
        )}
      </nav>

      {/* The Foreword is a peer of the four parts, so it has the form of a part title. */}
      <section className="part fore" id="foreword" aria-label={t.foreword}>
        <h2>
          <Link href={paperPath("0", lang)}>{t.foreword}</Link>
          <PaperMark id="0" sections={foreword.sections} lang={lang} />
        </h2>
      </section>

      {parts.map((part) => (
        <section className="part" id={`part-${part.id}`} key={part.id} aria-labelledby={`part-title-${part.id}`}>
          <p className="eyebrow">{t.partRange(partNumeral(part.id), part.papers[0].id, part.papers.at(-1)!.id)}</p>
          <h2 id={`part-title-${part.id}`}>{part.title}</h2>
          {part.sponsorship && <p className="spons">{part.sponsorship}</p>}
          <ol className="papers">
            {part.papers.map((paper) => (
              <li key={paper.id}>
                <Link href={paperPath(paper.id, lang)}>
                  <span className="n">{paper.id}</span> <span className="t">{paper.title}</span>
                  <PaperMark id={paper.id} sections={paper.sections} lang={lang} />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {libraryLinks && (
        <section className="part" id="library" aria-label={t.besidePapers}>
          <p className="eyebrow">{t.besidePapers}</p>
          <h2>{t.worldTexts}</h2>
          <p className="spons">{t.worldTextsLead}</p>
          <Link className="way" href="/texts" hrefLang={lang === "en" ? undefined : "en"}>
            {t.browseWorldTexts}
            <Icon name="paperAfter" />
          </Link>
        </section>
      )}
    </div>
  );
}
