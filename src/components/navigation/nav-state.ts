export type NavSection = { id: string; title: string | null };
export type NavPaper = { id: string; title: string; href: string };

// The bar leaves on a scroll down and returns on a scroll up. Small movements change nothing.
export function nextHidden(lastY: number, y: number, hidden: boolean): boolean {
  if (y > lastY + 6 && y > 80) return true;
  if (y < lastY - 6) return false;
  return hidden;
}

// The Foreword's section titles carry Roman numbers in the source: "I. Deity and Divinity".
export function hasOwnNumber(title: string | null): boolean {
  return /^[IVXLC]+\.\s/.test(title ?? "");
}

// Section 0 has no title in the text. "Introduction" is the Hub's label for it.
export function sectionLabel(section: NavSection): string {
  if (section.id === "0") return "Introduction";
  if (hasOwnNumber(section.title)) return section.title!;
  return `${section.id}. ${section.title ?? ""}`.trim();
}
