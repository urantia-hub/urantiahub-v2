import { PrivacyView, privacyMetadata } from "@/components/pages/PrivacyView";

export const metadata = privacyMetadata("en");

export default function PrivacyPage() {
  return <PrivacyView lang="en" />;
}
