// @vitest-environment node
import { AuthError } from "@urantia/auth/server";
import { describe, expect, it, vi } from "vitest";
import { callForReader, Refused } from "./call";
import type { Session } from "./session";

const session: Session = { accessToken: "old", refreshToken: "r1", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: "u1", email: null, name: null } };
const fresh: Session = { ...session, accessToken: "new", refreshToken: "r2" };
const soon = { ...session, expiresAt: "2000-01-01T00:00:00.000Z" };

describe("a call for the reader's data", () => {
  it("uses the token as it is", async () => {
    const run = vi.fn(async (token: string) => `data for ${token}`);
    const refresh = vi.fn();
    expect(await callForReader(session, { run, refresh })).toEqual({ ok: true, value: "data for old", session: "keep" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes first when the token is near its end, and gives the new session to save", async () => {
    const run = vi.fn(async (token: string) => token);
    const result = await callForReader(soon, { run, refresh: async () => fresh });
    expect(result).toEqual({ ok: true, value: "new", session: fresh });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("refreshes one time when the API refuses the token, then runs again", async () => {
    const run = vi.fn(async (token: string) => {
      if (token === "old") throw new Refused();
      return "ok";
    });
    expect(await callForReader(session, { run, refresh: async () => fresh })).toEqual({ ok: true, value: "ok", session: fresh });
  });

  it("ends the sign-in when the refresh is refused", async () => {
    const run = vi.fn(async () => {
      throw new Refused();
    });
    const refresh = async () => {
      throw new AuthError("refused", "no");
    };
    expect(await callForReader(session, { run, refresh })).toEqual({ ok: false, reason: "signed-out", session: "end" });
    expect(await callForReader(soon, { run, refresh })).toEqual({ ok: false, reason: "signed-out", session: "end" });
  });

  it("ends the sign-in when the new token is refused too", async () => {
    const run = async () => {
      throw new Refused();
    };
    expect(await callForReader(session, { run, refresh: async () => fresh })).toEqual({ ok: false, reason: "signed-out", session: "end" });
  });

  // An outage is not a refusal. The reader stays signed in.
  it("keeps the sign-in when the sign-in service is down", async () => {
    const down = async () => {
      throw new AuthError("unavailable", "down", 503);
    };
    const refused = async () => {
      throw new Refused();
    };
    expect(await callForReader(session, { run: refused, refresh: down })).toEqual({ ok: false, reason: "unavailable", session: "keep" });
    // Near its end, with the service down: try the token that is there. It can still be good.
    expect(await callForReader(soon, { run: async () => "still good", refresh: down })).toEqual({ ok: true, value: "still good", session: "keep" });
  });

  it("keeps the sign-in when the API itself fails", async () => {
    const run = async () => {
      throw new Error("500: boom");
    };
    expect(await callForReader(session, { run, refresh: async () => fresh })).toEqual({ ok: false, reason: "unavailable", session: "keep" });
  });

  it("keeps the new session when the API fails after a refresh", async () => {
    const run = async () => {
      throw new Error("502");
    };
    expect(await callForReader(soon, { run, refresh: async () => fresh })).toEqual({ ok: false, reason: "unavailable", session: fresh });
  });
});
