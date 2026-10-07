import { pageMetadata } from "@/seo/metadata";

export const metadata = pageMetadata({
  title: "Privacy",
  description: "What UrantiaHub collects and what it does not collect.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="prose">
      <h1>Privacy</h1>

      <h2>What UrantiaHub collects</h2>
      <p>
        Page analytics. When you open a page, the site sends an event to PostHog, our analytics provider. An event
        holds the page address and a label such as a paper number. It holds no text that you read or type. The site
        sets no analytics cookie and keeps no identifier in your browser.
      </p>
      <p>PostHog processes your IP address when it receives a request from your browser.</p>
      <p>
        Your theme. The site keeps your theme choice in your browser, so the page opens in the theme that you chose.
        The choice does not leave your device.
      </p>

      <h2>What UrantiaHub does not collect</h2>
      <p>
        This version of the site has no accounts. It does not ask for your name or your email address. It shows no
        advertising and sells no data.
      </p>

      <h2>Contact</h2>
      <p>
        Send a question about this page to <a href="mailto:team@urantiahub.com">team@urantiahub.com</a>.
      </p>
    </div>
  );
}
