import { PairPage, pairMetadata } from "@/pair/PairPage";

type Props = { params: Promise<{ ref: string; pick: string; b: string }> };

// One real pair, so the build checks the route. Each other pair is made at its first request.
export function generateStaticParams() {
  return [{ ref: "1.0.3", pick: "dhammapada", b: "21" }];
}

export async function generateMetadata({ params }: Props) {
  const { ref, pick, b } = await params;
  return pairMetadata([ref, pick, b]);
}

export default async function Page({ params }: Props) {
  const { ref, pick, b } = await params;
  return <PairPage parts={[ref, pick, b]} />;
}
