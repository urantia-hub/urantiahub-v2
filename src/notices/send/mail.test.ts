import { describe, expect, it } from "vitest";
import { dailyMail } from "./mail";

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
