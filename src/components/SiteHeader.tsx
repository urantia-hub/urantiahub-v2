import Link from "next/link";
import { site } from "@/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        {site.name}
      </Link>
      <nav aria-label="Site">
        <Link href="/papers">Papers</Link>
        <Link href="/about">About</Link>
      </nav>
    </header>
  );
}
