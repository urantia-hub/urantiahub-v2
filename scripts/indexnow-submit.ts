// Sends every sitemap URL to IndexNow. Does nothing unless SITE_INDEXABLE is on.
import { PAPERS, paperPath } from "../src/content/paper-index";
import { submitToIndexNow } from "../src/seo/indexnow";
import { absoluteUrl } from "../src/site";

const urls = ["/", "/papers", "/about", "/privacy", ...PAPERS.map((paper) => paperPath(paper.id))].map(absoluteUrl);
const result = await submitToIndexNow(urls);
console.log(`IndexNow: ${result} (${urls.length} URLs)`);
