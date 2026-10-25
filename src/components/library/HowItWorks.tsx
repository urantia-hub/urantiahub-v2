import { CONTACT_EMAIL } from "@/content/contact";
import type { LibraryWork } from "@/content/library";
import { paperById } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { shortNames } from "@/library/header-back";
import { sourceSite } from "@/library/sources";
import { OUTSIDE_FLOOR, type Parallel, percent, WORK_FLOORS } from "@/server/parallels";

export const EXAMPLE_REF = "131:3.2";
// From the read of the results for 35 paragraphs on 2026-10-10: from this score up, each passage was near.
const SURE = 46;
const BLOCK_STUDIES = "https://urantiabooksources.com/";

// "The Book of Mormon and the Rig Veda": the works whose passages start at a higher floor, by that floor.
function higherFloors(works: readonly LibraryWork[], lang: Lang): { names: string; floor: number }[] {
  const t = messages(lang).how;
  const byFloor = new Map<number, string[]>();
  for (const [id, floor] of Object.entries(WORK_FLOORS)) {
    const work = works.find((w) => w.corpusId === id);
    if (work) byFloor.set(percent(floor), [...(byFloor.get(percent(floor)) ?? []), t.theWork(shortNames(lang)[work.slug] ?? work.title)]);
  }
  return [...byFloor].map(([floor, names]) => {
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${t.and} ${names.at(-1)}` : names[0];
    return { names: list.charAt(0).toUpperCase() + list.slice(1), floor };
  });
}

// What a parallel is, what its number means, where each text comes from, and why these works (Kelson, 2026-10-19;
// mock `mocks/hub-v2/texts-how-it-works.html` in the workspace). The facts come from the code and the API.
export function HowItWorks({ works, example, lang = "en" }: { works: readonly LibraryWork[]; example: Parallel | null; lang?: Lang }) {
  const t = messages(lang).how;
  const floor = percent(OUTSIDE_FLOOR);
  return (
    <div className="prose how">
      <h1>{t.title}</h1>
      <p className="lead">{t.lead}</p>
      <nav className="how-jump" aria-label={t.jumpLabel}>
        <a href="#parallels">{t.jumpParallels}</a>
        <a href="#number">{t.jumpNumber}</a>
        <a href="#sources">{t.jumpSources}</a>
        <a href="#why">{t.jumpWhy}</a>
        <a href="#suggest">{t.jumpSuggest}</a>
      </nav>

      <h2 id="parallels">{t.parallelsHead}</h2>
      <p>{t.parallels1}</p>
      <p>{t.parallels2}</p>
      <p>{t.parallels3}</p>
      <p>{t.parallels4}</p>

      <h2 id="number">{t.numberHead}</h2>
      {example && (
        <div className="how-example">
          <small>{t.exampleOf(EXAMPLE_REF)}</small>
          <div className="parallel-where">
            <b>{example.ref}</b>
            <small>{example.source}</small>
            <span className="parallel-score">{example.percent}%</span>
          </div>
          <p lang={lang === "en" ? undefined : "en"}>{example.text}</p>
        </div>
      )}
      <p>{t.number1}</p>
      <div className="how-scale" aria-hidden="true" style={{ "--floor": `${floor}%`, "--sure": `${SURE}%` } as React.CSSProperties}>
        <div className="track" />
        <div className="ticks">
          <span style={{ left: 0, transform: "none" }}>0</span>
          <span style={{ left: `${floor}%` }}>
            <b>{floor}</b>
            {t.floor}
          </span>
          <span style={{ left: `${SURE}%` }}>
            <b>{SURE}</b>
          </span>
          <span style={{ left: "100%", transform: "translateX(-100%)" }}>100</span>
        </div>
        <div className="band">
          <div>{t.notShown}</div>
          <div />
          <div>{t.shown}</div>
        </div>
      </div>
      <ul>
        <li>{t.lower}</li>
        <li>{t.below(floor, SURE)}</li>
        {higherFloors(works, lang).map((h) => (
          <li key={h.floor}>{t.higher(h.names, floor, h.floor)}</li>
        ))}
        <li>{t.weak}</li>
      </ul>

      <h2 id="sources">{t.sourcesHead}</h2>
      <p>{t.sources1}</p>
      <p>{t.sources2}</p>
      <div className="table-wrap">
        <table className="how-sources">
          <thead>
            <tr>
              <th scope="col">{t.colWork}</th>
              <th scope="col">{t.colTranslation}</th>
              <th scope="col">{t.colSource}</th>
            </tr>
          </thead>
          <tbody>
            {works.map((w) => {
              const site = sourceSite(w.sourceUrl);
              return (
                <tr key={w.slug}>
                  <th scope="row">{w.title}</th>
                  <td className="by">{w.byline}</td>
                  <td>{site && w.sourceUrl ? <a href={w.sourceUrl}>{site}</a> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 id="why">{t.whyHead}</h2>
      <p>{t.why1(paperById("131", lang)?.title ?? "")}</p>
      <p>
        {t.why2Before}
        <a href={BLOCK_STUDIES}>Matthew Block</a>
        {t.why2After}
      </p>
      <p>{t.why3}</p>
      <p>{t.why4}</p>

      <div className="how-suggest">
        <h2 id="suggest">{t.suggestHead}</h2>
        <p>
          {t.suggestBefore}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          {t.suggestAfter}
        </p>
      </div>
    </div>
  );
}
