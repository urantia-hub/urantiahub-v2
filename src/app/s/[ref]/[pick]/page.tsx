import { SharedPage, sharedMetadata } from "@/seo/SharedPage";

type Props = { params: Promise<{ ref: string; pick: string }> };

export function generateStaticParams() {
  return [{ ref: "1.0.1", pick: "1" }];
}

export async function generateMetadata({ params }: Props) {
  const { ref, pick } = await params;
  return sharedMetadata(ref, pick);
}

export default async function Page({ params }: Props) {
  const { ref, pick } = await params;
  return <SharedPage refPart={ref} pickPart={pick} />;
}
