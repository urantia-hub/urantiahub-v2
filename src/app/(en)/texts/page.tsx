import { LibraryPage, libraryMetadata } from "@/library/pages";

export const generateMetadata = () => libraryMetadata("en");

export default function Page() {
  return <LibraryPage lang="en" />;
}
