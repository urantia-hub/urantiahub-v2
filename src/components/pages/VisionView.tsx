/* eslint-disable @next/next/no-img-element -- fixed screenshots, already sized as webp */
import { VisionThemeSwap } from "./VisionThemeSwap";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { pageMetadata } from "@/seo/metadata";
import "@/styles/vision.css";

export function visionMetadata(lang: Lang) {
  const t = messages(lang).visionPage;
  return pageMetadata({ title: t.metaTitle, description: t.metaDescription, path: lang === "es" ? "/es/vision" : "/vision", lang, twin: lang === "es" ? "/vision" : "/es/vision" });
}

type ShotKey = keyof ReturnType<typeof messages>["visionPage"]["shots"];

// A computer screen in a plain window frame. `focus` is the part a phone keeps when it crops the picture.
// A screen with a light and a dark file. The HTML names the light one; `VisionThemeSwap` shows the dark one for a
// dark reader, so a reader downloads the pictures of one theme only.
function Themed({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) {
  return <img {...props} alt={alt} data-dark={props.src.replace(/\.webp$/, "-dark.webp")} suppressHydrationWarning />;
}

function Browser({ src, alt, focus, address, children }: { src: string; alt: string; focus?: string; address?: string; children?: React.ReactNode }) {
  return (
    <div className="v-browser">
      <div className="v-dots" aria-hidden="true">
        <i />
        <i />
        <i />
        {address && <span>{address}</span>}
      </div>
      <Themed src={src} alt={alt} width={1600} height={900} loading="lazy" data-focus={focus ? "" : undefined} style={focus ? ({ "--focus": focus } as React.CSSProperties) : undefined} />
      {children}
    </div>
  );
}

function Phone({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  return (
    <div className="v-phone">
      <Themed src={src} alt={alt} width={540} height={960} loading={eager ? "eager" : "lazy"} />
    </div>
  );
}

// What the Hub does today, what comes next, and the goal. Pictures are real screens of the English site.
export function VisionView({ lang }: { lang: Lang }) {
  const t = messages(lang).visionPage;
  const shot = (key: ShotKey, picture: React.ReactNode) => (
    <figure className="v-shot">
      {picture}
      <figcaption className="v-cap">
        <h3>{t.shots[key].title}</h3>
        <p>{t.shots[key].line}</p>
      </figcaption>
    </figure>
  );
  const check = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
  return (
    <div className="vision">
      <section className="v-hero">
        <div className="v-hero-words">
          <h1>{t.title}</h1>
          <p>{t.lede}</p>
          <nav className="v-jump" aria-label={t.onThisPage}>
            <a href="#today">
              <i className="v-dot-today" />
              {t.today}
            </a>
            <a href="#soon">
              <i className="v-dot-soon" />
              {t.soon}
            </a>
            <a href="#goal">
              <i className="v-dot-goal" />
              {t.goal}
            </a>
          </nav>
        </div>
        <div className="v-composite">
          <div className="v-browser">
            <div className="v-dots" aria-hidden="true">
              <i />
              <i />
              <i />
              <span>www.urantiahub.com/papers/2-the-nature-of-god</span>
            </div>
            <Themed src="/vision/d-04-listen.webp" alt={t.heroBrowserAlt} width={1600} height={900} />
          </div>
          <Phone src="/vision/p-home.webp" alt={t.heroPhoneAlt} eager />
        </div>
      </section>

      <section id="today">
        <div className="v-head">
          <span className="v-tag v-tag-today">{t.today}</span>
          <h2>{t.todayHeading}</h2>
          <p>{t.todayLine}</p>
        </div>
        <div className="v-rows">
          <div className="v-row">
            {shot("search", <Browser src="/vision/d-11-search.webp" alt={t.shots.search.alt} focus="50% 15%" />)}
            {shot("papers", <Phone src="/vision/p-reader.webp" alt={t.shots.papers.alt} />)}
          </div>
          <div className="v-row v-flip">
            {shot("notes", <Browser src="/vision/d-06-note.webp" alt={t.shots.notes.alt} focus="62% 30%" />)}
            {shot("share", <Phone src="/vision/p-share.webp" alt={t.shots.share.alt} />)}
          </div>
          <div className="v-row">
            {shot("parallels", <Browser src="/vision/d-08-parallels.webp" alt={t.shots.parallels.alt} focus="88% 40%" />)}
            {shot("offline", <Phone src="/vision/p-offline.webp" alt={t.shots.offline.alt} />)}
          </div>
          <div className="v-row v-even">
            {shot("progress", <Browser src="/vision/d-03-streak.webp" alt={t.shots.progress.alt} focus="30% 20%" />)}
            {shot("ask", <Browser src="/vision/d-05-ask.webp" alt={t.shots.ask.alt} focus="50% 30%" />)}
          </div>
        </div>
      </section>

      <section id="soon">
        <div className="v-head">
          <span className="v-tag v-tag-soon">{t.soon}</span>
          <h2>{t.groupsHeading}</h2>
          <p>{t.groupsLine}</p>
        </div>
        <div className="v-soon">
          <Browser src="/vision/d-group-notes.webp" alt={t.groupsAlt} focus="45% 20%">
            <span className="v-ribbon">{t.design}</span>
          </Browser>
          <ul>
            {t.groups.map((line) => (
              <li key={line}>
                {check}
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="goal">
        <div className="v-head">
          <span className="v-tag v-tag-goal">{t.goal}</span>
          <h2>{t.goalHeading}</h2>
        </div>
        <div className="v-goal">
          <GoalArt label={t.goalArt} />
          <div>
            <blockquote>{t.goalQuote}</blockquote>
            <div className="v-three">
              {t.pillars.map((p) => (
                <div key={p.name}>
                  <b>{p.name}</b>
                  <span>{p.line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <p className="v-foot">
        <span>
          {t.source} <a href="https://urantia.dev">urantia.dev</a>
          {t.sourceAfter}
          {lang === "es" ? ` ${t.pictures}` : null}
        </span>
        <span>{t.updated}</span>
      </p>
      <VisionThemeSwap />
    </div>
  );
}

// A drawn page: one marked paragraph, the voice line under it, three readers' notes, and the languages.
function GoalArt({ label }: { label: string }) {
  return (
    <svg className="v-art" viewBox="0 0 480 400" role="img" aria-label={label}>
      <rect x="70" y="30" width="270" height="340" rx="10" fill="var(--raised)" stroke="var(--rule)" />
      <g fill="var(--rule)">
        <rect x="96" y="62" width="150" height="10" rx="5" fill="var(--ink)" opacity=".85" />
        <rect x="96" y="94" width="218" height="6" rx="3" />
        <rect x="96" y="108" width="200" height="6" rx="3" />
        <rect x="96" y="122" width="210" height="6" rx="3" />
      </g>
      <rect x="86" y="146" width="238" height="96" rx="8" fill="var(--mark)" />
      <text x="40" y="164" fontFamily="var(--font-ui)" fontSize="11" fill="var(--ref)">
        2:5.10
      </text>
      <g fill="var(--ink)" opacity=".55">
        <rect x="96" y="158" width="214" height="6" rx="3" />
        <rect x="96" y="172" width="200" height="6" rx="3" />
        <rect x="96" y="186" width="208" height="6" rx="3" />
        <rect x="96" y="200" width="190" height="6" rx="3" />
        <rect x="96" y="214" width="150" height="6" rx="3" />
      </g>
      <rect x="96" y="230" width="120" height="4" rx="2" fill="var(--voice-line)" />
      <g fill="var(--rule)">
        <rect x="96" y="264" width="218" height="6" rx="3" />
        <rect x="96" y="278" width="206" height="6" rx="3" />
        <rect x="96" y="292" width="212" height="6" rx="3" />
        <rect x="96" y="306" width="170" height="6" rx="3" />
      </g>
      <g fontFamily="var(--font-ui)" fontSize="12" fontWeight="600">
        {[
          { y: 140, fill: "var(--mark)", letter: "A", x: 14, w: [56, 40] },
          { y: 190, fill: "var(--v-goal-b)", letter: "M", x: 13.5, w: [60, 32] },
          { y: 240, fill: "var(--mark)", letter: "T", x: 14.5, w: [48, 54] },
        ].map((n) => (
          <g key={n.letter} transform={`translate(356 ${n.y})`}>
            <rect width="104" height="40" rx="8" fill="var(--raised)" stroke="var(--rule)" />
            <circle cx="18" cy="20" r="10" fill={n.fill} />
            <text x={n.x} y="24" fill="var(--ink)">
              {n.letter}
            </text>
            <rect x="34" y="14" width={n.w[0]} height="5" rx="2.5" fill="var(--rule)" />
            <rect x="34" y="23" width={n.w[1]} height="5" rx="2.5" fill="var(--rule)" />
          </g>
        ))}
      </g>
      <g fontFamily="var(--font-ui)" fontSize="11" fontWeight="600">
        <rect x="96" y="336" width="34" height="20" rx="10" fill="var(--ink)" />
        <text x="105" y="350" fill="var(--bg)">
          EN
        </text>
        <rect x="136" y="336" width="34" height="20" rx="10" fill="none" stroke="var(--rule)" />
        <text x="146" y="350" fill="var(--ink)">
          ES
        </text>
        <rect x="176" y="336" width="28" height="20" rx="10" fill="none" stroke="var(--rule)" strokeDasharray="3 3" />
        <text x="186" y="350" fill="var(--muted)">
          +
        </text>
      </g>
    </svg>
  );
}
