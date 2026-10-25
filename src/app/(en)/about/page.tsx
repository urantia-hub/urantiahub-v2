import { AboutView, aboutMetadata } from "@/components/pages/AboutView";

export const metadata = aboutMetadata("en");

export default function AboutPage() {
  return <AboutView lang="en" />;
}
