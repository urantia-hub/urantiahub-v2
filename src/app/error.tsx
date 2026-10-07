"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportError } from "@/monitoring";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <div className="prose center">
      <h1>This page did not load</h1>
      <p>The site could not get this page. The fault is on our side.</p>
      <p>
        <button className="btn" type="button" onClick={reset}>
          Try again
        </button>
      </p>
      <p>
        <Link className="text-link" href="/papers">
          All papers
        </Link>
      </p>
    </div>
  );
}
