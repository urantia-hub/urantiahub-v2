import Link from "next/link";
import { PassageStage } from "@/components/home/PassageStage";
import { ReadLink } from "@/components/home/ReadLink";
import { getPassage } from "@/content";
import { HOME_PASSAGES } from "@/content/passages";
import { JsonLd } from "@/seo/JsonLd";
import { pageMetadata, websiteJsonLd } from "@/seo/metadata";

export const metadata = pageMetadata({
  title: "The Urantia Papers",
  description: "Read the Urantia Papers: the full text of the foreword and all 196 papers, free and with no account.",
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  const passages = await Promise.all(HOME_PASSAGES.map((ref) => getPassage(ref)));
  return (
    <div className="home">
      <JsonLd data={websiteJsonLd()} />
      <h1>The Urantia Papers</h1>
      <PassageStage passages={passages} />
      <div className="actions">
        <ReadLink />
        <Link className="text-link" href="/about">
          What are the Urantia Papers?
        </Link>
      </div>
    </div>
  );
}
