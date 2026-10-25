import { HowPage, howMetadata } from "@/library/pages";

export const generateMetadata = () => howMetadata("en");

export default function Page() {
  return <HowPage lang="en" />;
}
