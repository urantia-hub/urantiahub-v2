import { notFound } from "next/navigation";
import { spanishOn } from "@/i18n/lang";
import { PairPage, pairMetadata } from "@/pair/PairPage";

type Props = { params: Promise<{ ref: string; pick: string; b: string }> };

// The Spanish pair page: the same parts as the English one under /es/s/. One real pair is built with the site.
export function generateStaticParams() {
  return [{ ref: "1.0.3", pick: "dhammapada", b: "21" }];
}

export async function generateMetadata({ params }: Props) {
  if (!spanishOn()) return {};
  const { ref, pick, b } = await params;
  return pairMetadata([ref, pick, b], "es");
}

export default async function Page({ params }: Props) {
  if (!spanishOn()) notFound();
  const { ref, pick, b } = await params;
  return <PairPage parts={[ref, pick, b]} lang="es" />;
}
