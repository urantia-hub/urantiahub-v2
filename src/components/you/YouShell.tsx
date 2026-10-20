import { partLabel } from "@/account/progress-summary";
import { PARTS } from "@/content/paper-index";

// The shell of /you: each card in its own shape, with grey bars where its data will be, so the page does
// not move when the data arrives. Words that do not depend on the reader show as they are.

const Bone = ({ w }: { w: string }) => <span className="bone" style={{ width: w }} />;
const Block = ({ w, h }: { w: number; h: number }) => <span className="bone bone-block" style={{ width: w, height: h }} />;

// The reader's name and email, before the session answered.
export function WhoShell({ account }: { account: React.ReactNode }) {
  return (
    <header className="you-who you-shell">
      <span className="you-face bone-face" aria-hidden="true" />
      <div>
        <h1>
          <span className="sr-only">Your page</span>
          <Bone w="8em" />
        </h1>
        <p>
          <Bone w="15em" />
        </p>
      </div>
      {account}
    </header>
  );
}

export function StreakShell() {
  return (
    <div className="streak-cards" role="status" aria-label="Loading your streak">
      <div className="you-card streak-card you-shell" aria-hidden="true">
        <p className="streak-label">
          <Bone w="4em" />
        </p>
        <p className="streak-big">
          <b>
            <Bone w="0.6em" />
          </b>
          <span>
            <Bone w="5.5em" />
          </span>
        </p>
        <ol className="streak-week">
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            // Today is always the last day.
            <li key={n} data-today={n === 6 ? "" : undefined}>
              <i />
              <Bone w="0.7em" />
            </li>
          ))}
        </ol>
        <p className="streak-facts">
          <Bone w="12em" />
        </p>
        <div className="streak-next">
          <div>
            <b>
              <Bone w="11em" />
            </b>
            <small>
              <Bone w="9em" />
            </small>
          </div>
          <Block w={58} h={34} />
          <Block w={66} h={34} />
        </div>
        <div className="streak-book">
          <span>
            <Bone w="13em" />
          </span>
          <div className="streak-line" />
        </div>
        <p className="streak-stop">
          <Bone w="8em" />
        </p>
      </div>
      <MarksShell place="stack" />
    </div>
  );
}

export function MarksShell({ place }: { place: "stack" | "side" }) {
  return (
    <section className={`you-card marks-card marks-${place} you-shell`} aria-hidden="true">
      <p className="marks-head">
        <b>
          <Bone w="3.5em" />
        </b>
        <span>
          <Bone w="3em" />
        </span>
      </p>
      <ul className="marks-got">
        {[0, 1].map((n) => (
          <li key={n}>
            <Block w={34} h={41} />
            <small>
              <Bone w="3.5em" />
              <br />
              <Bone w="2.5em" />
            </small>
          </li>
        ))}
      </ul>
      <p className="marks-sub">
        <Bone w="2.5em" />
      </p>
      <ul className="marks-next">
        {[0, 1, 2].map((n) => (
          <li key={n}>
            <Block w={30} h={36} />
            <div>
              <b>
                <Bone w="6em" />
              </b>
              <small>
                <Bone w="14em" />
              </small>
            </div>
          </li>
        ))}
      </ul>
      <p className="marks-all-toggle">
        <Bone w="8em" />
      </p>
    </section>
  );
}

export function ProgressShell() {
  return (
    <div className="progress-page you-shell" role="status" aria-label="Loading your progress">
      <p className="progress-lead">What you read while you were signed in.</p>
      <p className="progress-total">
        <b>
          <Bone w="1.4em" />
        </b>
        <span>
          <Bone w="10em" />
        </span>
      </p>
      <div className="progress-line" />
      <dl className="progress-facts">
        {[0, 1, 2].map((n) => (
          <div key={n}>
            <dd>
              <Bone w="1em" />
            </dd>
            <dt>
              <Bone w="6em" />
            </dt>
          </div>
        ))}
      </dl>
      <section>
        <h2>By part</h2>
        {PARTS.map(partLabel).map((part) => (
          <div className="progress-part" key={part.id}>
            <span>
              <b>{part.name}</b> {part.title && <small>{part.title}</small>}
            </span>
            <em>
              <Bone w="2em" />
            </em>
            <div className="progress-line" />
          </div>
        ))}
      </section>
    </div>
  );
}

export function SavedShell() {
  return (
    <div className="you-card you-shell" role="status" aria-label="Loading what you saved">
      {[0, 1, 2].map((n) => (
        <div className="you-saved" key={n}>
          <small>
            <Bone w="4em" />
          </small>
          <span>
            <Bone w="100%" />
            <Bone w="70%" />
          </span>
        </div>
      ))}
    </div>
  );
}
