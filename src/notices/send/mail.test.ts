import { describe, expect, it } from "vitest";
import { dailyMail, releaseMail, reminderMail } from "./mail";

const links = { offUrl: "https://www.urantiahub.com/emails?off=1", settingsUrl: "https://www.urantiahub.com/notifications" };
const mail = dailyMail({ ref: "1:0.1", text: "Words.", paperId: "1", paperTitle: "The Universal Father", url: "https://www.urantiahub.com/papers/paper-1#1:0.1" }, links);

describe("an email in a mail app with a dark theme", () => {
  it("asks for the light colors only", () => {
    expect(mail.html).toContain('<meta name="color-scheme" content="light only">');
    expect(mail.html).toContain('<meta name="supported-color-schemes" content="light only">');
    expect(mail.html).toContain(":root{color-scheme:light only;}");
  });

  it("gives the button an edge, so it stays a button when the app changes the colors", () => {
    expect(mail.html).toMatch(/background:#26221c;border:1px solid #8d8676;/);
  });
});

// Found by Kelson: a paragraph that starts with its own quotation showed two opening quote marks.
describe("the reminder of a place", () => {
  it("shows the opening words as they are, with no quote marks of its own", () => {
    const mail = reminderMail(
      { paperId: "2", paperTitle: "The Nature of God", url: "https://www.urantiahub.com/papers/2", opening: "“Touching the Infinite, we cannot find him out.”" },
      links,
    );
    expect(mail.html).not.toContain("““");
    expect(mail.html).toContain("“Touching the Infinite, we cannot find him out.” …");
    expect(mail.text).toContain("“Touching the Infinite, we cannot find him out.” …");
  });
});

describe("the email of a release", () => {
  const release = { title: "A streak", changes: ["One section a day."], date: "October 17, 2026", url: "https://www.urantiahub.com/releases", origin: "https://www.urantiahub.com" };
  const pictures = {
    lead: "A streak, and more.",
    features: [{ title: "A streak", line: "One section a day.", image: "/email/r/streak.png", alt: "The streak" }],
    also: [{ title: "Your page.", line: "All in one place." }],
    video: { url: "https://www.youtube.com/watch?v=x", image: "/email/r/video.png", line: "Watch the video" },
  };

  it("keeps the plain list for a release with no pictures", () => {
    const mail = releaseMail(release, links);
    expect(mail.subject).toBe("New in UrantiaHub: A streak");
    expect(mail.html).toContain("One section a day.");
    expect(mail.html).not.toContain("<img");
  });

  it("shows each feature with its picture from the site, the video, and the way off", () => {
    const mail = releaseMail({ ...release, mail: pictures }, links);
    expect(mail.subject).toBe("New in UrantiaHub: A streak");
    expect(mail.html).toContain('src="https://www.urantiahub.com/email/r/streak.png"');
    expect(mail.html).toContain('alt="The streak"');
    expect(mail.html).toContain('href="https://www.youtube.com/watch?v=x"');
    expect(mail.html).toContain("A streak, and more.");
    expect(mail.html).toContain("Turn this email off");
    expect(mail.html).toContain('<meta name="color-scheme" content="light only">');
    expect(mail.text).toContain("A streak: One section a day.");
    expect(mail.text).toContain("Watch the video: https://www.youtube.com/watch?v=x");
    expect(mail.text).toContain(`Turn this email off: ${links.offUrl}`);
  });

  it("writes the words of a feature as text, never as HTML", () => {
    const mail = releaseMail({ ...release, mail: { ...pictures, features: [{ ...pictures.features[0], line: "<b>x</b>" }] } }, links);
    expect(mail.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
