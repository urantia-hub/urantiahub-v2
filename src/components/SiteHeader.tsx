import Link from "next/link";
import { BookmarkMark } from "@/brand/BookmarkMark";
import { site } from "@/site";
import { Icon } from "./icons";
import { SearchShortcut } from "./search/SearchShortcut";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <BookmarkMark size={22} />
        {site.name}
      </Link>
      <nav aria-label="Site">
        <Link href="/papers">Papers</Link>
        <Link href="/about">About</Link>
        <Link className="icon-link" href="/search" aria-label="Search" title="Search ( / )">
          <Icon name="search" />
        </Link>
        <SearchShortcut />
        <ThemeToggle icon />
      </nav>
    </header>
  );
}
