"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { headerBack } from "@/library/header-back";

// In the header beside the mark, on the pages of World texts: the way up one step (Kelson, 2026-10-19).
export function HeaderBack() {
  const back = headerBack(usePathname() ?? "");
  if (!back) return null;
  return (
    <Link className="hdr-back" href={back.href}>
      <Icon name="back" />
      {back.label}
    </Link>
  );
}
