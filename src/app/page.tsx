import Link from "next/link";
import { HomeContinue, HomePlace } from "@/components/home/HomeContinue";
import { PassageStage } from "@/components/home/PassageStage";
import { ReadLink } from "@/components/home/ReadLink";
import { excerptPassage, getPassage } from "@/content";
import { HOME_PASSAGES } from "@/content/passages";
import { PLACE_INIT_SCRIPT } from "@/reader/place-script";
import { JsonLd } from "@/seo/JsonLd";
import { pageMetadata, websiteJsonLd } from "@/seo/metadata";

export const metadata = pageMetadata({
  title: "The Urantia Papers",
  description: "Read the Urantia Papers: the full text of the foreword and all 196 papers, free and with no account.",
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  // The build fails here if a passage is not an exact run of whole sentences from its paragraph.
  const passages = await Promise.all(
    HOME_PASSAGES.map(async (entry) => excerptPassage(await getPassage(entry.ref), entry)),
  );
  return (
    <div className="home">
      <JsonLd data={websiteJsonLd()} />
      <h1>The Urantia Papers</h1>
      <PassageStage passages={passages} />
      {/* A reader who has a place gets "Continue reading" first. The page knows it before its first paint. */}
      <script dangerouslySetInnerHTML={{ __html: PLACE_INIT_SCRIPT }} />
      <div className="actions">
        <HomeContinue />
        <ReadLink />
        <Link className="text-link all-papers" href="/papers">
          All papers
        </Link>
        <Link className="text-link" href="/about">
          What are the Urantia Papers?
        </Link>
      </div>
      <HomePlace />
    </div>
  );
}
