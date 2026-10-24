import { notFound } from "next/navigation";
import { spanishOn } from "@/i18n/lang";
import { SharedPage, sharedMetadata } from "@/seo/SharedPage";

type Props = { params: Promise<{ ref: string; pick: string }> };

export function generateStaticParams() {
  return [{ ref: "1.0.1", pick: "1" }];
}

export async function generateMetadata({ params }: Props) {
  if (!spanishOn()) return {};
  const { ref, pick } = await params;
  return sharedMetadata(ref, pick, "es");
}

export default async function Page({ params }: Props) {
  if (!spanishOn()) notFound();
  const { ref, pick } = await params;
  return <SharedPage refPart={ref} pickPart={pick} lang="es" />;
}
