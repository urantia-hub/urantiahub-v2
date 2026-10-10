import Link from "next/link";
import { BookmarkMark } from "@/brand/BookmarkMark";
import { site } from "@/site";
import { Icon } from "./icons";
import { ReaderSettings } from "./ReaderSettings";
import { SearchShortcut } from "./search/SearchShortcut";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <BookmarkMark size={22} />
        <span className="brand-name">{site.name}</span>
      </Link>
      <nav aria-label="Site">
        <Link href="/papers">Papers</Link>
        <Link href="/about">About</Link>
        <Link className="icon-link" href="/search" aria-label="Search" title="Search ( / )">
          <Icon name="search" />
        </Link>
        <SearchShortcut />
        {/* Where the header has icons only: the way to the list of all papers. */}
        <Link className="icon-link contents-link" href="/papers" aria-label="All papers" title="All papers">
          <Icon name="list" />
        </Link>
        <ThemeToggle icon />
        <ReaderSettings />
      </nav>
    </header>
  );
}
