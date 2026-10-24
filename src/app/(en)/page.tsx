import { HomeView } from "@/components/home/HomeView";
import { excerptPassage, getPassage } from "@/content";
import { HOME_PASSAGES } from "@/content/passages";
import { messages } from "@/i18n/messages";
import { pageMetadata } from "@/seo/metadata";

const t = messages("en");

export const metadata = pageMetadata({
  // The template of the layout does not reach a page of the same folder, so the name of the site is here.
  title: t.homeMetaTitle,
  absoluteTitle: true,
  description: t.homeMetaDescription,
  path: "/",
  twin: "/es",
});

export default async function HomePage() {
  // The build fails here if a passage is not an exact run of whole sentences from its paragraph.
  const passages = await Promise.all(
    HOME_PASSAGES.map(async (entry) => excerptPassage(await getPassage(entry.ref), entry)),
  );
  return <HomeView lang="en" passages={passages} />;
}
