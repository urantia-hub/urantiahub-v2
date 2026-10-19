import Link from "next/link";
import { PAPERS, PARTS, paperPath, partNumeral } from "@/content/paper-index";
import { LIBRARY_LINKS } from "@/library/flags";
import { PLACE_INIT_SCRIPT } from "@/reader/place-script";
import { SavedLink, SignInInvite } from "./AccountRows";
import { Icon } from "./icons";
import { ContinueCard } from "./ContinueCard";
import { PaperMark, ProgressLoader } from "./PaperMark";


// `libraryLinks` is a prop so a test can render both states of the flag.
export function ContentsView({ libraryLinks = LIBRARY_LINKS }: { libraryLinks?: boolean }) {
  const parts = PARTS.filter((part) => part.id !== "0");
  return (
    <div className="toc">
      <h1>Papers</h1>
      <p className="lead">A foreword and 196 papers, in four parts.</p>
      <script dangerouslySetInnerHTML={{ __html: PLACE_INIT_SCRIPT }} />
      <ContinueCard />
      <SignInInvite />
      <SavedLink />
      <ProgressLoader />
      <nav className="jump" aria-label="Parts">
        {parts.map((part) => (
          <a key={part.id} href={`#part-${part.id}`}>
            Part {partNumeral(part.id)}
          </a>
        ))}
        {libraryLinks && <Link href="/texts">World texts</Link>}
      </nav>

      {/* The Foreword is a peer of the four parts, so it has the form of a part title. */}
      <section className="part fore" id="foreword" aria-label="Foreword">
        <h2>
          <Link href={paperPath("0")}>Foreword</Link>
          <PaperMark id="0" sections={PAPERS[0].sections} />
        </h2>
      </section>

      {parts.map((part) => (
        <section className="part" id={`part-${part.id}`} key={part.id} aria-labelledby={`part-title-${part.id}`}>
          <p className="eyebrow">
            Part {partNumeral(part.id)} · Papers {part.papers[0].id}–{part.papers.at(-1)!.id}
          </p>
          <h2 id={`part-title-${part.id}`}>{part.title}</h2>
          {part.sponsorship && <p className="spons">{part.sponsorship}</p>}
          <ol className="papers">
            {part.papers.map((paper) => (
              <li key={paper.id}>
                <Link href={paperPath(paper.id)}>
                  <span className="n">{paper.id}</span> <span className="t">{paper.title}</span>
                  <PaperMark id={paper.id} sections={paper.sections} />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {libraryLinks && (
        <section className="part" id="library" aria-label="Beside the Papers">
          <p className="eyebrow">Beside the Papers</p>
          <h2>World texts</h2>
          <p className="spons">21 texts of the world&apos;s religions, each with the passages of the Papers that are near to it in meaning.</p>
          <Link className="way" href="/texts">
            Browse world texts
            <Icon name="paperAfter" />
          </Link>
        </section>
      )}
    </div>
  );
}
