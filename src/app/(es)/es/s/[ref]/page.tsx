import { notFound } from "next/navigation";
import { spanishOn } from "@/i18n/lang";
import { SharedPage, sharedMetadata } from "@/seo/SharedPage";

type Props = { params: Promise<{ ref: string }> };

// One real link, so the build checks the route. Each other link is made at its first request.
export function generateStaticParams() {
  return [{ ref: "1.0.1" }];
}

export async function generateMetadata({ params }: Props) {
  if (!spanishOn()) return {};
  return sharedMetadata((await params).ref, undefined, "es");
}

export default async function Page({ params }: Props) {
  if (!spanishOn()) notFound();
  return <SharedPage refPart={(await params).ref} lang="es" />;
}
