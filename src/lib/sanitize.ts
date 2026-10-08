const ALLOWED_TAGS = new Set(["span", "em", "sup", "sub", "i", "b", "strong"]);
const ALLOWED_CLASS = /^(?:urantia-dev-[a-z0-9-]+|scaps)$/;
const TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|</g;
const CLASS_ATTR = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

// Permits only the known tags and classes in paragraph HTML from the API.
// Unknown markup is removed and its words stay. The result always has matched tags,
// so a fault in one paragraph cannot change the look of the next one.
export function sanitizeParagraphHtml(html: string): string {
  const open: string[] = [];
  const body = html.replace(TOKEN, (match, closing: string | undefined, tag: string | undefined, attrs: string | undefined) => {
    if (tag === undefined) return match === "<" ? "&lt;" : "";
    const name = tag.toLowerCase();
    // A line break becomes a space, so that the two words beside it do not join.
    if (name === "br") return " ";
    if (!ALLOWED_TAGS.has(name)) return "";
    if (closing) {
      const at = open.lastIndexOf(name);
      // A closing tag with no opening tag is removed.
      if (at === -1) return "";
      // Tags that the source left open inside this one are closed first.
      return open
        .splice(at)
        .reverse()
        .map((inner) => `</${inner}>`)
        .join("");
    }
    open.push(name);
    const found = CLASS_ATTR.exec(attrs ?? "");
    const classes = (found?.[1] ?? found?.[2] ?? "").split(/\s+/).filter((c) => ALLOWED_CLASS.test(c));
    return classes.length > 0 ? `<${name} class="${classes.join(" ")}">` : `<${name}>`;
  });
  return (
    body +
    open
      .reverse()
      .map((name) => `</${name}>`)
      .join("")
  );
}
