import type { Metadata } from "next";
import Link from "next/link";
import { RootShell } from "@/components/RootShell";

export const metadata: Metadata = { title: "Page not found | UrantiaHub" };

// An address that matches no route. The app has two root layouts, so this page brings its own shell.
export default function GlobalNotFound() {
  return (
    <RootShell lang="en">
      <div className="prose center">
        <h1>Page not found</h1>
        <p>This address has no page.</p>
        <p>
          <Link className="btn" href="/papers">
            All papers
          </Link>
        </p>
      </div>
    </RootShell>
  );
}
