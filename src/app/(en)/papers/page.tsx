import { ContentsView } from "@/components/ContentsView";
import { pageMetadata } from "@/seo/metadata";

export const metadata = pageMetadata({
  title: "All 196 Urantia Papers: table of contents",
  description: "The table of contents of the Urantia Papers: the foreword and 196 papers in four parts. Each paper is free to read, with audio.",
  path: "/papers",
});

export default function PapersPage() {
  return <ContentsView />;
}
