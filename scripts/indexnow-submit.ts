// Sends every sitemap URL to IndexNow. Does nothing unless SITE_INDEXABLE is on.
import { PAPERS, paperPath } from "../src/content/paper-index";
import { fetchLibrary, fetchWorkPages } from "../src/content/library";
import { spanishOn } from "../src/i18n/lang";
import { fixedPages } from "../src/i18n/paths";
import { LIBRARY_LINKS } from "../src/library/flags";
import { libraryLoad, libraryPaths } from "../src/library/sitemap";
import { submitToIndexNow } from "../src/seo/indexnow";
import { absoluteUrl } from "../src/site";

// World texts as the sitemap lists them. The keys are the same in each language, so one load serves both. A failed load sends the rest.
const api = process.env.URANTIA_API_BASE_URL || "https://api.urantia.dev";
const load = libraryLoad(() => fetchLibrary(api), (slug) => fetchWorkPages(api, slug));
let loaded: ReturnType<typeof load> | undefined;
const library = () => (loaded ??= load());
const texts = await libraryPaths(LIBRARY_LINKS, library);
const spanish = spanishOn() ? [...fixedPages("es"), ...PAPERS.map((paper) => paperPath(paper.id, "es")), ...(await libraryPaths(LIBRARY_LINKS, library, "es"))] : [];
const urls = [...fixedPages("en"), ...PAPERS.map((paper) => paperPath(paper.id)), ...texts, ...spanish].map(absoluteUrl);
const result = await submitToIndexNow(urls);
console.log(`IndexNow: ${result} (${urls.length} URLs)`);
