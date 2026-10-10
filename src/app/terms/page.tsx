import Link from "next/link";
import { PRIVACY_EMAIL, PRIVACY_OPERATOR } from "@/content/privacy";
import { pageMetadata } from "@/seo/metadata";

export const TERMS_UPDATED = "October 10, 2026";

export const metadata = pageMetadata({
  title: "Terms",
  description: "The terms for the use of UrantiaHub: what the site is, what you can do with it, and what we promise.",
  path: "/terms",
});

// The terms of the Hub before this one, in plain words, for the features that this Hub has.
// Each statement here must be true of the code that is live. When a statement changes, change the date.
export default function TermsPage() {
  const accountsOn = process.env.NEXT_PUBLIC_SIGN_IN === "on";
  return (
    <div className="prose terms">
      <h1>Terms</h1>
      <p className="updated">Last updated: {TERMS_UPDATED}</p>

      <h2>The agreement</h2>
      <p>
        {PRIVACY_OPERATOR}, a Texas limited liability company, runs UrantiaHub. On this page, “we” means {PRIVACY_OPERATOR}.
        These terms are an agreement between you and us. When you use urantiahub.com, you agree to them. If you do not
        agree, do not use the site.
      </p>

      <h2>No affiliation</h2>
      <p>
        UrantiaHub is an independent project. It is not affiliated with, endorsed by, or sponsored by Urantia Foundation.
        The word “Urantia” on this site names the subject of the site, and nothing more.
      </p>

      <h2>What the site is</h2>
      <p>
        UrantiaHub is a place to read and study the Urantia Papers: the text, an audio narration, search, a glossary,
        and passages of other works that are near in meaning.{accountsOn && " With an account, you can also save paragraphs, write notes, and keep your place."}{" "}
        The site is free. It is intended for readers who are at least 18 years old.
      </p>
      <p>
        A computer finds the related passages of a search and the parallels of a paragraph. They are an aid to study.
        They are not guidance, and we do not promise that each one is right.
      </p>

      {accountsOn && (
        <>
          <h2>Your account</h2>
          <p>
            You can read with no account. If you make one, give a true email address and keep your sign-in to
            yourself. You are responsible for what happens in your account. We can suspend or close an account that
            breaks these terms. You can delete your account at any time.
          </p>

          <h2>What is yours</h2>
          <p>
            Your notes and your saved paragraphs are yours. Only you see them. You give us permission to store them
            and to show them to you, which is what the site needs to work. We ask for no other right to them.
          </p>
        </>
      )}

      <h2>What is ours, and what is open</h2>
      <p>
        The English text of the Urantia Papers is in the public domain. The design of this site, its code, and its
        audio narration are our work or are licensed to us. You can use the site for your own reading and study, and
        you can share a link, a paragraph, or an image that the site makes for you.
      </p>

      <h2>What you must not do</h2>
      <ul>
        <li>Use the site for a purpose that the law forbids.</li>
        <li>Try to get into systems or accounts that are not yours.</li>
        <li>Disturb or overload the site.</li>
        <li>Copy the site in bulk with an automated tool. Developers can use the open API at <a href="https://urantia.dev">urantia.dev</a>.</li>
        <li>Pretend to be another person.</li>
      </ul>

      <h2>Other services</h2>
      <p>
        The site links to other sites, for example the source of a passage of another work, and it uses other
        services to run. We are not responsible for what those sites say or do. <Link href="/privacy">The privacy page</Link>{" "}
        lists each service that handles data for us.
      </p>

      <h2>No warranty</h2>
      <p>
        The site is provided “as is” and “as available”, with no warranty of any kind, express or implied. We do not
        promise that it will always be there, or that it will have no faults.
      </p>

      <h2>Limit of liability</h2>
      <p>
        To the greatest extent that the law permits, {PRIVACY_OPERATOR} and its members, employees, and agents are not
        liable for indirect, incidental, special, consequential, or punitive damages that come from your use of the
        site.
      </p>

      <h2>Indemnity</h2>
      <p>
        You agree to hold {PRIVACY_OPERATOR} harmless from claims, damages, and costs that come from your use of the
        site{accountsOn && ", from what you write in it,"} or from a breach of these terms by you.
      </p>

      <h2>The law that applies</h2>
      <p>
        The laws of the State of Texas, United States, govern these terms. A dispute goes to the courts of Travis
        County, Texas, unless the law that applies to you requires another place.
      </p>

      <h2>Changes</h2>
      <p>
        We can change these terms. When a change is important, we say so on the site before it starts. If you use the
        site after a change, you accept the new terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
      </p>
    </div>
  );
}
