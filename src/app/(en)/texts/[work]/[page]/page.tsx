import { WorkPagePage, workPageMetadata, workPageParams } from "@/library/pages";

type Props = { params: Promise<{ work: string; page: string }> };

// The first page of each work is built with the site. The other pages are built at their first visit. A work of
// one page has its text on the page of the work, and its one page redirects there.
export const generateStaticParams = workPageParams;

export async function generateMetadata({ params }: Props) {
  const { work, page } = await params;
  return workPageMetadata(work, page, "en");
}

export default async function Page({ params }: Props) {
  const { work, page } = await params;
  return <WorkPagePage slug={work} pageKey={page} lang="en" />;
}
