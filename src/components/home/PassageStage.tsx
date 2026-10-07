import type { Passage } from "@/content/fetchers";
import { referenceHref } from "@/content/paper-index";
import { parseReference } from "@/lib/paper-url";
import { PassageTracker } from "./PassageTracker";

// Runs before the first paint. It picks one passage, and CSS hides the others.
const PICK = `(function(){var s=document.currentScript.parentElement;var n=s.querySelectorAll('.passage').length;if(n)s.dataset.pick=String(Math.floor(Math.random()*n));})();`;

export function passageSize(text: string): "s" | "m" | "l" {
  if (text.length <= 260) return "s";
  if (text.length <= 460) return "m";
  return "l";
}

export function PassageStage({ passages }: { passages: Passage[] }) {
  return (
    <div className="stage" suppressHydrationWarning>
      {passages.map((passage, i) => (
        <figure className={`passage ${passageSize(passage.text)}`} key={i}>
          <blockquote>{passage.text}</blockquote>
          <figcaption>
            <a className="cite" href={referenceHref(parseReference(passage.ref)!)}>
              <b>{passage.ref}</b>
              {passage.paperId === "0" ? "Foreword" : `Paper ${passage.paperId} · ${passage.paperTitle}`}
            </a>
          </figcaption>
        </figure>
      ))}
      <script dangerouslySetInnerHTML={{ __html: PICK }} />
      <PassageTracker refs={passages.map((p) => p.ref)} />
    </div>
  );
}
