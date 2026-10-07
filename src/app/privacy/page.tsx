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
      <p>
        Error reports. When the site has a fault, it sends a report to Sentry, our error provider. A report holds
        technical data: the page address, the browser type, and the fault.
      </p>
      <p>Both providers process your IP address when they receive a request from your browser.</p>

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
