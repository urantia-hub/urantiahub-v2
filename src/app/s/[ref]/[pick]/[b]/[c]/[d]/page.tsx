import { PairPage, pairMetadata } from "@/pair/PairPage";

type Props = { params: Promise<{ ref: string; pick: string; b: string; c: string; d: string }> };

// One real pair, so the build checks the route. Each other pair is made at its first request.
export function generateStaticParams() {
  return [{ ref: "1.0.3", pick: "1", b: "dhammapada", c: "21", d: "1" }];
}

export async function generateMetadata({ params }: Props) {
  const { ref, pick, b, c, d } = await params;
  return pairMetadata([ref, pick, b, c, d]);
}

export default async function Page({ params }: Props) {
  const { ref, pick, b, c, d } = await params;
  return <PairPage parts={[ref, pick, b, c, d]} />;
}
