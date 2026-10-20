import { CONTACT_EMAIL } from "@/content/contact";
import type { LibraryWork } from "@/content/library";
import { SHORT_NAMES } from "@/library/header-back";
import { sourceSite } from "@/library/sources";
import { OUTSIDE_FLOOR, type Parallel, percent, WORK_FLOORS } from "@/server/parallels";

export const EXAMPLE_REF = "131:3.2";
// From the read of the results for 35 paragraphs on 2026-10-10: from this score up, each passage was near.
const SURE = 46;
const BLOCK_STUDIES = "https://urantiabooksources.com/";

// "The Book of Mormon and the Rig Veda": the works whose passages start at a higher floor, by that floor.
function higherFloors(works: readonly LibraryWork[]): { names: string; floor: number }[] {
  const byFloor = new Map<number, string[]>();
  for (const [id, floor] of Object.entries(WORK_FLOORS)) {
    const work = works.find((w) => w.corpusId === id);
    if (work) byFloor.set(percent(floor), [...(byFloor.get(percent(floor)) ?? []), `the ${SHORT_NAMES[work.slug] ?? work.title}`]);
  }
  return [...byFloor].map(([floor, names]) => {
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
    return { names: list.charAt(0).toUpperCase() + list.slice(1), floor };
  });
}

// What a parallel is, what its number means, where each text comes from, and why these works (Kelson, 2026-10-19;
// mock `mocks/hub-v2/texts-how-it-works.html` in the workspace). The facts come from the code and the API.
export function HowItWorks({ works, example }: { works: readonly LibraryWork[]; example: Parallel | null }) {
  const floor = percent(OUTSIDE_FLOOR);
  return (
    <div className="prose how">
      <h1>How World texts work</h1>
      <p className="lead">Where these texts come from, why these works are here, and what the number beside a parallel means.</p>
      <nav className="how-jump" aria-label="On this page">
        <a href="#parallels">Parallels</a>
        <a href="#number">The number</a>
        <a href="#sources">The sources</a>
        <a href="#why">Why these works</a>
        <a href="#suggest">Suggest a work</a>
      </nav>

      <h2 id="parallels">What a parallel is</h2>
      <p>A parallel is a passage of another work that a computer found near in meaning to a paragraph of the Papers.</p>
      <p>
        A language model, OpenAI&apos;s text-embedding-3-large, reads each paragraph of the Papers and each passage of each work, and gives each one a
        place in a space of meaning. Texts that say similar things get places near each other. For each paragraph, the Hub shows the passages whose
        places are nearest.
      </p>
      <p>
        Each work is cut into passages of about the length of one paragraph of the Papers. A passage never runs past the end of a chapter, a hymn, or
        another titled part. The Tao Te Ching is compared by whole chapters.
      </p>
      <p>
        The model compares meaning only, and it knows nothing of history. A parallel says that two passages say similar things. It does not say that
        one came from the other, or that they agree.
      </p>

      <h2 id="number">What the number means</h2>
      {example && (
        <div className="how-example">
          <small>A parallel of {EXAMPLE_REF}</small>
          <div className="parallel-where">
            <b>{example.ref}</b>
            <small>{example.source}</small>
            <span className="parallel-score">{example.percent}%</span>
          </div>
          <p>{example.text}</p>
        </div>
      )}
      <p>The number is the score of that comparison, as a percent: how near the two places are. It is not a share of words in common.</p>
      <div className="how-scale" aria-hidden="true" style={{ "--floor": `${floor}%`, "--sure": `${SURE}%` } as React.CSSProperties}>
        <div className="track" />
        <div className="ticks">
          <span style={{ left: 0, transform: "none" }}>0</span>
          <span style={{ left: `${floor}%` }}>
            <b>{floor}</b>floor
          </span>
          <span style={{ left: `${SURE}%` }}>
            <b>{SURE}</b>
          </span>
          <span style={{ left: "100%", transform: "translateX(-100%)" }}>100</span>
        </div>
        <div className="band">
          <div>Not shown</div>
          <div />
          <div>Shown, the nearest first</div>
        </div>
      </div>
      <ul>
        <li>Scores are lower than most people expect. Two paragraphs of the Papers that are nearest to each other usually score from 58 to 73.</li>
        <li>
          A passage of another work below {floor} does not show. In a read of the results for 35 paragraphs, each passage from {SURE} up was near in
          meaning, most from {floor} to {SURE} were, and most below {floor} shared a word and no meaning.
        </li>
        {higherFloors(works).map((h) => (
          <li key={h.floor}>
            {h.names} start at {h.floor}. From {floor} to {h.floor}, their passages shared a word, a subject, or the style of the Bible, not a meaning.
          </li>
        ))}
        <li>When no passage of another work reaches its floor, the list offers the five nearest below it, marked as likely not related.</li>
      </ul>

      <h2 id="sources">Where the texts come from</h2>
      <p>
        Each text is an English translation in the public domain in the United States, from a copy that people proofread: Project Gutenberg,
        Wikisource, or eBible.org. The Bible is the World English Bible.
      </p>
      <p>
        The Hub shows the words as the source has them. The one change is a typo of the online copy that the printed book does not have. The page of
        each work names its translator, its year, and its source under “This edition”.
      </p>
      <div className="table-wrap">
        <table className="how-sources">
          <thead>
            <tr>
              <th scope="col">Work</th>
              <th scope="col">Translation</th>
              <th scope="col">Source</th>
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

      <h2 id="why">Why these works</h2>
      <p>
        The first works are texts of the religions that Paper 131, “The World&apos;s Religions”, describes: the Cynics, Buddhism, Hinduism, Shinto,
        Taoism, and Confucianism, with the Bible for Judaism. Where a work belongs to a section of Paper 131, its page links to that section.
      </p>
      <p>
        The Koran and the Japji of the Sikhs came next. For studies that set passages of the Papers beside earlier books, see the work of{" "}
        <a href={BLOCK_STUDIES}>Matthew Block</a>.
      </p>
      <p>
        The rest widen the view to other traditions: Egypt, Greece, the Norse, the Aztecs, Japan, China, and India, and the Book of Mormon. Scriptures
        are texts that their traditions read as sacred. Classics are stories, histories, and teachings of a tradition that are not read as scripture.
      </p>
      <p>
        Paper 131 also describes Zoroastrianism and Jainism. For their texts, the Gathas and the Uttaradhyayana, we found no proofread copy online of an
        English translation in the public domain.
      </p>

      <div className="how-suggest">
        <h2 id="suggest">Suggest a work</h2>
        <p>
          Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the name of the work, and a translation if you know one. A work can come
          in when its English translation is in the public domain in the United States, and a copy online was proofread against the printed book.
        </p>
      </div>
    </div>
  );
}
