// @vitest-environment node
import { describe, expect, it } from "vitest";
import { dailyMail, POSTAL, reminderMail } from "./mail";
import { offToken, readOffToken } from "./token";

const ME = "00000000-0000-4000-8000-0000000000a1";
const links = { offUrl: "https://www.urantiahub.com/emails?off=TOKEN", settingsUrl: "https://www.urantiahub.com/notifications" };

describe("the proof in “Turn this email off”", () => {
  it("names one reader and one notice", () => {
    expect(readOffToken("secret", offToken("secret", ME, "daily"))).toEqual({ userId: ME, kind: "daily" });
    expect(readOffToken("secret", offToken("secret", ME, "releases"))).toEqual({ userId: ME, kind: "releases" });
  });

  it("is refused when it was made with another secret, changed, or is not a proof", () => {
    const token = offToken("secret", ME, "daily");
    const [body, mac] = token.split(".");
    const other = Buffer.from(`${ME}:reminder`).toString("base64url");
    for (const bad of [offToken("other", ME, "daily"), `${other}.${mac}`, `${body}.${mac}x`, `${body}.`, body, `${token}.x`, "", 5, null, "x".repeat(400)]) {
      expect(readOffToken("secret", bad)).toBeNull();
    }
    expect(readOffToken("", token)).toBeNull();
  });
});

describe("the daily email", () => {
  const passage = { ref: "99:1.1", text: "Mankind is on the march <b>toward</b> a new & unrevealed planetary destiny.", paperId: "99", paperTitle: "The Social Problems of Religion", url: "https://www.urantiahub.com/papers/paper-99-the-social-problems-of-religion#99:1.1" };
  const mail = dailyMail(passage, links);

  it("has the passage as text, its reference, and one link to it", () => {
    expect(mail.subject).toBe("A passage for today · 99:1.1");
    expect(mail.html).toContain("Mankind is on the march &lt;b&gt;toward&lt;/b&gt; a new &amp; unrevealed planetary destiny.");
    expect(mail.html).toContain("99:1.1 · Paper 99, The Social Problems of Religion");
    expect(mail.text).toContain(passage.text);
    expect(mail.text).toContain(`Read the paper: ${passage.url}`);
  });

  it("ends with the reason, the way to turn it off, the settings, and the postal address", () => {
    for (const part of [mail.html, mail.text]) {
      expect(part).toContain("Turn this email off");
      expect(part).toContain("All notification settings");
      expect(part).toContain("107 Bellagio Drive, Austin, TX 78734");
    }
    expect(mail.text).toContain(`Turn this email off: ${links.offUrl}`);
    expect(POSTAL.startsWith("UrantiaHub")).toBe(true);
  });

  it("links only to this site, and loads no remote file", () => {
    const urls = [...mail.html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    expect(urls).toEqual([passage.url, links.offUrl, links.settingsUrl]);
    expect(mail.html).not.toMatch(/<img|<link|<script/);
  });

  it("names the Foreword with no paper number", () => {
    expect(dailyMail({ ...passage, paperId: "0", paperTitle: "Foreword", ref: "0:1.3" }, links).html).toContain("0:1.3 · Foreword");
  });
});

describe("the reminder email", () => {
  it("names the paper, has one link to the place, and says that it comes one time", () => {
    const mail = reminderMail({ paperId: "2", paperTitle: "The Nature of God", url: "https://www.urantiahub.com/papers/paper-2-the-nature-of-god#2:1" }, links);
    expect(mail.subject).toBe("Your place in the Papers");
    expect(mail.text).toContain("You stopped in Paper 2, The Nature of God.");
    expect(mail.text).toContain("This is the only reminder for this place.");
    expect(mail.text).toContain("Continue: https://www.urantiahub.com/papers/paper-2-the-nature-of-god#2:1");
    expect(mail.html).toContain("A reminder of your place");
  });
});
