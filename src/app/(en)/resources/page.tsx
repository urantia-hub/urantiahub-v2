import { ResourcesView, resourcesMetadata } from "@/components/pages/ResourcesView";

export const metadata = resourcesMetadata("en");

export default function ResourcesPage() {
  return <ResourcesView lang="en" />;
}
