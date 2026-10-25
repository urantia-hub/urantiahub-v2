import { ReleasesView, releasesMetadata } from "@/components/pages/ReleasesView";

export const metadata = releasesMetadata("en");

export default function ReleasesPage() {
  return <ReleasesView lang="en" />;
}
