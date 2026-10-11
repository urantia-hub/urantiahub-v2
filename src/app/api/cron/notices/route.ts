import { connection, type NextRequest } from "next/server";
import { RELEASES } from "@/content/releases";
import { runNotices, runSamples } from "@/notices/send/job";
import { isCron, liveDeps } from "@/notices/send/live";

export const maxDuration = 60;
// The longest of the daily passages: 1,409 characters.
const LONGEST_PASSAGE = "11:1.3";

// One run of the notices. Vercel's timer calls it each 15 minutes (vercel.json). It answers 404 to
// each other caller, and it sends nothing until NOTICES_SEND is "on".
export async function GET(request: NextRequest) {
  await connection();
  if (!isCron(request.headers.get("authorization"))) return Response.json({ detail: "Not found." }, { status: 404 });
  // A sample: one of each email, to the one address of the setting, and to no reader.
  if (request.nextUrl.searchParams.get("sample") === "1") {
    const to = process.env.NOTICES_SAMPLE_TO ?? "";
    // The links of a sample name no reader, so "Turn this email off" in a sample changes nothing.
    const userId = "00000000-0000-4000-8000-000000000000";
    if (!/^[^@\s]+@[^@\s]+$/.test(to)) return Response.json({ sample: false, reason: "not set" }, { status: 400 });
    try {
      return Response.json({ sample: true, ...(await runSamples(liveDeps(), to, userId, LONGEST_PASSAGE, RELEASES[0])) });
    } catch (error) {
      console.error(`notices: the sample failed (${error instanceof Error ? error.name : "unknown"})`);
      return Response.json({ sample: false, reason: "failed" }, { status: 500 });
    }
  }
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
