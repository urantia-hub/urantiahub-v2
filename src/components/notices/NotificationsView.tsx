"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { accountKey, accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { NOTICE_KINDS, type NoticeKind, type Notices } from "@/account/notices";
import { readerCall } from "@/account/reader-call";
import { Icon } from "@/components/icons";
import { SignInLink } from "@/components/SignInLink";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref } from "@/i18n/paths";
import { DEVICE_EVENT, registerDevice } from "@/notices/device-end";
import { currentEndpoint, type DeviceState, deviceState, sha256Hex, unblockSteps } from "@/notices/push";
import { changeStreakSettings, loadStreak, serverStreakView, streakView, subscribeToStreak } from "@/streak/client";

type Words = ReturnType<typeof messages>["notices"];
// The name and the line of each notice, in the language of the page.
export function noticeWords(t: Words): Record<NoticeKind, { title: string; about: string }> {
  return {
    daily: { title: t.dailyTitle, about: t.dailyAbout },
    reminder: { title: t.reminderTitle, about: t.reminderAbout },
    releases: { title: t.releasesTitle, about: t.releasesAbout },
    streak: { title: t.streakTitle, about: t.streakAbout },
  };
}
const STREAKS_ON = process.env.NEXT_PUBLIC_STREAKS === "on";
// The streak row shows while the streak is a feature of the site. It is a push only.
const KINDS = NOTICE_KINDS.filter((kind) => kind !== "streak" || STREAKS_ON);
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
export const hourLabel = (hour: number, lang: Lang = "en") => messages(lang).notices.hour(hour);
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
export function NotificationsView({ lang = "en" }: { lang?: Lang }) {
  const all = messages(lang);
  const t = all.notices;
  const NOTICES = noticeWords(t);
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
      setLine({ kind: "saved", text: t.saved });
      return true;
    }
    change(() => before);
    setLine({ kind: "problem", text: problem });
    return false;
  }

  const settings = (patch: Partial<{ hour: number; zone: string }>, apply: (was: Notices) => Notices) =>
    // The first change also keeps the time zone of this device.
    save("/api/me/notices", "PUT", { zone, ...patch }, apply, t.notSaved);

  const choose = (channel: Channel, kind: NoticeKind, on: boolean) =>
    save("/api/me/notices", "PUT", { zone, [channel]: { [kind]: on } }, (was) => ({ ...was, settings: { ...was.settings, zone, [channel]: { ...was.settings[channel], [kind]: on } } }), t.notSaved);

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
        if (deviceState() !== "blocked") setLine({ kind: "problem", text: t.deviceFailed });
        return;
      }
      setHere(true);
    }
    await choose("push", kind, on);
  }

  async function allOff() {
    if (!notices) return;
    const none = { daily: false, reminder: false, releases: false, streak: false };
    const off = await save("/api/me/notices", "PUT", { zone, email: none, push: none }, (was) => ({ ...was, settings: { ...was.settings, email: none, push: none } }), t.stillOn);
    if (!off) return;
    const gone = await save("/api/me/notices/device", "DELETE", { all: true }, (was) => ({ ...was, devices: [] }), t.devicesStillOn);
    if (gone) setHere(false);
  }

  // A push can be turned on here when this device can get one, or when another device of the reader does.
  const canPush = here || device === "ask" || device === "allowed" || (notices?.devices.length ?? 0) > 0;
  const others = (notices?.devices.length ?? 0) - (here ? 1 : 0);
  return (
    <div className="saved-page notices-page">
      <p className="saved-back">
        <Link href={contentsHref(lang)}>
          <Icon name="paperBefore" />
          {all.papersCrumb}
        </Link>
      </p>
      <h1>{t.title}</h1>
      {signedOut && (
        <div className="saved-empty">
          <b>{t.signedOutTitle}</b>
          {t.signedOutLine}
          {account.status === "out" && <SignInLink className="saved-button" lang={lang} />}
        </div>
      )}
      {!signedOut && data.status === "loading" && <p className="progress-wait" role="status" aria-label={t.loading} />}
      {!signedOut && data.status === "failed" && (
        <p className="saved-empty" role="alert">
          {t.failed}{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            {all.tryAgain}
          </button>
        </p>
      )}
      {!signedOut && notices && (
        <>
          <p className="notices-lead">{t.lead}</p>
          {/* The line has its room from the start, so nothing moves when it shows. */}
          <p className="notices-line" role="status" data-kind={line?.kind}>
            {line?.text}
          </p>

          {KINDS.map((kind) => (
            <div className="notice-row" key={kind} role="group" aria-label={NOTICES[kind].title}>
              <span>
                <b>{NOTICES[kind].title}</b>
                <small>{NOTICES[kind].about}</small>
              </span>
              <div className="notice-chips">
                {kind !== "streak" && (
                  <button type="button" className="notice-chip" aria-pressed={notices.settings.email[kind]} onClick={() => void choose("email", kind, !notices.settings.email[kind])}>
                    <Icon name="check" />
                    {t.email}
                  </button>
                )}
                <button type="button" className="notice-chip" aria-pressed={notices.settings.push[kind]} aria-busy={busy || undefined} disabled={busy || (!canPush && !notices.settings.push[kind])} onClick={() => void push(kind)}>
                  <Icon name="check" />
                  {t.push}
                </button>
              </div>
            </div>
          ))}

          <h2>{t.when}</h2>
          <label className="notice-set">
            <span>{t.dailyAt}</span>
            <select value={notices.settings.hour} onChange={(event) => { const hour = Number(event.target.value); void settings({ hour }, (was) => ({ ...was, settings: { ...was.settings, zone, hour } })); }}>
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour, lang)}
                </option>
              ))}
            </select>
          </label>
          {STREAKS_ON && <StreakHour lang={lang} />}
          <label className="notice-set">
            <span>
              {t.zone}
              <small>{t.zoneLine}</small>
            </span>
            <select value={zone} onChange={(event) => { const next = event.target.value; void settings({ zone: next }, (was) => ({ ...was, settings: { ...was.settings, zone: next } })); }}>
              {zones(zone).map((name) => (
                <option key={name} value={name}>
                  {zoneLabel(name)}
                </option>
              ))}
            </select>
          </label>

          <h2>{t.push}</h2>
          <DeviceLine state={device} here={here} others={others} lang={lang} />

          <p className="notices-foot">
            {account.user?.email ? t.emailTo(account.user.email) : ""}
            {t.codeLine}{" "}
            <button type="button" onClick={() => void allOff()}>
              {t.allOff}
            </button>
          </p>
        </>
      )}
    </div>
  );
}

function DeviceLine({ state, here, others, lang }: { state: DeviceState; here: boolean; others: number; lang: Lang }) {
  const t = messages(lang).notices;
  const elsewhere = others > 0 ? t.elsewhere(others) : "";
  if (here) return <p className="notice-device">{t.here}</p>;
  if (state === "allowed" || state === "ask")
    return (
      <p className="notice-device">
        {t.ask}
        {elsewhere}
      </p>
    );
  if (state === "ios")
    return (
      <div className="notice-device">
        <p>
          {t.ios}
          {elsewhere}
        </p>
        <ol>
          <li>{bold(t.iosStep1, t.iosShare)}</li>
          <li>{bold(t.iosStep2, t.iosAdd)}</li>
          <li>{t.iosStep3}</li>
        </ol>
      </div>
    );
  if (state === "blocked")
    return (
      <div className="notice-device">
        <p>
          {t.blocked}
          {elsewhere}
        </p>
        <ol>
          {unblockSteps(navigator.userAgent, lang).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>{t.reload}</p>
      </div>
    );
  return (
    <p className="notice-device">
      {t.cannot}
      {elsewhere}
    </p>
  );
}

// A step with one word in bold, in the place that the sentence of its language gives it.
function bold(step: (b: string) => string, word: string) {
  const [before, after] = step("\u0000").split("\u0000");
  return (
    <>
      {before}
      <b>{word}</b>
      {after}
    </>
  );
}

// The hour of the streak reminder, while the reader keeps a streak. It is a setting of the streak.
function StreakHour({ lang }: { lang: Lang }) {
  const view = useSyncExternalStore(subscribeToStreak, streakView, serverStreakView);
  useEffect(() => void loadStreak(), []);
  if (!view.card?.on) return null;
  return (
    <label className="notice-set">
      <span>{messages(lang).notices.streakAt}</span>
      <select value={view.card.hour} onChange={(event) => void changeStreakSettings({ hour: Number(event.target.value) })}>
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {hourLabel(hour, lang)}
          </option>
        ))}
      </select>
    </label>
  );
}
