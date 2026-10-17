// The emails of the notices. Inline styles only. The one remote file is a picture of a release, at the same
// address for each reader, so nothing tells us that a reader opened an email.

export type Mail = { subject: string; html: string; text: string };
// A mail program turns an address into a blue link to a map, and nothing in an email stops that for
// each program. The one style rule of the email makes that link look like the text around it.
export const POSTAL = "UrantiaHub · 107 Bellagio Drive, Austin, TX 78734";
// Text from outside this file, as text in HTML.
export const esc = (value: string): string => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const UI = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

// A mail app with a dark theme can change the colors: the page asks for light only, and the button has an edge for the apps that do not obey.
// `quote`: the body is words of the Papers, shown as a quote that goes on.
// `list`: short lines under the body.
type Frame = { label: string; body: string; list?: string[]; cite: string; button: string; url: string; reason: string; offUrl: string; settingsUrl: string };

function html({ label, body, list, cite, button, url, reason, offUrl, settingsUrl }: Frame): string {
  const inner = `<p style="margin:0;font-family:${UI};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#756d5f;">${esc(label)}</p>
<p style="margin:16px 0 14px;font-family:${SERIF};font-size:20px;line-height:1.55;color:#26221c;">${esc(body)}</p>
${(list ?? []).map((line) => `<p style="margin:0 0 12px;font-family:${UI};font-size:15px;line-height:1.55;color:#26221c;">${esc(line)}</p>`).join("\n")}
<p style="margin:${list?.length ? "18px" : "0"} 0 0;font-family:${UI};font-size:13px;color:#756d5f;">${esc(cite)}</p>
${buttonHtml(button, url)}`;
  return shell(label, inner, { reason, offUrl, settingsUrl });
}

const buttonHtml = (button: string, url: string): string =>
  `<p style="margin:22px 0 0;"><a href="${esc(url)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#26221c;border:1px solid #8d8676;color:#fbf8f2;font-family:${UI};font-size:14.5px;font-weight:500;text-decoration:none;">${esc(button)}</a></p>`;

// The page of each email: the name at the top, the content, and the foot with the way off.
function shell(title: string, inner: string, { reason, offUrl, settingsUrl }: { reason: string; offUrl: string; settingsUrl: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${esc(title)}</title>
<style>:root{color-scheme:light only;}.addr a{color:#756d5f !important;text-decoration:none !important;}</style></head>
<body style="margin:0;padding:0;" bgcolor="#f1ede4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f1ede4" style="padding:28px 14px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#fbf8f2" style="max-width:600px;border:1px solid #e7e0d2;border-radius:10px;">
<tr><td style="padding:44px 36px 42px;">
<p style="margin:0 0 26px;font-family:${SERIF};font-size:18px;color:#26221c;">UrantiaHub</p>
${inner}
</td></tr>
<tr><td style="padding:22px 36px;border-top:1px solid #e7e0d2;font-family:${UI};font-size:12px;line-height:1.6;color:#756d5f;">
${esc(reason)}<br>
<a href="${esc(offUrl)}" style="color:#756d5f;">Turn this email off</a> · <a href="${esc(settingsUrl)}" style="color:#756d5f;">All notification settings</a><br>
<span class="addr" style="color:#756d5f;text-decoration:none;">${esc(POSTAL)}</span>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const text = ({ label, body, list, cite, button, url, reason, offUrl, settingsUrl }: Frame): string =>
  [label, "", body, "", ...(list?.length ? [...list.map((line) => `- ${line}`), ""] : []), cite, "", `${button}: ${url}`, "", "--", reason, `Turn this email off: ${offUrl}`, `All notification settings: ${settingsUrl}`, POSTAL].join("\n");

type Links = { offUrl: string; settingsUrl: string };

export function dailyMail(passage: { ref: string; text: string; paperId: string; paperTitle: string; url: string }, links: Links): Mail {
  const paper = passage.paperId === "0" ? passage.paperTitle : `Paper ${passage.paperId}, ${passage.paperTitle}`;
  const frame: Frame = {
    label: "Your passage for today",
    body: passage.text,
    cite: `${passage.ref} · ${paper}`,
    button: "Read the paper",
    url: passage.url,
    reason: "You get this email because you chose Email for “A passage each day” in UrantiaHub.",
    ...links,
  };
  return { subject: `Your passage for today · ${passage.ref}`, html: html(frame), text: text(frame) };
}

// `opening`: the first words of the section where the reader stopped, or null when they cannot be read.
export function reminderMail(place: { paperId: string; paperTitle: string; url: string; opening: string | null }, links: Links): Mail {
  const paper = place.paperId === "0" ? place.paperTitle : `Paper ${place.paperId}, ${place.paperTitle}`;
  const frame: Frame = {
    label: "Your place in the Papers",
    // The words as they are: a paragraph can start with its own quotation.
    body: place.opening ? `${place.opening} …` : `You stopped in ${paper}. Your place is kept.`,
    cite: place.opening ? `${paper} · where you stopped` : "This is the only reminder for this place.",
    button: "Continue",
    url: place.url,
    reason: "You get this email because you chose Email for “A reminder of your place” in UrantiaHub. It comes one time for each place.",
    ...links,
  };
  return { subject: "Your place in the Papers", html: html(frame), text: text(frame) };
}

// The email of a release with pictures: one line to start, each feature with its picture, more in a
// line each, and the video. An image path is on the site (`origin`); the words are text.
export type ReleasePictures = {
  lead: string;
  features: { title: string; line: string; image: string; alt: string }[];
  also: { title: string; line: string }[];
  video: { url: string; image: string; line: string };
};

const RELEASE_REASON = "You get this email because you chose Email for “New releases” in UrantiaHub. It comes a few times in a year.";

export function releaseMail(release: { title: string; changes: string[]; date: string; url: string; origin?: string; mail?: ReleasePictures }, links: Links): Mail {
  const subject = `New in UrantiaHub: ${release.title}`;
  if (release.mail) return { subject, ...picturesMail(release.mail, release.origin ?? "", links) };
  const frame: Frame = {
    label: "New in UrantiaHub",
    body: release.title,
    list: release.changes,
    cite: release.date,
    button: "See what is new",
    url: release.url,
    reason: RELEASE_REASON,
    ...links,
  };
  return { subject, html: html(frame), text: text(frame) };
}

function picturesMail(m: ReleasePictures, origin: string, links: Links): { html: string; text: string } {
  const p = (style: string, content: string) => `<p style="${style}">${content}</p>`;
  const picture = (src: string, alt: string, margin: string) =>
    `<img src="${esc(origin + src)}" width="528" alt="${esc(alt)}" style="display:block;width:100%;max-width:528px;height:auto;border:1px solid #e7e0d2;border-radius:8px;margin:${margin};">`;
  const inner = [
    p(`margin:0;font-family:${UI};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#756d5f;`, "New in UrantiaHub"),
    p(`margin:16px 0 26px;font-family:${SERIF};font-size:20px;line-height:1.5;color:#26221c;`, esc(m.lead)),
    ...m.features.map((f) =>
      [
        p(`margin:0 0 6px;font-family:${SERIF};font-size:17px;color:#26221c;`, esc(f.title)),
        p(`margin:0 0 12px;font-family:${UI};font-size:15px;line-height:1.55;color:#26221c;`, esc(f.line)),
        picture(f.image, f.alt, "0 0 30px"),
      ].join("\n"),
    ),
    p(`margin:0 0 10px;font-family:${UI};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#756d5f;`, "Also"),
    ...m.also.map((a, i) => p(`margin:0 0 ${i === m.also.length - 1 ? 26 : 10}px;font-family:${UI};font-size:15px;line-height:1.55;color:#26221c;`, `<b style="font-weight:600;">${esc(a.title)}</b> ${esc(a.line)}`)),
    `<a href="${esc(m.video.url)}" style="display:block;text-decoration:none;">${picture(m.video.image, m.video.line, "0").replace("border:1px solid #e7e0d2;", "")}</a>`,
    p(`margin:8px 0 0;font-family:${UI};font-size:13px;color:#756d5f;`, esc(m.video.line)),
    buttonHtml("Open UrantiaHub", `${origin}/`),
  ].join("\n");
  const text = [
    "New in UrantiaHub",
    "",
    m.lead,
    "",
    ...m.features.map((f) => `${f.title}: ${f.line}`),
    "",
    ...m.also.map((a) => `${a.title} ${a.line}`),
    "",
    `${m.video.line}: ${m.video.url}`,
    `Open UrantiaHub: ${origin}/`,
    "",
    "--",
    RELEASE_REASON,
    `Turn this email off: ${links.offUrl}`,
    `All notification settings: ${links.settingsUrl}`,
    POSTAL,
  ].join("\n");
  return { html: shell("New in UrantiaHub", inner, { reason: RELEASE_REASON, ...links }), text };
}

// The first words of a text, cut at a word, for a reader to go on from.
export function opening(text: string, most = 220): string {
  if (text.length <= most) return text.replace(/[\s.,;:]+$/, "");
  const cut = text.slice(0, most);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s.,;:—-]+$/, "");
}
