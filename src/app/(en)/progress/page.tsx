import { permanentRedirect } from "next/navigation";

// The progress is a part of the reader's page since 2026-10-12.
export default function ProgressPage() {
  permanentRedirect("/you");
}
