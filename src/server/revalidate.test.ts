import { describe, expect, it, vi } from "vitest";
import { handleRevalidate } from "./revalidate";

function call(body: unknown, auth: string | null = "Bearer s3cret", secret: string | undefined = "s3cret") {
  const revalidate = vi.fn();
  const notify = vi.fn().mockResolvedValue("sent");
  const request = new Request("https://next.urantiahub.com/api/revalidate", {
    method: "POST",
    headers: auth ? { authorization: auth, "content-type": "application/json" } : {},
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return handleRevalidate(request, { secret, revalidate, notify }).then((response) => ({ response, revalidate, notify }));
}

describe("handleRevalidate", () => {
  it("refreshes each tag and reports the affected URLs", async () => {
    const { response, revalidate, notify } = await call({ tags: ["paper:12", "passages"] });
    expect(response.status).toBe(200);
    expect(revalidate.mock.calls).toEqual([["paper:12"], ["passages"]]);
    expect(notify).toHaveBeenCalledWith([
      expect.stringMatching(/\/papers\/paper-12-the-universe-of-universes$/),
      expect.stringMatching(/\/$/),
    ]);
    expect(await response.json()).toEqual({ revalidated: ["paper:12", "passages"] });
  });

  it.each([
    ["no header", null],
    ["a wrong secret", "Bearer wrong"],
    ["a missing scheme", "s3cret"],
  ])("answers 401 for %s and changes nothing", async (_name, auth) => {
    const { response, revalidate } = await call({ tags: ["paper:1"] }, auth);
    expect(response.status).toBe(401);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("answers 401 when the server has no secret, even for an empty token", async () => {
    const { response, revalidate } = await call({ tags: ["paper:1"] }, "Bearer ", undefined);
    expect(response.status).toBe(401);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it.each([
    ["a tag that is not on the list", { tags: ["toc"] }],
    ["a paper number that does not exist", { tags: ["paper:197"] }],
    ["an empty list", { tags: [] }],
    ["a body with no tags", {}],
    ["text that is not JSON", "not json"],
  ])("answers 400 for %s and changes nothing", async (_name, body) => {
    const { response, revalidate } = await call(body);
    expect(response.status).toBe(400);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("still answers 200 when the IndexNow call fails", async () => {
    const revalidate = vi.fn();
    const notify = vi.fn().mockRejectedValue(new Error("indexnow down"));
    const request = new Request("https://next.urantiahub.com/api/revalidate", {
      method: "POST",
      headers: { authorization: "Bearer s3cret" },
      body: JSON.stringify({ tags: ["passages"] }),
    });
    const response = await handleRevalidate(request, { secret: "s3cret", revalidate, notify });
    expect(response.status).toBe(200);
    expect(revalidate).toHaveBeenCalledWith("passages");
  });
});
