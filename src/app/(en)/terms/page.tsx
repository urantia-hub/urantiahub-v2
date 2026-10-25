import { TermsView, termsMetadata } from "@/components/pages/TermsView";

export const metadata = termsMetadata("en");

export default function TermsPage() {
  return <TermsView lang="en" />;
}
