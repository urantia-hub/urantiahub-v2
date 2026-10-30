import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_ITEMS_ES, ACCOUNT_LANGUAGE_ITEM_ES, ACCOUNT_VENDORS, BROWSER_ITEMS, LANGUAGE_ITEM, NOTICE_ITEMS_ES, STREAK_ITEMS_ES, STREAK_SUPABASE_RECEIVES_ES, VENDORS, VISIT_ITEM } from "@/content/privacy";
import { PrivacyView, spanishDate } from "./PrivacyView";

const FLAGS = ["NEXT_PUBLIC_SIGN_IN", "NEXT_PUBLIC_NOTICES", "NEXT_PUBLIC_STREAKS", "NEXT_PUBLIC_SPANISH"] as const;
type Combo = (readonly [(typeof FLAGS)[number], string])[];
// Each combination of the four settings, as a name and the settings.
const COMBOS: Combo[] = Array.from({ length: 16 }, (_, n) => FLAGS.map((flag, i) => [flag, n & (1 << i) ? "on" : ""] as const));
// The Spanish page exists only while Spanish is on.
const SPANISH_COMBOS = COMBOS.filter((combo) => combo[3][1] === "on");
const label = (combo: Combo) => combo.map(([flag, value]) => `${flag.replace("NEXT_PUBLIC_", "").toLowerCase()}=${value || "off"}`).join(" ");
const set = (combo: Combo) => combo.forEach(([flag, value]) => vi.stubEnv(flag, value));
const on = (combo: Combo, flag: (typeof FLAGS)[number]) => combo.find(([f]) => f === flag)?.[1] === "on";
// The shape of a page: each heading, paragraph, item, and table row, in order. The line that the English page
// binds is on the Spanish page only.
const shape = (container: HTMLElement) => [...container.querySelectorAll("h1, h2, h3, p:not(.binding), li, tr")].map((e) => e.tagName);
const sentences = (container: HTMLElement) => [...container.querySelectorAll("p, li")].map((e) => e.textContent ?? "").filter((t) => t.length > 12);

afterEach(() => vi.unstubAllEnvs());

describe("the English Privacy page", () => {
  for (const combo of COMBOS) {
    it(`is word for word as before with ${label(combo)}`, () => {
      set(combo);
      expect(render(<PrivacyView lang="en" />).container.textContent).toMatchSnapshot();
    });
  }
});

describe("the Spanish Privacy page", () => {
  for (const combo of SPANISH_COMBOS) {
    it(`has the shape of the English page, and none of its sentences, with ${label(combo)}`, () => {
      set(combo);
      const en = render(<PrivacyView lang="en" />).container;
      const es = render(<PrivacyView lang="es" />).container;
      expect(shape(es)).toEqual(shape(en));
      for (const sentence of sentences(en)) expect(es.textContent).not.toContain(sentence);
    });

    it(`states each fact of the lists in Spanish with ${label(combo)}`, () => {
      set(combo);
      const page = render(<PrivacyView lang="es" />).container.textContent ?? "";
      for (const vendor of VENDORS.filter((v) => v.name !== "PostHog")) expect(page).toContain(vendor.es.receives);
      for (const item of [...BROWSER_ITEMS, LANGUAGE_ITEM, VISIT_ITEM]) expect(page).toContain(`${item.es.name}, ${item.es.why}.`);
      const accounts = on(combo, "NEXT_PUBLIC_SIGN_IN");
      for (const item of ACCOUNT_ITEMS_ES) expect(page.includes(`${item}.`)).toBe(accounts);
      expect(page.includes(`${ACCOUNT_LANGUAGE_ITEM_ES}.`)).toBe(accounts);
      for (const item of NOTICE_ITEMS_ES) expect(page.includes(item)).toBe(accounts && on(combo, "NEXT_PUBLIC_NOTICES"));
      for (const item of STREAK_ITEMS_ES) expect(page.includes(item)).toBe(accounts && on(combo, "NEXT_PUBLIC_STREAKS"));
      expect(page.includes(ACCOUNT_VENDORS[0].es.purpose)).toBe(accounts);
    });
  }

  it("names in the row of Supabase the streak data only while the streak is on, and the language", () => {
    set(COMBOS[15]);
    const row = () => screen.getByRole("row", { name: /^Supabase/ }).textContent ?? "";
    const { unmount } = render(<PrivacyView lang="es" />);
    expect(row()).toContain(`tus notas, ${STREAK_SUPABASE_RECEIVES_ES} y el idioma que elegiste.`);
    unmount();
    vi.stubEnv("NEXT_PUBLIC_STREAKS", "");
    render(<PrivacyView lang="es" />);
    expect(row()).toContain("los párrafos que guardaste, tus notas y el idioma que elegiste.");
    expect(row()).not.toContain(STREAK_SUPABASE_RECEIVES_ES);
  });

  it("is in Spanish, with its date in Spanish, and says that the English page binds", () => {
    set(COMBOS[15]);
    render(<PrivacyView lang="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Privacidad");
    expect(screen.getByText(/^Última actualización: \d+ de [a-z]+ de 2026$/)).toBeInTheDocument();
    const english = screen.getByRole("link", { name: "versión en inglés" });
    expect(english).toHaveAttribute("href", "/privacy");
    expect(english).toHaveAttribute("hreflang", "en");
    expect(english.closest("p")).toHaveTextContent("La traducción al español se hizo con IA. Si difiere de la versión en inglés, prevalece la versión en inglés.");
  });

  // The judge of the back-check (2026-10-25): "relación" read as "has nothing to do with you", "cuenta" means the
  // account on this page, and two lines named no thing to turn off or the wrong thing that leaves.
  it("says that a record is not linked to the reader, and uses each word in one sense", () => {
    set(COMBOS[15]);
    const page = render(<PrivacyView lang="es" />).container.textContent ?? "";
    expect(page).not.toMatch(/relación con/);
    expect(page).toContain("Registra lo que buscan los lectores, sin vínculo con el lector.");
    expect(page).toContain("El registro no está vinculado a ti.");
    expect(page).toContain("el número de días seguidos con una sección terminada");
    expect(page).toContain("conserva su conteo");
    expect(page).not.toContain("sale de ahí");
    expect(page).toContain("al terminar la página, se borran");
    expect(page).toContain("si quitas la descarga, salen del dispositivo");
  });

  it("makes no claim about the text", () => {
    set(COMBOS[15]);
    expect(render(<PrivacyView lang="es" />).container.textContent).not.toMatch(/revelación|revelad|verdad|divin|inspirad/i);
  });
});

describe("a date in Spanish", () => {
  it("is the day, the month, and the year", () => {
    expect(spanishDate("October 24, 2026")).toBe("24 de octubre de 2026");
    expect(spanishDate("January 5, 2027")).toBe("5 de enero de 2027");
  });
});

// Corrected 2026-10-25: saved paragraphs and notes are live, and a signed-in reader's events carry the account code.
describe("the facts of an account", () => {
  for (const combo of COMBOS.filter((c) => on(c, "NEXT_PUBLIC_SIGN_IN"))) {
    it(`are true of the live site with ${label(combo)}`, () => {
      set(combo);
      const en = render(<PrivacyView lang="en" />).container.textContent ?? "";
      expect(en).not.toContain("bookmarks and notes are planned");
      expect(en).not.toContain("Analytics events have no link to your account");
      expect(en).toContain("While you are signed in, each analytics event carries a code that stands for your account, as the section on page analytics says.");
      expect(en).toContain("Last updated: October 29, 2026");
    });
  }
  for (const combo of SPANISH_COMBOS.filter((c) => on(c, "NEXT_PUBLIC_SIGN_IN"))) {
    it(`are true of the live site in Spanish with ${label(combo)}`, () => {
      set(combo);
      const es = render(<PrivacyView lang="es" />).container.textContent ?? "";
      expect(es).not.toContain("previst");
      expect(es).not.toContain("no están vinculados a tu cuenta");
      expect(es).toContain("Mientras tienes la sesión iniciada, cada evento de analítica lleva un código que representa tu cuenta, como dice la sección de analítica de las páginas.");
      expect(es).toContain("Última actualización: 29 de octubre de 2026");
    });
  }
});
