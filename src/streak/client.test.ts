import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const world = vi.hoisted(() => ({ key: "r1" as string | null, card: { on: false, asked: false } as Record<string, unknown>, calls: [] as { method: string; path: string; body: unknown }[] }));
vi.mock("@/account/client", () => ({ accountKey: () => world.key, markSignedOut: vi.fn() }));
vi.mock("@/analytics", () => ({ track: vi.fn() }));

const onCard = { on: true, state: { current: 1 }, goal: 1, hour: 21, zone: Intl.DateTimeFormat().resolvedOptions().timeZone, book: { done: 1, total: 1626 }, next: {}, marks: {}, fresh: [] };

function workPage(count: number): string[] {
  const refs = Array.from({ length: count }, (_, i) => `Dhp_${i + 1}`);
  document.body.innerHTML = `<article class="paper work" data-work="dhammapada">${refs.map((ref) => `<p class="para" id="${ref}">x</p>`).join("")}</article>`;
  return refs;
}

function paper(refs: string[]) {
  document.body.innerHTML = `<article class="paper">${refs.map((ref) => `<p class="para" id="${ref}">x</p>`).join("")}</article>`;
}

async function load(flag = "on") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_STREAKS", flag);
  return import("./client");
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  paper(["3:4.1", "3:4.2", "3:5.1"]);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      world.calls.push({ method, path, body });
      if (method === "GET") return Response.json(world.card);
      if (method === "PUT") {
        if (body.on) world.card = onCard;
        else if (body.asked) world.card = { on: false, asked: true };
        return Response.json({ saved: true });
      }
      if (path === "/api/me/marks") return Response.json({ saved: true, fresh: [body.id] });
      if (path === "/api/me/texts") return Response.json({ saved: true, card: { ...onCard, fresh: ["first-text"] } });
      return Response.json({ added: body.rows.length, card: world.card });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  Object.assign(world, { key: "r1", card: { on: false, asked: false }, calls: [] });
});

const settle = () => new Promise((done) => setTimeout(done, 0));
const posts = () => world.calls.filter((call) => call.method === "POST");

describe("the streak in the browser", () => {
  it("does nothing while the flag is off", async () => {
    const client = await load("off");
    client.noteParagraphs("read", ["3:4.1", "3:4.2"]);
    await client.loadStreak();
    expect(world.calls).toEqual([]);
    expect(window.localStorage.length).toBe(0);
  });

  it("asks after the first finished section, and sends nothing before the yes", async () => {
    const client = await load();
    client.noteParagraphs("read", ["3:4.1"]);
    await settle();
    expect(client.streakView().asking).toBe(false);
    client.noteParagraphs("read", ["3:4.2"]);
    await settle();
    await settle();
    expect(client.streakView().asking).toBe(true);
    expect(posts()).toEqual([]);
  });

  it("sends the section that waited after the yes", async () => {
    const client = await load();
    client.noteParagraphs("heard", ["3:4.1", "3:4.2"]);
    await settle();
    await settle();
    expect(await client.answerStreak(true, 2)).toBe(true);
    const put = world.calls.find((call) => call.method === "PUT");
    expect(put?.body).toMatchObject({ on: true, asked: true, goal: 2 });
    expect(posts()).toHaveLength(1);
    expect(posts()[0].body).toMatchObject({ rows: [{ paperId: "3", sectionId: "4", how: "heard" }] });
    expect(client.streakView()).toMatchObject({ asking: false, card: { on: true } });
  });

  it("drops the section after a no, and keeps no day log", async () => {
    const client = await load();
    client.noteParagraphs("read", ["3:4.1", "3:4.2"]);
    await settle();
    await settle();
    await client.answerStreak(false, 1);
    expect(world.calls.find((call) => call.method === "PUT")?.body).toEqual({ asked: true });
    window.localStorage.clear();
    client.noteParagraphs("read", ["3:5.1"]);
    await settle();
    expect(posts()).toEqual([]);
    expect(window.localStorage.length).toBe(0);
  });

  it("sends a finished section at once, with no question, while the streak is on", async () => {
    world.card = onCard;
    const client = await load();
    await client.loadStreak();
    client.noteParagraphs("read", ["3:5.1"]);
    await settle();
    expect(posts()).toHaveLength(1);
    expect(client.streakView().asking).toBe(false);
  });

  it("forgets the reader on a sign-out, and drops the queue of the reader before", async () => {
    world.card = onCard;
    const client = await load();
    await client.loadStreak();
    client.noteParagraphs("read", ["3:4.1"]);
    client.forgetStreak();
    expect(window.localStorage.getItem("hub:day-log")).toBeNull();
    world.key = "r2";
    client.noteParagraphs("read", ["3:4.2"]);
    await settle();
    expect(posts()).toEqual([]);
  });
});

describe("the marks in the browser", () => {
  it("queues the new marks of an answer, the lower tier first", async () => {
    world.card = { ...onCard, fresh: ["papers-1", "first-section"] };
    const client = await load();
    await client.loadStreak();
    client.noteParagraphs("read", ["3:4.1", "3:4.2"]);
    await settle();
    await settle();
    expect(client.streakView().moments).toEqual(["first-section", "papers-1"]);
    client.momentPlayed("first-section");
    expect(client.streakView().moments).toEqual(["papers-1"]);
  });

  it("earns a tool mark one time, only while the streak is on", async () => {
    const client = await load();
    await client.loadStreak();
    await client.earnToolMark("search");
    expect(posts()).toEqual([]);
    world.card = { ...onCard };
    const again = await load();
    await again.loadStreak();
    await again.earnToolMark("search");
    await again.earnToolMark("search");
    expect(posts().map((call) => call.body)).toEqual([{ id: "search" }]);
    expect(again.streakView().moments).toEqual(["search"]);
    expect(Object.keys((again.streakView().card as { marks: object }).marks)).toEqual(["search"]);
  });
});

describe("the pages of the world texts in the browser", () => {
  it("sends a finished page one time, while the streak is on, and plays its mark", async () => {
    world.card = onCard;
    const client = await load();
    await client.loadStreak();
    const refs = workPage(10);
    client.noteTextPassages("dhammapada", "2", refs.slice(0, 5));
    await settle();
    expect(posts()).toEqual([]);
    client.noteTextPassages("dhammapada", "2", refs.slice(5, 9));
    await settle();
    await settle();
    expect(posts().map((call) => [call.path, call.body])).toEqual([["/api/me/texts", { work: "dhammapada", page: "2" }]]);
    expect(client.streakView().moments).toEqual(["first-text"]);
    client.noteTextPassages("dhammapada", "2", refs.slice(9));
    await settle();
    expect(posts()).toHaveLength(1);
  });

  it("keeps nothing while the streak is off", async () => {
    const client = await load();
    await client.loadStreak();
    client.noteTextPassages("dhammapada", "2", workPage(2));
    await settle();
    expect(posts()).toEqual([]);
    expect(window.localStorage.getItem("hub:text-log")).toBeNull();
  });

  it("forgets the pages that were read on a sign-out", async () => {
    world.card = onCard;
    const client = await load();
    await client.loadStreak();
    client.noteTextPassages("dhammapada", "2", workPage(10).slice(0, 3));
    expect(window.localStorage.getItem("hub:text-log")).not.toBeNull();
    client.forgetStreak();
    expect(window.localStorage.getItem("hub:text-log")).toBeNull();
  });
});
