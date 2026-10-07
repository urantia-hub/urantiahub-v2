import { revalidateTag } from "next/cache";
import { submitToIndexNow } from "@/seo/indexnow";
import { handleRevalidate } from "@/server/revalidate";

export async function POST(request: Request) {
  return handleRevalidate(request, {
    secret: process.env.REVALIDATE_SECRET,
    revalidate: (tag) => revalidateTag(tag, "max"),
    notify: (urls) => submitToIndexNow(urls),
  });
}
