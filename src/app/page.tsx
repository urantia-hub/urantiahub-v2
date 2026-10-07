import Link from "next/link";
import { PassageStage } from "@/components/home/PassageStage";
import { ReadLink } from "@/components/home/ReadLink";
import { getPassage } from "@/content";
import { HOME_PASSAGES } from "@/content/passages";

export default async function HomePage() {
  const passages = await Promise.all(HOME_PASSAGES.map((ref) => getPassage(ref)));
  return (
    <div className="home">
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
