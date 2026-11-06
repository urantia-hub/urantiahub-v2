import { VisionView, visionMetadata } from "@/components/pages/VisionView";

export const metadata = visionMetadata("en");

export default function VisionPage() {
  return <VisionView lang="en" />;
}
