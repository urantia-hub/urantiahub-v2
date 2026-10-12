// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { refreshMail } from "./refresh-mail";
import { handleRefreshSend, type MailCall } from "./refresh-send";

vi.mock("server-only", () => ({}));

const ORIGIN = "https://www.urantiahub.com";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const readers = ["ana@example.com", "ben@example.com"];
const keys = { pass: hash("the-pass"), list: hash(readers.join("\n")) };
const ask = (body: unknown) => new Request(`${ORIGIN}/api/notices/refresh-send`, { method: "POST", body: JSON.stringify(body) });
const answer = (): MailCall => vi.fn(async () => ({ status: 200, quota: { "x-resend-daily-quota": "3" } }));

describe("the one send of the refresh email", () => {
  it("answers 404 to a caller with a wrong pass, and calls no mail service", async () => {
    const call = answer();
    for (const body of [{ pass: "wrong", to: readers }, { to: readers }, null]) expect((await handleRefreshSend(ask(body), ORIGIN, call, keys)).status).toBe(404);
    expect(call).not.toHaveBeenCalled();
  });

  it("sends nothing when the addresses are not exactly the approved list", async () => {
    const call = answer();
    for (const to of [[...readers, "eve@example.com"], [readers[0]], [], "ana@example.com"]) expect((await handleRefreshSend(ask({ pass: "the-pass", to }), ORIGIN, call, keys)).status).toBe(409);
    expect(call).not.toHaveBeenCalled();
  });

  it("sends the refresh email to each reader of the list in one call, each reader alone in the To line", async () => {
    const call = answer();
    const response = await handleRefreshSend(ask({ pass: "the-pass", to: ["Ben@Example.com ", "ana@example.com"] }), ORIGIN, call, keys);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: 2, status: 200, quota: { "x-resend-daily-quota": "3" } });
    expect(call).toHaveBeenCalledTimes(1);
    const [method, path, mails] = vi.mocked(call).mock.calls[0];
    expect([method, path]).toEqual(["POST", "/emails/batch"]);
    const mail = refreshMail(ORIGIN);
    expect((mails as { to: string[]; subject: string; html: string }[]).map((one) => [one.to, one.subject, one.html])).toEqual([
      [["ana@example.com"], mail.subject, mail.html],
      [["ben@example.com"], mail.subject, mail.html],
    ]);
  });

  it("says that the mail service refused, with its status", async () => {
    const call: MailCall = vi.fn(async () => ({ status: 429, quota: {} }));
    const response = await handleRefreshSend(ask({ pass: "the-pass", to: readers }), ORIGIN, call, keys);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ sent: 0, status: 429, quota: {} });
  });

  it("in check mode it asks the mail service a question that sends no email", async () => {
    const call = answer();
    const response = await handleRefreshSend(ask({ pass: "the-pass", check: true }), ORIGIN, call, keys);
    expect(await response.json()).toEqual({ sent: 0, status: 200, quota: { "x-resend-daily-quota": "3" } });
    expect(vi.mocked(call).mock.calls).toEqual([["GET", "/domains"]]);
  });
});
