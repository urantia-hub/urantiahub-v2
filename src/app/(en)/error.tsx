"use client";

import { ErrorView } from "@/components/ErrorView";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView lang="en" reset={reset} />;
}
