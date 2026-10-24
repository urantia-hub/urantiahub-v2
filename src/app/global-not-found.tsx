import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";
import { RootShell } from "@/components/RootShell";

export const metadata: Metadata = { title: "Page not found | UrantiaHub" };

// An address that matches no route. The app has two root layouts, so this page brings its own shell.
export default function GlobalNotFound() {
  return (
    <RootShell lang="en">
      <NotFoundView lang="en" />
    </RootShell>
  );
}
