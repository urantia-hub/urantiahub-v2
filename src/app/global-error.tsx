"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "Georgia, serif", textAlign: "center", padding: "20vh 20px" }}>
        <h1>This page did not load</h1>
        <p>The fault is on our side.</p>
        <p>
          {/* A full page load on purpose: the app router failed, so a client transition can fail too. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/papers">All papers</a>
        </p>
      </body>
    </html>
  );
}
