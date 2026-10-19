import { handleLibraryAt } from "@/library/at";

export const GET = (_request: Request, { params }: { params: Promise<{ work: string; ref: string }> }) => params.then(handleLibraryAt);
