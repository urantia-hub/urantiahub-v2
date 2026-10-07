import { ContentsView } from "@/components/ContentsView";
import { pageMetadata } from "@/seo/metadata";

export const metadata = pageMetadata({
  title: "Papers",
  description: "The table of contents of the Urantia Papers: the foreword and 196 papers in four parts.",
  path: "/papers",
});

export default function PapersPage() {
  return <ContentsView />;
}
