import { ACCOUNT_ITEMS, ACCOUNT_UPDATED, ACCOUNT_VENDORS, BROWSER_ITEMS, PRIVACY_EMAIL, PRIVACY_OPERATOR, PRIVACY_UPDATED, VENDORS } from "@/content/privacy";
import { pageMetadata } from "@/seo/metadata";

export const metadata = pageMetadata({
  title: "Privacy",
  description: "What UrantiaHub collects, who handles it, and the choices that you have.",
  path: "/privacy",
});

const Email = () => <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>;

// The lists of vendors and browser items are in src/content/privacy.ts. Each statement here must be true of
// the code that is live. When a statement changes, change the date in that file.
// A reader can sign in only while this setting is on. The page states the facts of accounts only then,
// so each statement is true of the live site in both cases.
export default function PrivacyPage() {
  const accountsOn = process.env.NEXT_PUBLIC_SIGN_IN === "on";
  const vendors = accountsOn ? [...VENDORS, ...ACCOUNT_VENDORS] : VENDORS;
  return (
    <div className="prose privacy">
      <h1>Privacy</h1>
      <p className="updated">Last updated: {accountsOn ? ACCOUNT_UPDATED : PRIVACY_UPDATED}</p>

      <h2>The short version</h2>
      <ul>
        <li>You can read and listen with no account. The site does not ask for your name or your email address.</li>
        {accountsOn && <li>An account is optional. With one, your place and your reader settings follow you to each device.</li>}
        <li>The site shows no advertising, and it sells no data.</li>
        <li>It counts which pages and features readers use, with no cookie and no identifier.</li>
        <li>It records what readers search for, with no link to the reader.</li>
        <li>
          Questions: <Email />.
        </li>
      </ul>

      <h2>Who we are</h2>
      <p>
        {PRIVACY_OPERATOR} runs UrantiaHub. On this page, “we” means {PRIVACY_OPERATOR}. UrantiaHub is an independent
        project. It is not affiliated with Urantia Foundation.
      </p>

      <h2>What the site collects, and why</h2>
      <h3>Page analytics</h3>
      <p>
        When you open a page or use a feature, the site sends an event to PostHog, our analytics provider. An event
        holds the page address and a label such as a paper number. It holds no text that you read. The address of a
        search page is sent without the words of the search. The site sets no analytics cookie and keeps no identifier
        in your browser. PostHog processes your IP address when it receives a request from your browser.
      </p>
      <p>We use this to see which parts of the site help readers, and to find faults.</p>

      <h3>Searches</h3>
      <p>
        When you search, the site records the words of the search and how many results it found, so that we can see
        what readers look for. The record has no link to you. Our server sends it, not your browser, so it holds no
        IP address, no page that you opened, and nothing about your device.
      </p>
      <p>
        To find results, our server sends the words of the search to the content service that holds the text. For the
        related passages, that service sends the words to OpenAI, which compares their meaning with the text. Neither
        one receives your IP address or anything else about you.
      </p>

      <h3>Request logs</h3>
      <p>
        As for each website, our hosting provider keeps a log of each request for a limited time, to keep the site
        safe and to find faults. A log line holds your IP address and the address of the page. The address of a search
        page holds the words of the search.
      </p>

      {accountsOn && (
        <>
          <h3>If you sign in</h3>
          <p>
            You can sign in with a UrantiaHub account. It is optional, and nothing on the site needs it for reading or
            listening. If you sign in, the account holds these things, so that they are the same on each of your
            devices:
          </p>
          <ul>
            {ACCOUNT_ITEMS.map((item) => (
              <li key={item}>{item}.</li>
            ))}
          </ul>
          <p>
            One cookie holds your sign-in. It is encrypted, and a script on the page cannot read it. A second cookie
            says only that you are signed in, so that the page can show the right controls. We use neither one for
            analytics or advertising. Analytics events have no link to your account.
          </p>
          <p>
            When you sign out on a device, the last place that you read leaves that browser. Your account still holds
            it.
          </p>
          <p>
            On <a href="https://accounts.urantiahub.com">accounts.urantiahub.com</a> you can see each app that has
            access to your account, remove one, or delete the account. When you delete the account, we delete what it
            holds.
          </p>
        </>
      )}

      <h2>What stays in your browser</h2>
      <p>
        The site keeps these things in your browser.{" "}
        {accountsOn ? "If you sign in, the place, the theme, and the text size also go to your account. For each other reader, nothing of this leaves the device." : "They do not leave your device."}
      </p>
      <ul>
        {BROWSER_ITEMS.map((item) => (
          <li key={item.name}>
            {item.name}, {item.why}.
          </li>
        ))}
      </ul>
      <p>You can remove each of them when you clear the site data in your browser.</p>

      <h2>Who handles data for us</h2>
      <p>These companies do work for the site. Each one receives only what its work needs.</p>
      <div className="table-wrap">
        <table aria-label="Companies that handle data for UrantiaHub">
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">What it does</th>
              <th scope="col">What it receives</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr key={vendor.name}>
                <th scope="row">
                  {vendor.name}
                  <a href={vendor.policy} rel="noopener" aria-label={`${vendor.name} privacy policy`}>
                    Policy
                  </a>
                </th>
                <td>{vendor.purpose}</td>
                <td>{vendor.receives}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>We do not sell data, and we do not share it for advertising.</p>

      <h2>Your choices</h2>
      <ul>
        <li>
          If your browser sends a Do Not Track or a Global Privacy Control signal, the site sends no analytics event
          and makes no record of your searches in its analytics.
        </li>
        <li>You can clear the site data in your browser at any time. The site still works.</li>
        <li>
          You can ask what we hold, or ask us to remove it: <Email />. With no account, we hold nothing under your
          name, so tell us what you look for.
        </li>
      </ul>

      <h2>Changes to this page</h2>
      <p>
        {accountsOn
          ? "The site will grow: bookmarks and notes are planned. New on this date: you can sign in with a UrantiaHub account. When this page changes, the date at the top changes, and this page says what is new."
          : "The site will grow: accounts, saved places, and notes are planned. When this page changes, the date at the top changes, and this page says what is new."}
      </p>

      <h2>Contact</h2>
      <p>
        Send a question about your privacy to <Email />.
      </p>
    </div>
  );
}
