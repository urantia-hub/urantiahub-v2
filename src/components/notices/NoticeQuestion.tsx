"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { accountKey, accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import type { Notices } from "@/account/notices";
import { readerCall } from "@/account/reader-call";
import { Sheet } from "@/components/reader/Sheet";
import { turnOnDevice } from "@/notices/device-on";
import { deviceState } from "@/notices/push";

const NOTICES_ON = process.env.NEXT_PUBLIC_NOTICES === "on";
// The page settles first: a sheet that opens with the page would cover what the reader came for.
const WAIT_MS = 1500;
const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
// The date of the reader, not of the server.
const today = () => new Date().toLocaleDateString("en-CA");
// Not on top of another sheet, and not while the voice plays.
const busyPage = () => document.querySelector(".panel") !== null || [...document.querySelectorAll("audio")].some((audio) => !audio.paused);

type Passage = { ref: string; text: string };
type Step = { status: "hidden" } | { status: "ask"; devices: Notices["devices"]; passage: Passage | null } | { status: "done"; how: "email" | "device" } | { status: "failed" };

// One question, one time for each reader: the daily passage, by email or on this device.
// It shows after the first sign-in, and the answer is kept in the account, so no other device asks again.
export function NoticeQuestion() {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const key = account.status === "in" ? (account.user?.key ?? null) : null;
  const path = usePathname();
  const router = useRouter();
  const [step, setStep] = useState<Step>({ status: "hidden" });
  const [busy, setBusy] = useState(false);
  // The reader was asked in this page life, or the account says so.
  const [asked, setAsked] = useState<string | null>(null);

  useEffect(() => {
    // The settings page shows the same choices. No question there, or on the page that turns an email off.
    if (!NOTICES_ON || !key || asked === key || path === "/notifications" || path === "/emails") return;
    let current = true;
    const timer = window.setTimeout(async () => {
      if (!current || busyPage()) return;
      const notices = (await readerCall("/api/me/notices")) as Notices | null;
      if (!current || !notices?.settings || accountKey() !== key) return;
      if (notices.settings.asked) return setAsked(key);
      const passage = await fetch(`/api/notices/today?date=${today()}`)
        .then((response) => (response.ok ? (response.json() as Promise<Passage>) : null))
        .catch(() => null);
      if (!current || busyPage() || accountKey() !== key) return;
      setStep({ status: "ask", devices: notices.devices, passage });
    }, WAIT_MS);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [key, asked, path]);

  // Another reader, or a sign-out: the question of the reader before goes away.
  if (step.status !== "hidden" && (!key || (asked !== null && asked !== key))) setStep({ status: "hidden" });
  if (step.status === "hidden" || !key) return null;

  const save = async (patch: object) => ((await readerCall("/api/me/notices", { method: "PUT", body: JSON.stringify({ ...patch, asked: true, zone: deviceZone() }) })) as { saved?: unknown } | null)?.saved === true;
  const close = () => {
    setAsked(key);
    setStep({ status: "hidden" });
  };
  // A close with no choice is an answer too: the question does not come back.
  const notNow = () => {
    void save({});
    close();
  };

  async function byEmail() {
    setBusy(true);
    const saved = await save({ email: { daily: true } });
    setBusy(false);
    setAsked(key);
    setStep(saved ? { status: "done", how: "email" } : { status: "failed" });
  }

  async function onDevice() {
    if (step.status !== "ask") return;
    // A device that cannot ask here: the settings page has the steps for it.
    if (deviceState() !== "ask" && deviceState() !== "allowed") {
      void save({});
      close();
      router.push("/notifications");
      return;
    }
    setBusy(true);
    const turned = await turnOnDevice(key as string, step.devices, (had) => [...new Set([...had, "daily" as const])]);
    if (turned.ok) await save({});
    setBusy(false);
    if (!turned.ok && turned.why === "changed") return setStep({ status: "hidden" });
    setAsked(key);
    setStep(turned.ok ? { status: "done", how: "device" } : { status: "failed" });
  }

  if (step.status === "ask") {
    return (
      <Sheet label="A passage each day" onClose={notNow} className="notice-question">
        <p className="eyebrow">New</p>
        <h2>A passage each day?</h2>
        <p>UrantiaHub can send you one short passage of the Papers each day, by email or on this device. It is off until you turn it on.</p>
        {step.passage && (
          <blockquote>
            {step.passage.text.length > 260 ? `${step.passage.text.slice(0, 260).replace(/\s+\S*$/, "")} …` : step.passage.text}
            <cite>{step.passage.ref} · the passage of today</cite>
          </blockquote>
        )}
        <button type="button" className="panel-button dark" disabled={busy} onClick={() => void byEmail()}>
          Send it by email
        </button>
        <button type="button" className="panel-button" disabled={busy} onClick={() => void onDevice()}>
          Send it to this device
        </button>
        <button type="button" className="notice-later" disabled={busy} onClick={notNow}>
          Not now
        </button>
        <small>It comes at 7:00 AM in your time zone. You can change this at any time: the person button, then Notifications.</small>
      </Sheet>
    );
  }
  return (
    <Sheet label="A passage each day" onClose={close} className="notice-question">
      {step.status === "done" ? (
        <>
          <h2>It is on</h2>
          <p role="status">{step.how === "email" ? "The passage comes by email" : "The passage comes to this device"} each day at 7:00 AM in your time zone.</p>
        </>
      ) : (
        <>
          <h2>It did not turn on</h2>
          <p role="alert">Nothing was changed. You can turn it on in the settings.</p>
        </>
      )}
      <Link className="panel-button dark" href="/notifications" onClick={close}>
        Notification settings
      </Link>
      <button type="button" className="notice-later" onClick={close}>
        Close
      </button>
    </Sheet>
  );
}
