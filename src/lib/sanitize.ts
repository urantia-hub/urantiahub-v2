const ALLOWED_TAGS = new Set(["span", "em", "sup", "sub", "i", "b", "strong"]);
const ALLOWED_CLASS = /^(?:urantia-dev-[a-z0-9-]+|scaps)$/;
const TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|</g;
const CLASS_ATTR = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

// Permits only the known tags and classes in paragraph HTML from the API.
// Unknown markup is removed and its words stay.
export function sanitizeParagraphHtml(html: string): string {
  return html.replace(TOKEN, (match, closing: string | undefined, tag: string | undefined, attrs: string | undefined) => {
    if (tag === undefined) return match === "<" ? "&lt;" : "";
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    if (closing) return `</${name}>`;
    const found = CLASS_ATTR.exec(attrs ?? "");
    const classes = (found?.[1] ?? found?.[2] ?? "").split(/\s+/).filter((c) => ALLOWED_CLASS.test(c));
    return classes.length > 0 ? `<${name} class="${classes.join(" ")}">` : `<${name}>`;
  });
}
