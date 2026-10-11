"use client";

import Link from "next/link";
import { type MouseEvent, useEffect, useState, useSyncExternalStore } from "react";
import { accountState, serverAccountState, signInHref, subscribeToAccount } from "@/account/client";
import { NOTICE_KINDS, type NoticeKind, type Notices } from "@/account/notices";
import { readerCall } from "@/account/reader-call";
import { Icon } from "@/components/icons";
import { currentEndpoint, type DeviceState, deviceState, sha256Hex, subscribeDevice, unblockSteps, unsubscribeDevice } from "@/notices/push";

const toSignIn = { href: "/api/auth/start", onClick: (event: MouseEvent<HTMLAnchorElement>) => void (event.currentTarget.href = signInHref()) };

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

// The notices of the signed-in reader: each one by email, on this device, both, or not at all.
export function NotificationsView() {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const key = account.status === "in" ? (account.user?.key ?? null) : null;
  const [data, setData] = useState<Data>(NOTHING);
  const [attempt, setAttempt] = useState(0);
  const [device, setDevice] = useState<DeviceState>("none");
  // The hash of the address of this device, when it is one that gets notices.
  const [here, setHere] = useState<string | null>(null);
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
      setDevice(deviceState());
      setHere(hash);
      setData(notices && Array.isArray(notices.devices) && notices.settings ? { for: key, status: "ready", notices } : { for: key, status: "failed", notices: null });
    })();
    return () => {
      current = false;
    };
  }, [key, attempt]);

  const signedOut = account.status !== "in";
  const notices = data.notices;
  const zone = notices?.settings.zone ?? deviceZone();
  const onDevice = notices?.devices.find((d) => here !== null && d.endpointHash === here)?.kinds ?? [];
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

  const email = (kind: NoticeKind) => {
    if (!notices) return;
    const on = !notices.settings.email[kind];
    void save("/api/me/notices", "PUT", { zone, email: { [kind]: on } }, (was) => ({ ...was, settings: { ...was.settings, zone, email: { ...was.settings.email, [kind]: on } } }), "The change was not saved. Try again.");
  };

  async function thisDevice(kind: NoticeKind) {
    if (!notices || busy) return;
    setBusy(true);
    setLine(null);
    const subscribed = await subscribeDevice();
    setDevice(deviceState());
    if (!subscribed) {
      setBusy(false);
      if (deviceState() !== "blocked") setLine({ kind: "problem", text: "This device did not turn on. Try again." });
      return;
    }
    const hash = await sha256Hex(subscribed.endpoint);
    const had = notices.devices.find((d) => d.endpointHash === hash)?.kinds ?? [];
    const kinds = had.includes(kind) ? had.filter((k) => k !== kind) : [...had, kind];
    setHere(hash);
    await save(
      "/api/me/notices/device",
      "PUT",
      { ...subscribed, kinds },
      (was) => ({ ...was, devices: [...was.devices.filter((d) => d.endpointHash !== hash), { id: hash, label: subscribed.label, kinds, endpointHash: hash }] }),
      "This device was not saved. Try again.",
    );
    // The zone goes with the first choice of the reader, also when it is a device.
    if (notices.settings.zone === null) void readerCall("/api/me/notices", { method: "PUT", body: JSON.stringify({ zone }) });
    setBusy(false);
  }

  async function allOff() {
    if (!notices) return;
    const none = { daily: false, reminder: false, releases: false };
    const emails = await save("/api/me/notices", "PUT", { zone, email: none }, (was) => ({ ...was, settings: { ...was.settings, email: none } }), "The emails are still on. Try again.");
    if (!emails) return;
    const devices = await save("/api/me/notices/device", "DELETE", { all: true }, (was) => ({ ...was, devices: [] }), "The devices are still on. Try again.");
    if (devices) await unsubscribeDevice();
  }

  const noDevice = device === "none" || device === "ios" || device === "blocked";
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
          {account.status === "out" && (
            <a className="saved-button" {...toSignIn}>
              Sign in
            </a>
          )}
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
                <button type="button" className="notice-chip" aria-pressed={notices.settings.email[kind]} onClick={() => email(kind)}>
                  <Icon name="check" />
                  Email
                </button>
                <button type="button" className="notice-chip wide" aria-pressed={onDevice.includes(kind)} disabled={noDevice || busy} onClick={() => void thisDevice(kind)}>
                  <Icon name="check" />
                  This device
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

          <h2>This device</h2>
          <DeviceLine state={device} />

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

function DeviceLine({ state }: { state: DeviceState }) {
  if (state === "allowed") return <p className="notice-device">Notifications are allowed in this browser on this device.</p>;
  if (state === "ask") return <p className="notice-device">This browser did not ask you yet. Press a “This device” button, then press “Allow” in the question of the browser.</p>;
  if (state === "ios")
    return (
      <div className="notice-device">
        <p>An iPhone or iPad shows notifications of a website only after the site is on the home screen. Apple gives a website no button for that, so these are the steps:</p>
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
        <p>Notifications are blocked for UrantiaHub in this browser. A website cannot remove a block, so these are the steps:</p>
        <ol>
          {unblockSteps(navigator.userAgent).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>Then load this page again.</p>
      </div>
    );
  return <p className="notice-device">This browser cannot show notifications of UrantiaHub. You can choose Email.</p>;
}
