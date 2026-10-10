import { getParallels } from "@/content";
import { handleParallels } from "@/server/parallels";

// The passages that are near in meaning to one paragraph, for the Parallels sheet of the reader.
export async function GET(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return handleParallels(ref, getParallels);
}
