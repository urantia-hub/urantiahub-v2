// @vitest-environment node
import { describe, expect, it } from "vitest";
import { dailyMail, opening, POSTAL, reminderMail } from "./mail";
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
    expect(mail.subject).toBe("Your passage for today · 99:1.1");
    expect(mail.html).toContain("Mankind is on the march &lt;b&gt;toward&lt;/b&gt; a new &amp; unrevealed planetary destiny.");
    expect(mail.html).toContain("99:1.1 · Paper 99, The Social Problems of Religion");
    expect(mail.text).toContain(passage.text);
    expect(mail.text).toContain(`Read the paper: ${passage.url}`);
  });

  it("ends with the reason, the way to turn it off, the settings, and the postal address", () => {
    for (const part of [mail.html, mail.text]) {
      expect(part).toContain("Turn this email off");
      expect(part).toContain("All notification settings");
    }
    expect(mail.text).toContain("107 Bellagio Drive, Austin, TX 78734");
    // A mail program makes a blue map link of an address. One style rule makes that link look like the text.
    expect(mail.html).toContain('<span class="addr"');
    expect(mail.html).toContain(".addr a{color:#756d5f !important;text-decoration:none !important;}");
    expect(mail.html).toContain("UrantiaHub · 107 Bellagio Drive, Austin, TX 78734");
    expect(mail.html).toContain(">UrantiaHub</p>");
    expect(mail.text).toContain(`Turn this email off: ${links.offUrl}`);
    expect(POSTAL.startsWith("UrantiaHub")).toBe(true);
  });

  it("links only to this site, and loads no remote file", () => {
    const urls = [...mail.html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    expect(urls).toEqual([passage.url, links.offUrl, links.settingsUrl]);
    expect(mail.html).not.toMatch(/<img|<link|<script|url\(|@import/);
  });

  it("names the Foreword with no paper number", () => {
    expect(dailyMail({ ...passage, paperId: "0", paperTitle: "Foreword", ref: "0:1.3" }, links).html).toContain("0:1.3 · Foreword");
  });
});

describe("the reminder email", () => {
  const place = { paperId: "2", paperTitle: "The Nature of God", url: "https://www.urantiahub.com/papers/paper-2-the-nature-of-god#2:1" };

  it("shows the first words of the section where the reader stopped, as a text that goes on", () => {
    const mail = reminderMail({ ...place, opening: "“Touching the Infinite, we cannot find him out" }, links);
    expect(mail.subject).toBe("Your place in the Papers");
    expect(mail.text).toContain("““Touching the Infinite, we cannot find him out …”");
    expect(mail.text).toContain("Paper 2, The Nature of God · where you stopped");
    expect(mail.text).toContain("Continue: https://www.urantiahub.com/papers/paper-2-the-nature-of-god#2:1");
    expect(mail.text).toContain("It comes one time for each place.");
  });

  it("names the paper when the words cannot be read", () => {
    const mail = reminderMail({ ...place, opening: null }, links);
    expect(mail.text).toContain("You stopped in Paper 2, The Nature of God. Your place is kept.");
    expect(mail.html).toContain("A reminder of your place");
  });
});

describe("the first words of a text", () => {
  it("are cut at a word, with no mark at the end", () => {
    const text = "The quality of infinity is in God, and it reaches to all that is; ".repeat(6);
    const cut = opening(text);
    expect(cut.length).toBeLessThanOrEqual(220);
    expect(text.startsWith(cut)).toBe(true);
    expect(text[cut.length]).toMatch(/[\s,;.]/);
    expect(cut).not.toMatch(/[\s.,;:]$/);
    expect(opening("A short text.")).toBe("A short text");
  });
});
