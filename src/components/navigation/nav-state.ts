export type NavSection = { id: string; title: string | null };
export type NavPaper = { id: string; title: string; href: string };

// The bar leaves on a scroll down and returns on a scroll up. Small movements change nothing.
export function nextHidden(lastY: number, y: number, hidden: boolean): boolean {
  if (y > lastY + 6 && y > 80) return true;
  if (y < lastY - 6) return false;
  return hidden;
}

// Section 0 has no title in the text. "Introduction" is the Hub's label for it.
export function sectionLabel(section: NavSection): string {
  return section.id === "0" ? "Introduction" : `${section.id}. ${section.title ?? ""}`.trim();
}
