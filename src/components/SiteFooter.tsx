import Link from "next/link";
import { CONTACT_EMAIL } from "@/content/contact";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>UrantiaHub is an independent project. It is not affiliated with Urantia Foundation.</span>
      <nav className="links" aria-label="About UrantiaHub">
        <Link href="/about">About</Link>
        <Link href="/resources">Resources</Link>
        <Link href="/releases">Releases</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <span>
          For developers: <a href="https://urantia.dev">urantia.dev</a>
        </span>
      </nav>
    </footer>
  );
}
