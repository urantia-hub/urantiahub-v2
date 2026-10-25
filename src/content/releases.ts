// What changed in UrantiaHub, the newest first. Add an entry in the same change that ships a thing a
// reader can see. Each line must be true of the live site on that date.

import type { ReleasePictures } from "@/notices/send/mail";

// `notify`: readers who chose "New releases" get one notice of this entry. Mark a few in a year.
// `mail`: the email of the notice with pictures; its files stay in `public/email/` after the send.
// `es`: the Spanish words of the entry, for the Spanish page and for a Spanish reader's notice.
export type Release = { date: string; title: string; changes: string[]; notify?: true; mail?: ReleasePictures; es?: { title: string; changes: string[] } };
// An entry of this site's list: each one has its Spanish, so the Spanish page never shows an English entry.
export type Entry = Release & { es: { title: string; changes: string[] } };

export const RELEASES: Entry[] = [
  {
    date: "2026-10-17",
    title: "A streak, an assistant, and more", es: { title: "Una racha, un asistente y más", changes: ["Una racha: una sección al día, unos cinco minutos, con marcas por documentos, por partes y por las herramientas de UrantiaHub. Está desactivada hasta que la actives desde tu página.", "Preguntar a un asistente: toca un párrafo, luego Más, y tu pregunta se abre en Claude, ChatGPT, Gemini o Grok.", "La voz sigue sonando con la pantalla apagada, hasta el final del documento.", "Leer sin conexión: guarda los 197 documentos en tu dispositivo.", "Comparte una sola frase: el enlace muestra las palabras exactas.", "Tu página: tu progreso, lo que guardaste y tus avisos en un solo lugar.", "En otras partes de los Documentos: los paralelos de un párrafo en otros documentos van primero.", "En Android, el teclado ya no tapa el campo de una nota."] }, 
    notify: true,
    changes: [
      "A streak: one section a day, about five minutes, with marks for papers, parts, and the tools of the Hub. It is off until you turn it on from your page.",
      "Ask an assistant: press a paragraph, then More, and your question opens in Claude, ChatGPT, Gemini, or Grok.",
      "The voice keeps playing with the screen off, to the end of the paper.",
      "Read offline: keep all 197 papers on your device.",
      "Share one sentence: the link shows the exact words.",
      "Your page: your progress, what you saved, and your notifications in one place.",
      "Elsewhere in the Papers: the parallels of a paragraph in other papers come first.",
      "On Android, the keyboard no longer covers the field of a note.",
    ],
    mail: {
      lead: "A streak to read a little each day, an assistant for any paragraph, and all 197 papers on your phone.",
      features: [
        { title: "A streak", line: "Read or listen to one section a day, about five minutes. Collect marks for papers, parts, and the tools of the Hub. Turn it on from your page.", image: "/email/release-2026-10-17/streak.png", alt: "The streak and the marks on the reader's page" },
        { title: "Ask an assistant", line: "Press a paragraph, then More. Your question opens in Claude, ChatGPT, Gemini, or Grok, ready to send.", image: "/email/release-2026-10-17/ask.png", alt: "The questions for an assistant about a paragraph" },
        { title: "Listen with the screen off", line: "The voice keeps playing when your phone is locked, to the end of the paper.", image: "/email/release-2026-10-17/listen.png", alt: "A paper with the voice playing" },
        { title: "Read offline", line: "One switch in the menu keeps all 197 papers on your device. Read with no connection.", image: "/email/release-2026-10-17/offline.png", alt: "A paper open with no connection" },
      ],
      also: [
        { title: "Share one sentence.", line: "The link shows the exact words." },
        { title: "Your page.", line: "Your progress, what you saved, and your notifications in one place." },
        { title: "Elsewhere in the Papers.", line: "The parallels of a paragraph in other papers come first." },
      ],
      video: { url: "https://www.youtube.com/watch?v=_y1Cme5eqeA", image: "/email/release-2026-10-17/video.png", line: "Watch the video · under one minute" },
    },
  },
  {
    date: "2026-10-11",
    title: "Notifications", es: { title: "Avisos", changes: ["Un pasaje cada día, por correo, en un dispositivo o en ambos, a la hora que elijas en tu zona horaria.", "Un recordatorio de tu lugar después de una semana sin leer.", "Cada uno está desactivado hasta que lo actives: el botón de la persona, luego Avisos.", "Los ajustes y la cuenta están en el encabezado de cada página."] }, 
    changes: [
      "A passage each day, by email, on a device, or both, at the hour that you choose in your time zone.",
      "One reminder of your place after a week with no reading.",
      "Each one is off until you turn it on: the person button, then Notifications.",
      "The settings and the account are in the header of each page.",
    ],
  },
  {
    date: "2026-10-10",
    title: "The new UrantiaHub", es: { title: "El nuevo UrantiaHub", changes: ["Un nuevo lector: una página tranquila para cada documento, con un tema claro y uno oscuro, y varios tamaños de texto.", "Una nueva voz para cada párrafo, y la página la sigue.", "Búsqueda por las palabras exactas y por el sentido.", "Un glosario: los términos de cada párrafo.", "Paralelos: pasajes de los Documentos y de otras nueve obras, cercanos en sentido.", "Guarda un párrafo, escribe notas y conserva tu lugar en cada dispositivo.", "Crea una imagen de un párrafo para compartirla.", "Una página de tu progreso, una página de recursos y esta página.", "No están en esta versión: el chat de IA, la página Explorar y los correos diarios."] }, 
    changes: [
      "A new reader: one quiet page for each paper, with a light and a dark theme and a choice of text sizes.",
      "A new voice for each paragraph, and the page follows it.",
      "Search by the exact words and by the meaning.",
      "A glossary: the terms of each paragraph.",
      "Parallels: passages of the Papers and of nine other works that are near in meaning.",
      "Save a paragraph, write notes, and keep your place on each device.",
      "Make an image of a paragraph to share.",
      "A page of your progress, a page of resources, and this page.",
      "Not in this release: the AI chat, the Explore page, and the daily emails.",
    ],
  },
  {
    date: "2026-10-02",
    title: "Search, security, and speed", es: { title: "Búsqueda, seguridad y velocidad", changes: ["El sitio se puede instalar en un teléfono.", "Mejores páginas para los buscadores.", "El tema oscuro se mantiene entre visitas."] }, 
    changes: ["The site can be installed on a phone.", "Better pages for search engines.", "The dark theme stays between visits."],
  },
  { date: "2025-05-16", title: "Community and resources", es: { title: "Comunidad y recursos", changes: ["Una página de recursos de la comunidad."] },  changes: ["A page of resources of the community."] },
  {
    date: "2025-01-25",
    title: "Notifications and listening", es: { title: "Avisos y audio", changes: ["Ajustes de correo: novedades, un recordatorio para continuar y una cita diaria.", "Un enlace para escuchar en Spotify.", "Un botón para copiar el texto de un párrafo."] }, 
    changes: ["Email settings: releases, a reminder to continue, and a daily quote.", "A link to listen on Spotify.", "A button to copy the text of a paragraph."],
  },
  {
    date: "2025-01-18",
    title: "Launch", es: { title: "Lanzamiento", changes: ["Un lector con audio.", "Progreso, notas y marcadores.", "Un tema oscuro.", "Búsqueda con consejos y búsquedas recientes."] }, 
    changes: ["A reader with audio.", "Progress, notes, and bookmarks.", "A dark theme.", "Search with tips and recent searches."],
  },
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// "2026-10-10" as "October 10, 2026", or "10 de octubre de 2026". No clock and no time zone has a part in it.
export function releaseDate(date: string, lang: "en" | "es" = "en"): string {
  const [year, month, day] = date.split("-").map(Number);
  return lang === "es" ? `${day} de ${MESES[month - 1]} de ${year}` : `${MONTHS[month - 1]} ${day}, ${year}`;
}

const NOTIFY_DAYS = 4;

// The marked release that readers hear of now: from its date (UTC) and for three days after, so a
// reader in each time zone gets it in the day. Null: none.
export function releaseToNotify(now: Date, list: readonly Release[] = RELEASES): Release | null {
  const marked = list.find((release) => release.notify);
  if (!marked) return null;
  const start = Date.parse(`${marked.date}T00:00:00Z`);
  const age = now.getTime() - start;
  return Number.isFinite(start) && age >= 0 && age < NOTIFY_DAYS * 86_400_000 ? marked : null;
}
