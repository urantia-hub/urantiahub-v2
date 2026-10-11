// The emails of the notices. Inline styles only, and no remote file: a mail program shows the email
// as it is, and nothing tells us that a reader opened it.

export type Mail = { subject: string; html: string; text: string };
export const POSTAL = "UrantiaHub · 107 Bellagio Drive, Austin, TX 78734";
// The same words for the HTML part. A mail program turns an address into a blue link to a map. A mark
// of no width inside the words stops that, and a reader sees the same text.
const POSTAL_HTML = "UrantiaHub · 107 Bell&zwnj;agio Dr&zwnj;ive, Aus&zwnj;tin, T&zwnj;X 78&zwnj;734";

// Text from outside this file, as text in HTML.
export const esc = (value: string): string => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const UI = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

// `quote`: the body is words of the Papers, shown as a quote that goes on.
type Frame = { label: string; body: string; cite: string; button: string; url: string; reason: string; offUrl: string; settingsUrl: string };

function html({ label, body, cite, button, url, reason, offUrl, settingsUrl }: Frame): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(label)}</title></head>
<body style="margin:0;padding:0;" bgcolor="#f1ede4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f1ede4" style="padding:28px 14px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#fbf8f2" style="max-width:600px;border:1px solid #e7e0d2;border-radius:10px;">
<tr><td style="padding:44px 36px 42px;">
<p style="margin:0 0 26px;font-family:${SERIF};font-size:18px;color:#26221c;">UrantiaHub</p>
<p style="margin:0;font-family:${UI};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#756d5f;">${esc(label)}</p>
<p style="margin:16px 0 14px;font-family:${SERIF};font-size:20px;line-height:1.55;color:#26221c;">${esc(body)}</p>
<p style="margin:0;font-family:${UI};font-size:13px;color:#756d5f;">${esc(cite)}</p>
<p style="margin:22px 0 0;"><a href="${esc(url)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#26221c;color:#fbf8f2;font-family:${UI};font-size:14.5px;font-weight:500;text-decoration:none;">${esc(button)}</a></p>
</td></tr>
<tr><td style="padding:22px 36px;border-top:1px solid #e7e0d2;font-family:${UI};font-size:12px;line-height:1.6;color:#756d5f;">
${esc(reason)}<br>
<a href="${esc(offUrl)}" style="color:#756d5f;">Turn this email off</a> · <a href="${esc(settingsUrl)}" style="color:#756d5f;">All notification settings</a><br>
${POSTAL_HTML}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const text = ({ label, body, cite, button, url, reason, offUrl, settingsUrl }: Frame): string =>
  [label, "", body, "", cite, "", `${button}: ${url}`, "", "--", reason, `Turn this email off: ${offUrl}`, `All notification settings: ${settingsUrl}`, POSTAL].join("\n");

type Links = { offUrl: string; settingsUrl: string };

export function dailyMail(passage: { ref: string; text: string; paperId: string; paperTitle: string; url: string }, links: Links): Mail {
  const paper = passage.paperId === "0" ? passage.paperTitle : `Paper ${passage.paperId}, ${passage.paperTitle}`;
  const frame: Frame = {
    label: "A passage for today",
    body: passage.text,
    cite: `${passage.ref} · ${paper}`,
    button: "Read the paper",
    url: passage.url,
    reason: "You get this email because you chose Email for “A passage each day” in UrantiaHub.",
    ...links,
  };
  return { subject: `A passage for today · ${passage.ref}`, html: html(frame), text: text(frame) };
}

// `opening`: the first words of the section where the reader stopped, or null when they cannot be read.
export function reminderMail(place: { paperId: string; paperTitle: string; url: string; opening: string | null }, links: Links): Mail {
  const paper = place.paperId === "0" ? place.paperTitle : `Paper ${place.paperId}, ${place.paperTitle}`;
  const frame: Frame = {
    label: "Your place in the Papers",
    body: place.opening ? `“${place.opening} …”` : `You stopped in ${paper}. Your place is kept.`,
    cite: place.opening ? `${paper} · where you stopped` : "This is the only reminder for this place.",
    button: "Continue",
    url: place.url,
    reason: "You get this email because you chose Email for “A reminder of your place” in UrantiaHub. It comes one time for each place.",
    ...links,
  };
  return { subject: "Your place in the Papers", html: html(frame), text: text(frame) };
}

// The first words of a text, cut at a word, for a reader to go on from.
export function opening(text: string, most = 220): string {
  if (text.length <= most) return text.replace(/[\s.,;:]+$/, "");
  const cut = text.slice(0, most);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s.,;:—-]+$/, "");
}
