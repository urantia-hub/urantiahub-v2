import { SharedPage, sharedMetadata } from "@/seo/SharedPage";

type Props = { params: Promise<{ ref: string }> };

// One real link, so the build checks the route. Each other link is made at its first request.
export function generateStaticParams() {
  return [{ ref: "1.0.1" }];
}

export async function generateMetadata({ params }: Props) {
  return sharedMetadata((await params).ref);
}

export default async function Page({ params }: Props) {
  return <SharedPage refPart={(await params).ref} />;
}
