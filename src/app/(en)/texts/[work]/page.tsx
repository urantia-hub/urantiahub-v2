import { WorkHomePage, workMetadata, workParams } from "@/library/pages";

type Props = { params: Promise<{ work: string }> };

export const generateStaticParams = workParams;

export async function generateMetadata({ params }: Props) {
  return workMetadata((await params).work, "en");
}

export default async function Page({ params }: Props) {
  return <WorkHomePage slug={(await params).work} lang="en" />;
}
