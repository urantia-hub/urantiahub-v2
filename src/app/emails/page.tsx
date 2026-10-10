import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Emails", robots: { index: false, follow: false } };

// Where the "unsubscribe" link of an old email goes. The statement must be true of the live site:
// change it in the same change that starts an email.
export default function EmailsPage() {
  return (
    <div className="prose center">
      <h1>Emails</h1>
      <p>UrantiaHub sends no daily emails at this time. You get none, and you do not need to do anything.</p>
      <p>The only email from UrantiaHub is the one with your code when you sign in.</p>
      <p>
        <Link className="btn" href="/papers">
          All papers
        </Link>
      </p>
    </div>
  );
}
