import Link from "next/link";
import { PARTS, paperPath, partNumeral } from "@/content/paper-index";
import { SignInInvite } from "./AccountRows";
import { ContinueCard } from "./ContinueCard";

export function ContentsView() {
  const parts = PARTS.filter((part) => part.id !== "0");
  return (
    <div className="toc">
      <h1>Papers</h1>
      <p className="lead">A foreword and 196 papers, in four parts.</p>
      <ContinueCard />
      <SignInInvite />
      <nav className="jump" aria-label="Parts">
        {parts.map((part) => (
          <a key={part.id} href={`#part-${part.id}`}>
            Part {partNumeral(part.id)}
          </a>
        ))}
      </nav>

      {/* The Foreword is a peer of the four parts, so it has the form of a part title. */}
      <section className="part fore" id="foreword" aria-label="Foreword">
        <h2>
          <Link href={paperPath("0")}>Foreword</Link>
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
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
