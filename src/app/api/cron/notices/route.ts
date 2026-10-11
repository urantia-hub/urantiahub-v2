import { connection, type NextRequest } from "next/server";
import { runNotices } from "@/notices/send/job";
import { isCron, liveDeps } from "@/notices/send/live";

export const maxDuration = 60;

// One run of the notices. Vercel's timer calls it each 15 minutes (vercel.json). It answers 404 to
// each other caller, and it sends nothing until NOTICES_SEND is "on".
export async function GET(request: NextRequest) {
  await connection();
  if (!isCron(request.headers.get("authorization"))) return Response.json({ detail: "Not found." }, { status: 404 });
  if (process.env.NOTICES_SEND !== "on") return Response.json({ sent: false, reason: "off" });
  try {
    // Counts only. No address and no name goes to the log or the answer.
    const report = await runNotices(liveDeps());
    console.log(`notices: ${JSON.stringify(report)}`);
    return Response.json({ sent: true, ...report });
  } catch (error) {
    // The kind of the error only. Its text can quote an answer, and an answer can hold an address.
    console.error(`notices: the run failed (${error instanceof Error ? error.name : "unknown"})`);
    return Response.json({ sent: false, reason: "failed" }, { status: 500 });
  }
}
