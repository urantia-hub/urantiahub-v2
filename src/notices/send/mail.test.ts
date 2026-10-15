import { describe, expect, it } from "vitest";
import { dailyMail, reminderMail } from "./mail";

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
