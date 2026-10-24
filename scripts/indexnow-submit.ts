// Sends every sitemap URL to IndexNow. Does nothing unless SITE_INDEXABLE is on.
import { PAPERS, paperPath } from "../src/content/paper-index";
import { spanishOn } from "../src/i18n/lang";
import { submitToIndexNow } from "../src/seo/indexnow";
import { absoluteUrl } from "../src/site";

const spanish = spanishOn() ? ["/es", ...PAPERS.map((paper) => paperPath(paper.id, "es"))] : [];
const urls = ["/", "/papers", "/about", "/privacy", ...PAPERS.map((paper) => paperPath(paper.id)), ...spanish].map(absoluteUrl);
const result = await submitToIndexNow(urls);
console.log(`IndexNow: ${result} (${urls.length} URLs)`);
