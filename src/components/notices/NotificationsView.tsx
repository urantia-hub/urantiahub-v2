"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { accountKey, accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { NOTICE_KINDS, type NoticeKind, type Notices } from "@/account/notices";
import { readerCall } from "@/account/reader-call";
import { Icon } from "@/components/icons";
import { SignInLink } from "@/components/SignInLink";
import { DEVICE_EVENT, registerDevice } from "@/notices/device-end";
import { currentEndpoint, type DeviceState, deviceState, sha256Hex, unblockSteps } from "@/notices/push";


const NOTICES: Record<NoticeKind, { title: string; about: string }> = {
  daily: { title: "A passage each day", about: "One short passage of the Papers, with a link to its paper." },
  reminder: { title: "A reminder of your place", about: "One message when you did not read for a week, with a link to where you stopped. Never more than one for each pause." },
  releases: { title: "New releases", about: "A short note when UrantiaHub gets something new. A few times in a year." },
};
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
export const hourLabel = (hour: number) => `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
const zoneLabel = (zone: string) => zone.replace(/_/g, " ");
const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
function zones(current: string): string[] {
  const known = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return known.includes(current) ? known : [current, ...known];
}

type Data = { for: string | null; status: "loading" | "ready" | "failed"; notices: Notices | null };
const NOTHING: Data = { for: null, status: "loading", notices: null };
type Line = { kind: "saved" | "problem"; text: string } | null;
type Channel = "email" | "push";

// The notices of the signed-in reader: each one by email, as a push, both, or not at all.
// A push goes to each device of the reader where the browser allows notices.
export function NotificationsView() {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const key = account.status === "in" ? (account.user?.key ?? null) : null;
  const [data, setData] = useState<Data>(NOTHING);
  const [attempt, setAttempt] = useState(0);
  const [device, setDevice] = useState<DeviceState>("none");
  // This device is one of the devices of the account.
  const [here, setHere] = useState(false);
  const [line, setLine] = useState<Line>(null);
  const [busy, setBusy] = useState(false);
  if (data.for !== key) setData({ ...NOTHING, for: key });

  useEffect(() => {
    if (!key) return;
    let current = true;
    void (async () => {
      const [body, endpoint] = await Promise.all([readerCall("/api/me/notices"), currentEndpoint()]);
      const hash = endpoint ? await sha256Hex(endpoint) : null;
      if (!current) return;
      const notices = body as Notices | null;
      const ok = notices && Array.isArray(notices.devices) && notices.settings;
      setDevice(deviceState());
      setHere(Boolean(ok && hash && notices.devices.some((d) => d.endpointHash === hash)));
      setData(ok ? { for: key, status: "ready", notices } : { for: key, status: "failed", notices: null });
    })();
    return () => {
      current = false;
    };
  }, [key, attempt]);

  // The devices can change with no press on this page: a device joins after a sign-in, and the site
  // as an app and the browser are one device. So the page reads again when it shows, and when a device joined.
  useEffect(() => {
    const again = () => {
      if (document.visibilityState === "visible") setAttempt((n) => n + 1);
    };
    document.addEventListener("visibilitychange", again);
    window.addEventListener(DEVICE_EVENT, again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      window.removeEventListener(DEVICE_EVENT, again);
    };
  }, []);

  const signedOut = account.status !== "in";
  const notices = data.notices;
  const zone = notices?.settings.zone ?? deviceZone();
  const change = (next: (was: Notices) => Notices) => setData((was) => (was.notices ? { ...was, notices: next(was.notices) } : was));

  // Each change goes to the account at once. When the account did not take it, the page goes back.
  async function save(path: string, method: string, body: unknown, apply: (was: Notices) => Notices, problem: string): Promise<boolean> {
    const before = data.notices;
    if (!before) return false;
    setLine(null);
    change(apply);
    const answer = (await readerCall(path, { method, body: JSON.stringify(body) })) as { saved?: unknown; removed?: unknown } | null;
    if (answer?.saved === true || answer?.removed === true) {
      setLine({ kind: "saved", text: "Saved." });
      return true;
    }
    change(() => before);
    setLine({ kind: "problem", text: problem });
    return false;
  }

  const settings = (patch: Partial<{ hour: number; zone: string }>, apply: (was: Notices) => Notices) =>
    // The first change also keeps the time zone of this device.
    save("/api/me/notices", "PUT", { zone, ...patch }, apply, "The change was not saved. Try again.");

  const choose = (channel: Channel, kind: NoticeKind, on: boolean) =>
    save("/api/me/notices", "PUT", { zone, [channel]: { [kind]: on } }, (was) => ({ ...was, settings: { ...was.settings, zone, [channel]: { ...was.settings[channel], [kind]: on } } }), "The change was not saved. Try again.");

  async function push(kind: NoticeKind) {
    const mine = accountKey();
    if (!notices || busy || !mine) return;
    const on = !notices.settings.push[kind];
    // A push needs a device. This one joins the account at the first push that the reader turns on.
    if (on && !here && (device === "ask" || device === "allowed")) {
      setBusy(true);
      setLine(null);
      const joined = await registerDevice(mine);
      setDevice(deviceState());
      setBusy(false);
      if (accountKey() !== mine) return;
      if (!joined) {
        // A reader who blocked the question sees the steps under "Push on this device".
        if (deviceState() !== "blocked") setLine({ kind: "problem", text: "This device did not turn on. Try again." });
        return;
      }
      setHere(true);
    }
    await choose("push", kind, on);
  }

  async function allOff() {
    if (!notices) return;
    const none = { daily: false, reminder: false, releases: false };
    const off = await save("/api/me/notices", "PUT", { zone, email: none, push: none }, (was) => ({ ...was, settings: { ...was.settings, email: none, push: none } }), "The notices are still on. Try again.");
    if (!off) return;
    const gone = await save("/api/me/notices/device", "DELETE", { all: true }, (was) => ({ ...was, devices: [] }), "The devices are still on. Try again.");
    if (gone) setHere(false);
  }

  // A push can be turned on here when this device can get one, or when another device of the reader does.
  const canPush = here || device === "ask" || device === "allowed" || (notices?.devices.length ?? 0) > 0;
  const others = (notices?.devices.length ?? 0) - (here ? 1 : 0);
  return (
    <div className="saved-page notices-page">
      <p className="saved-back">
        <Link href="/papers">
          <Icon name="paperBefore" />
          Papers
        </Link>
      </p>
      <h1>Notifications</h1>
      {signedOut && (
        <div className="saved-empty">
          <b>A passage each day, and more</b>
          Sign in to choose what UrantiaHub sends you.
          {account.status === "out" && <SignInLink className="saved-button" />}
        </div>
      )}
      {!signedOut && data.status === "loading" && <p className="progress-wait" role="status" aria-label="Loading your notifications" />}
      {!signedOut && data.status === "failed" && (
        <p className="saved-empty" role="alert">
          Your notifications did not load.{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </p>
      )}
      {!signedOut && notices && (
        <>
          <p className="notices-lead">Each one is off until you choose a way to get it. You can choose both.</p>
          {/* The line has its room from the start, so nothing moves when it shows. */}
          <p className="notices-line" role="status" data-kind={line?.kind}>
            {line?.text}
          </p>

          {NOTICE_KINDS.map((kind) => (
            <div className="notice-row" key={kind} role="group" aria-label={NOTICES[kind].title}>
              <span>
                <b>{NOTICES[kind].title}</b>
                <small>{NOTICES[kind].about}</small>
              </span>
              <div className="notice-chips">
                <button type="button" className="notice-chip" aria-pressed={notices.settings.email[kind]} onClick={() => void choose("email", kind, !notices.settings.email[kind])}>
                  <Icon name="check" />
                  Email
                </button>
                <button type="button" className="notice-chip" aria-pressed={notices.settings.push[kind]} aria-busy={busy || undefined} disabled={busy || (!canPush && !notices.settings.push[kind])} onClick={() => void push(kind)}>
                  <Icon name="check" />
                  Push
                </button>
              </div>
            </div>
          ))}

          <h2>When</h2>
          <label className="notice-set">
            <span>The daily passage comes at</span>
            <select value={notices.settings.hour} onChange={(event) => { const hour = Number(event.target.value); void settings({ hour }, (was) => ({ ...was, settings: { ...was.settings, zone, hour } })); }}>
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
          </label>
          <label className="notice-set">
            <span>
              Your time zone
              <small>From this device. Change it here if you move.</small>
            </span>
            <select value={zone} onChange={(event) => { const next = event.target.value; void settings({ zone: next }, (was) => ({ ...was, settings: { ...was.settings, zone: next } })); }}>
              {zones(zone).map((name) => (
                <option key={name} value={name}>
                  {zoneLabel(name)}
                </option>
              ))}
            </select>
          </label>

          <h2>Push</h2>
          <DeviceLine state={device} here={here} others={others} />

          <p className="notices-foot">
            {account.user?.email ? `Email goes to ${account.user.email}. ` : ""}Your sign-in code always comes by email. These settings do not change that.{" "}
            <button type="button" onClick={() => void allOff()}>
              Turn all off
            </button>
          </p>
        </>
      )}
    </div>
  );
}

function DeviceLine({ state, here, others }: { state: DeviceState; here: boolean; others: number }) {
  const elsewhere = others > 0 ? ` A push also goes to ${others === 1 ? "one other device" : `${others} other devices`} where you turned it on.` : "";
  if (here) return <p className="notice-device">A push comes to this device, and to each other device where you are signed in and allowed notifications.</p>;
  if (state === "allowed" || state === "ask") return <p className="notice-device">A push comes to each device where you are signed in and allowed notifications. Turn one on, and this device asks you.{elsewhere}</p>;
  if (state === "ios")
    return (
      <div className="notice-device">
        <p>An iPhone or iPad shows a push of a website only after the site is on the home screen. Apple gives a website no button for that, so these are the steps:{elsewhere}</p>
        <ol>
          <li>Press <b>Share</b> in Safari.</li>
          <li>Press <b>Add to Home Screen</b>.</li>
          <li>Open UrantiaHub from the home screen, and come back to this page.</li>
        </ol>
      </div>
    );
  if (state === "blocked")
    return (
      <div className="notice-device">
        <p>Notifications are blocked for UrantiaHub in this browser. A website cannot remove a block, so these are the steps:{elsewhere}</p>
        <ol>
          {unblockSteps(navigator.userAgent).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>Then load this page again.</p>
      </div>
    );
  return <p className="notice-device">This browser cannot show a push of UrantiaHub. You can choose Email.{elsewhere}</p>;
}
