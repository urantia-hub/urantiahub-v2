import { notFound } from "next/navigation";
import { spanishOn } from "@/i18n/lang";
import { WorkPagePage, workPageMetadata, workPageParams } from "@/library/pages";

type Props = { params: Promise<{ work: string; page: string }> };

// The same pages as in English: the first page of each work at the build, the others at their first visit.
export const generateStaticParams = workPageParams;

export async function generateMetadata({ params }: Props) {
  if (!spanishOn()) return {};
  const { work, page } = await params;
  return workPageMetadata(work, page, "es");
}

export default async function Page({ params }: Props) {
  if (!spanishOn()) notFound();
  const { work, page } = await params;
  return <WorkPagePage slug={work} pageKey={page} lang="es" />;
}
