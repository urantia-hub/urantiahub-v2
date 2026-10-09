import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>UrantiaHub is an independent project. It is not affiliated with Urantia Foundation.</span>
      <span className="links">
        <span>
          For developers: <a href="https://urantia.dev">urantia.dev</a>
        </span>
        <Link href="/about">About</Link>
        <Link href="/privacy">Privacy</Link>
      </span>
    </footer>
  );
}
