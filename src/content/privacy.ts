// The facts of the Privacy page, as lists. A new vendor or a new thing in the browser is one entry here.
// Each entry must be true of the code that is live. Change the date when the page changes.
// `es` and each `_ES` list: the same fact in Spanish, for /es/privacidad. Change both together.
export const PRIVACY_UPDATED = "October 29, 2026";
// The date of the page while a reader can sign in. See `accountsOn` in the page.
export const ACCOUNT_UPDATED = "October 12, 2026";
// The date of the page while a reader can turn on a notice. See `noticesOn` in the page.
export const NOTICES_UPDATED = "October 12, 2026";
// The date of the page while a reader can keep a streak. See `streaksOn` in the page.
export const STREAKS_UPDATED = "October 19, 2026";
export const PRIVACY_EMAIL = "privacy@urantiahub.com";
// The company that runs the site. Kelson gave this name on 2026-10-08.
export const PRIVACY_OPERATOR = "Adams Technologies LLC";

export type Vendor = { name: string; purpose: string; receives: string; policy: string; es: { purpose: string; receives: string } };

// Each company that handles data for the site: what it does for us, and what it receives.
export const VENDORS: readonly Vendor[] = [
  {
    name: "Vercel",
    purpose: "Hosts the site.",
    receives: "Each request to the site: your IP address, the page address, the time, and your browser type.",
    policy: "https://vercel.com/legal/privacy-policy",
    es: { purpose: "Aloja el sitio.", receives: "Cada solicitud al sitio: tu dirección IP, la dirección de la página, la hora y el tipo de tu navegador." },
  },
  {
    name: "PostHog",
    purpose: "Analytics: which pages and features readers use.",
    receives: "An event for a page or an action, with your IP address. No cookie and no identifier. Also the search records, which have no link to you.",
    policy: "https://posthog.com/privacy",
    es: { purpose: "Analítica: qué páginas y funciones usan los lectores.", receives: "Un evento por una página o una acción, con tu dirección IP. Sin cookie y sin identificador. También los registros de las búsquedas, que no están vinculados a ti." },
  },
  {
    name: "Cloudflare",
    purpose: "Serves the audio files, and runs the content service that holds the text.",
    receives: "Your IP address when your browser loads an audio file. The words of a search, from our server.",
    policy: "https://www.cloudflare.com/privacypolicy/",
    es: { purpose: "Sirve los archivos de audio y opera el servicio de contenido que guarda el texto.", receives: "Tu dirección IP cuando tu navegador carga un archivo de audio. Las palabras de una búsqueda, desde nuestro servidor." },
  },
  {
    name: "OpenAI",
    purpose: "Compares the meaning of a search with the text, for the related passages.",
    receives: "The words of a search, from the content service. Nothing about you.",
    policy: "https://openai.com/policies/privacy-policy/",
    es: { purpose: "Compara el significado de una búsqueda con el texto, para los pasajes relacionados.", receives: "Las palabras de una búsqueda, desde el servicio de contenido. Nada sobre ti." },
  },
];

export type BrowserItem = { name: string; why: string; es: { name: string; why: string } };

// What the site keeps in your browser. None of it leaves your device.
export const BROWSER_ITEMS: readonly BrowserItem[] = [
  { name: "Your theme", why: "so the page opens light or dark, as you chose", es: { name: "Tu tema", why: "para que la página se abra clara u oscura, como elegiste" } },
  { name: "Your text size", why: "so a paper opens at the size that you chose", es: { name: "El tamaño del texto", why: "para que un documento se abra en el tamaño que elegiste" } },
  { name: "The last place that you read", why: "so the contents page can offer to continue there", es: { name: "El último lugar que leíste", why: "para que la página de los documentos pueda ofrecerte continuar ahí" } },
  { name: "The paragraph where the voice stopped", why: "so the paper can offer to continue listening there", es: { name: "El párrafo donde se detuvo la voz", why: "para que el documento pueda ofrecerte seguir escuchando desde ahí" } },
  { name: "The last page that you read in each world text", why: "so the page of that work can offer to continue there", es: { name: "La última página que leíste de cada texto del mundo", why: "para que la página de esa obra pueda ofrecerte continuar ahí" } },
  { name: "The papers, if you turn on Read offline", why: "so you can read with no connection; turn it off, and they leave the device", es: { name: "Los documentos, si los descargas para leer sin conexión", why: "para que puedas leer sin conexión; si quitas la descarga, salen del dispositivo" } },
  { name: "The assistant that you chose, if you use Ask an assistant", why: "so the next question opens in the same one", es: { name: "El asistente que elegiste, si usas Preguntar a un asistente", why: "para que la siguiente pregunta se abra en el mismo" } },
  { name: "If you added the site to your home screen: that it opened in this session", why: "so it opens at your last place only when it starts; the mark goes when the app closes", es: { name: "Si agregaste el sitio a tu pantalla de inicio: que se abrió en esta sesión", why: "para que se abra en tu último lugar solo cuando inicia; la marca se va cuando la app se cierra" } },
  { name: "Your last five searches", why: "so you can run one again; the Clear control on the search page removes them", es: { name: "Tus cinco búsquedas más recientes", why: "para que puedas repetir una; el botón Borrar de la página de búsqueda las quita" } },
];

// With Spanish on (NEXT_PUBLIC_SPANISH): the language that the reader chose in the language sheet.
export const LANGUAGE_UPDATED = "October 24, 2026";
// The day of two corrections to the facts of an account: saved paragraphs and notes are live, and the
// analytics events of a signed-in reader carry the account code.
export const ACCOUNT_CORRECTED = "October 25, 2026";
export const LANGUAGE_ITEM: BrowserItem = { name: "The language that you chose to read in, and when you chose it", why: "so the site does not offer the other language again, and the newest choice wins on each of your devices", es: { name: "El idioma que elegiste para leer, y cuándo lo elegiste", why: "para que el sitio no vuelva a ofrecerte el otro idioma, y para que la elección más reciente valga en cada uno de tus dispositivos" } };
// With Spanish on: a mark in this tab only (`hub:visit`), gone when the tab closes.
export const VISIT_ITEM: BrowserItem = { name: "That this tab already opened a page of the site", why: "so only the first page of a visit opens in your language", es: { name: "Que esta pestaña ya abrió una página del sitio", why: "para que solo la primera página de una visita se abra en tu idioma" } };

// With Spanish on, the account also holds the language, so it follows the reader to each device.
export const ACCOUNT_LANGUAGE_ITEM = "The language that you chose to read in, and when you chose it";
export const ACCOUNT_LANGUAGE_ITEM_ES = "El idioma que elegiste para leer, y cuándo lo elegiste";

// What an account holds for the Hub. Each entry is one thing that `src/account` writes.
export const ACCOUNT_ITEMS: readonly string[] = [
  "Your email address, and your name if your account has one",
  "The last place that you read",
  "Which paragraphs you read, and when",
  "The paragraphs that you saved",
  "Your notes",
];
export const ACCOUNT_ITEMS_ES: readonly string[] = [
  "Tu correo electrónico, y tu nombre si tu cuenta tiene uno",
  "El último lugar que leíste",
  "Qué párrafos leíste, y cuándo",
  "Los párrafos que guardaste",
  "Tus notas",
];

// What PostHog receives while a reader can sign in. It takes the place of the PostHog entry above.
export const ACCOUNT_POSTHOG: Vendor = {
  name: "PostHog",
  purpose: "Analytics: which pages and features readers use.",
  receives: "An event for a page or an action, with your IP address. No cookie. While you are signed in, also a code that stands for your account: not your email address and not your name. Also the search records, which have no link to you.",
  policy: "https://posthog.com/privacy",
  es: { purpose: "Analítica: qué páginas y funciones usan los lectores.", receives: "Un evento por una página o una acción, con tu dirección IP. Sin cookie. Mientras tienes la sesión iniciada, también un código que representa tu cuenta: no tu correo electrónico ni tu nombre. También los registros de las búsquedas, que no están vinculados a ti." },
};

// The companies that handle the data of an account. They are in the table only while a reader can sign in.
export const ACCOUNT_VENDORS: readonly Vendor[] = [
  {
    name: "Supabase",
    purpose: "Holds the accounts, and what an account keeps.",
    receives: "Your email address, your name and picture if you sign in with Google, the last place that you read, which paragraphs you read, the paragraphs that you saved, and your notes.",
    policy: "https://supabase.com/privacy",
    es: { purpose: "Guarda las cuentas y lo que guarda cada cuenta.", receives: "Tu correo electrónico, tu nombre y tu foto si inicias sesión con Google, el último lugar que leíste, qué párrafos leíste, los párrafos que guardaste y tus notas." },
  },
  {
    name: "Resend",
    purpose: "Sends the email with the sign-in code.",
    receives: "Your email address and the code.",
    policy: "https://resend.com/legal/privacy-policy",
    es: { purpose: "Envía el correo con el código para iniciar sesión.", receives: "Tu correo electrónico y el código." },
  },
  {
    name: "Google",
    purpose: "Signs you in, only if you choose “Continue with Google”.",
    receives: "That you signed in to UrantiaHub. Google gives us your email address, your name, and your picture.",
    policy: "https://policies.google.com/privacy",
    es: { purpose: "Inicia tu sesión, solo si eliges iniciar sesión con Google.", receives: "Que iniciaste sesión en UrantiaHub. Google nos da tu correo electrónico, tu nombre y tu foto." },
  },
];

// What an account holds for the notices, while a reader can turn one on. Each entry is one thing
// that the notice routes of the API store.
export const NOTICE_ITEMS: readonly string[] = [
  "Which notices you turned on, and if each one goes by email, as a push, or both",
  "The hour of the daily passage, and your time zone",
  "For each device where you allowed notifications: its address at the push service of the browser, two keys that encrypt a push for that device, and a short name such as “Chrome on Android”",
  "A record of each notice that we sent you: which notice, for which day, and by email or to a device. We keep it for 90 days, so that no notice goes out two times",
];
export const NOTICE_ITEMS_ES: readonly string[] = [
  "Qué avisos activaste, y si cada uno llega por correo, como notificación o de las dos formas",
  "La hora del pasaje diario y tu zona horaria",
  "Para cada dispositivo donde permitiste las notificaciones: su dirección en el servicio de notificaciones del navegador, dos claves que cifran una notificación para ese dispositivo y un nombre corto como “Chrome on Android”",
  "Un registro de cada aviso que te enviamos: qué aviso, para qué día, y si fue por correo o a un dispositivo. Lo guardamos 90 días, para que ningún aviso salga dos veces",
];

// With the notices on, Resend also sends the emails that a reader chose.
export const NOTICE_RESEND: Vendor = {
  name: "Resend",
  purpose: "Sends the email with the sign-in code, and the notices that you chose to get by email.",
  receives: "Your email address, and the text of the email.",
  policy: "https://resend.com/legal/privacy-policy",
  es: { purpose: "Envía el correo con el código para iniciar sesión, y los avisos que elegiste recibir por correo.", receives: "Tu correo electrónico y el texto del correo." },
};

// What an account holds for the streak, while a reader can keep one. Each entry is one thing that
// `src/account/streak-data.ts` or the API stores.
export const STREAK_ITEMS: readonly string[] = [
  "If you keep a streak: each section that you finished, the day, and if you read it or listened to it",
  "Your streak settings: on or off, the sections a day, your time zone, the day that you started, and your longest streak",
  "If you keep a streak: the pages of the world texts that you finished, for the marks",
];
export const STREAK_ITEMS_ES: readonly string[] = [
  "Si llevas una racha: cada sección que terminaste, el día, y si la leíste o la escuchaste",
  "Tus ajustes de la racha: activada o no, las secciones por día, tu zona horaria, el día en que empezaste y tu racha más larga",
  "Si llevas una racha: las páginas de los textos del mundo que terminaste, para las marcas",
];

// What the browser keeps for the streak of a signed-in reader. The day log never goes to the account.
export const STREAK_BROWSER_ITEM: BrowserItem = {
  name: "The paragraphs that you read or heard today, while you are signed in",
  why: "so the site can tell when you finish a section for the streak; the next day replaces them, a sign-out removes them, and only a finished section goes to your account",
  es: { name: "Los párrafos que leíste o escuchaste hoy, mientras tienes la sesión iniciada", why: "para que el sitio sepa cuándo terminas una sección, para la racha; el día siguiente los reemplaza, cerrar la sesión los borra, y solo una sección terminada va a tu cuenta" },
};

// What the browser keeps of the pages of the world texts. Only a finished page goes to the account.
export const STREAK_TEXT_ITEM: BrowserItem = {
  name: "The passages that you read on a page of a world text, while you are signed in and keep a streak",
  why: "so the site can tell when you finish the page for the marks; a finished page leaves them, a sign-out removes them, and only the finished page goes to your account",
  es: { name: "Los pasajes que leíste en una página de un texto del mundo, mientras tienes la sesión iniciada y llevas una racha", why: "para que el sitio sepa cuándo terminas la página, para las marcas; al terminar la página, se borran, y cerrar la sesión también los borra, y solo la página terminada va a tu cuenta" },
};

// With the streak on, Supabase also holds the finished sections.
export const STREAK_SUPABASE_RECEIVES = "the sections that you finished each day, the pages of the world texts that you finished, your streak settings";
export const STREAK_SUPABASE_RECEIVES_ES = "las secciones que terminaste cada día, las páginas de los textos del mundo que terminaste, tus ajustes de la racha";
