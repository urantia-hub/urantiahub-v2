import { handleLibraryAt } from "@/library/at";

export const GET = (request: Request, { params }: { params: Promise<{ work: string; ref: string }> }) => params.then((p) => handleLibraryAt({ ...p, search: new URL(request.url).search }));
