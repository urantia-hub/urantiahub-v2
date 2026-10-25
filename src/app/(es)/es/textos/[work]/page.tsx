import { notFound } from "next/navigation";
import { spanishOn } from "@/i18n/lang";
import { WorkHomePage, workMetadata, workParams } from "@/library/pages";

type Props = { params: Promise<{ work: string }> };

export const generateStaticParams = workParams;

export async function generateMetadata({ params }: Props) {
  return spanishOn() ? workMetadata((await params).work, "es") : {};
}

export default async function Page({ params }: Props) {
  if (!spanishOn()) notFound();
  return <WorkHomePage slug={(await params).work} lang="es" />;
}
