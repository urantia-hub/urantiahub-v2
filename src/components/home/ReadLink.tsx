"use client";

import Link from "next/link";
import { track } from "@/analytics";

export function ReadLink() {
  return (
    <Link className="btn" href="/papers" onClick={() => track("home_read_clicked")}>
      Read the Papers
    </Link>
  );
}
