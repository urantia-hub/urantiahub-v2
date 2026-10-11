import { RELEASES, releaseDate } from "@/content/releases";
import { pageMetadata } from "@/seo/metadata";

export const metadata = pageMetadata({
  title: "Releases",
  description: "What changed in UrantiaHub, the newest first.",
  path: "/releases",
});

export default function ReleasesPage() {
  return (
    <div className="prose listing">
      <h1>Releases</h1>
      <p className="lead">What changed in UrantiaHub, the newest first.</p>
      {RELEASES.map((release) => (
        <article className="rel" key={`${release.date} ${release.title}`}>
          <time dateTime={release.date}>{releaseDate(release.date)}</time>
          <h2>{release.title}</h2>
          <ul>
            {release.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
