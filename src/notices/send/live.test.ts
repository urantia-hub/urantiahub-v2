// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/content", () => ({ getPassage: vi.fn() }));

import { isCron, isPushAddress, liveDeps, offLinks } from "./live";
import { readOffToken } from "./token";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the address of a device", () => {
  it("is called only when it is of a push service, in its plain form", () => {
    expect(isPushAddress("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushAddress("https://web.push.apple.com/QGk")).toBe(true);
    for (const bad of ["https://example.com/x", "http://fcm.googleapis.com/x", "https://fcm.googleapis.com.evil.example/x", "https://fcm.googleapis.com\\@evil.example/x", "https://user@fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x", "https://169.254.169.254/latest", "x"]) {
      expect(isPushAddress(bad)).toBe(false);
    }
  });
});

describe("the secret of the timer", () => {
  it("starts the job only with the right secret", () => {
    vi.stubEnv("CRON_SECRET", "0123456789abcdef0123456789abcdef");
    expect(isCron("Bearer 0123456789abcdef0123456789abcdef")).toBe(true);
    expect(isCron("Bearer 0123456789abcdef0123456789abcdeX")).toBe(false);
    expect(isCron("0123456789abcdef0123456789abcdef")).toBe(false);
    expect(isCron(null)).toBe(false);
  });

  it("starts nothing while no secret is set, or a short one", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isCron("Bearer ")).toBe(false);
    vi.stubEnv("CRON_SECRET", "short");
    expect(isCron("Bearer short")).toBe(false);
  });
});

describe("the links of an email", () => {
  it("carry a proof for that reader and that notice", () => {
    const links = offLinks("secret", "00000000-0000-4000-8000-0000000000a1", "daily");
    const token = new URL(links.page).searchParams.get("off");
    expect(readOffToken("secret", token)).toEqual({ userId: "00000000-0000-4000-8000-0000000000a1", kind: "daily" });
    expect(new URL(links.post).pathname).toBe("/api/notices/off");
    expect(new URL(links.post).searchParams.get("token")).toBe(token);
  });
});

describe("the real senders", () => {
  it("send no email and no push while a key is missing, and say so", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_VAPID_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const deps = liveDeps();
    expect(await deps.sendMails([{ to: "a@example.com", subject: "s", html: "h", text: "t", offUrl: "u", offPost: "p" }])).toEqual([false]);
    expect(await deps.sendPush({ endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: "p", auth: "a", kinds: ["daily"] }, { for: "k", title: "t", body: "b", path: "/" })).toBe("failed");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("send each email with the one-press header, the sender, and the reply address", async () => {
    vi.stubEnv("RESEND_API_KEY", "key");
    const fetch = vi.fn(async () => Response.json({ data: [{ id: "1" }] }));
    vi.stubGlobal("fetch", fetch);
    expect(await liveDeps().sendMails([{ to: "a@example.com", subject: "s", html: "h", text: "t", offUrl: "u", offPost: "https://www.urantiahub.com/api/notices/off?token=T" }])).toEqual([true]);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails/batch");
    expect(JSON.parse(String(init.body))).toEqual([
      { from: "UrantiaHub <notifications@mail.urantiahub.com>", to: ["a@example.com"], reply_to: "hi@urantiahub.com", subject: "s", html: "h", text: "t", headers: { "List-Unsubscribe": "<https://www.urantiahub.com/api/notices/off?token=T>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } },
    ]);
  });

  it("report each email of a batch as not sent when the service refuses it", async () => {
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "no" }, { status: 403 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mail = { to: "a@example.com", subject: "s", html: "h", text: "t", offUrl: "u", offPost: "p" };
    expect(await liveDeps().sendMails([mail, mail])).toEqual([false, false]);
  });

  it("never call an address that is not of a push service", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_KEY", "BKey");
    vi.stubEnv("VAPID_PRIVATE_JWK", JSON.stringify({ d: "x" }));
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await liveDeps().sendPush({ endpoint: "https://169.254.169.254/latest", p256dh: "p", auth: "a", kinds: ["daily"] }, { for: "k", title: "t", body: "b", path: "/" })).toBe("failed");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("send a push that is encrypted for the device and signed with our key, to the checked address only", async () => {
    const { generateVAPIDKeys } = (await import("web-push")).default;
    const { createECDH, randomBytes } = await import("node:crypto");
    const ours = generateVAPIDKeys();
    const browser = createECDH("prime256v1");
    browser.generateKeys();
    vi.stubEnv("NEXT_PUBLIC_VAPID_KEY", ours.publicKey);
    vi.stubEnv("VAPID_PRIVATE_JWK", JSON.stringify({ d: ours.privateKey }));
    const fetch = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const device = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: browser.getPublicKey("base64url"), auth: randomBytes(16).toString("base64url"), kinds: ["daily"] };
    const push = { for: "reader-key", title: "A passage for today", body: "The text of the passage.", path: "/papers/foreword#0:1.3" };
    expect(await liveDeps().sendPush(device, push)).toBe("ok");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe(device.endpoint);
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("error");
    expect(init.headers["Content-Encoding"]).toBe("aes128gcm");
    expect(init.headers.Authorization).toMatch(/^vapid t=.+, k=/);
    expect(Number(init.headers.TTL)).toBe(43_200);
    // The text of the notice is not in what goes to the push service.
    expect(Buffer.from(init.body as Uint8Array).toString("latin1")).not.toContain("The text of the passage.");
  });

  it.each([
    [404, "gone"],
    [410, "gone"],
    [429, "failed"],
    [500, "failed"],
  ])("read the answer %i of a push service as %s", async (status, result) => {
    const { generateVAPIDKeys } = (await import("web-push")).default;
    const { createECDH, randomBytes } = await import("node:crypto");
    const ours = generateVAPIDKeys();
    const browser = createECDH("prime256v1");
    browser.generateKeys();
    vi.stubEnv("NEXT_PUBLIC_VAPID_KEY", ours.publicKey);
    vi.stubEnv("VAPID_PRIVATE_JWK", JSON.stringify({ d: ours.privateKey }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status })));
    const device = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: browser.getPublicKey("base64url"), auth: randomBytes(16).toString("base64url"), kinds: ["daily"] };
    expect(await liveDeps().sendPush(device, { for: "k", title: "t", body: "b", path: "/" })).toBe(result);
  });
});
