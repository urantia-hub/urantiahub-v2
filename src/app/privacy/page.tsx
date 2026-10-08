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
        holds the page address and a label such as a paper number. It holds no text that you read. The address of a
        search page is sent without the words of the search. The site sets no analytics cookie and keeps no identifier
        in your browser.
      </p>
      <p>PostHog processes your IP address when it receives a request from your browser.</p>
      <p>
        Searches. When you search, the site records the words of the search and how many results it found, so that we
        can see what readers look for. The record has no link to you. Our server sends it, not your browser, so it
        holds no IP address, no page that you opened, and nothing about your device.
      </p>
      <p>
        Your browser. The site keeps three things in your browser: your theme choice, the last place that you
        read, and your last five searches. They make the site open as you left it. They do not leave
        your device, and you can remove the searches with the Clear control on the search page.
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
