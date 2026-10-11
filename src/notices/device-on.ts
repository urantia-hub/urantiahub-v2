// Makes this device one that gets notices for the reader of the page, in the order that keeps it safe:
// the browser's own question, a check that the reader is still the same, the mark of whose device it
// is, and then the account.

import { accountKey } from "@/account/client";
import { NOTICE_KINDS, type NoticeDevice, type NoticeKind } from "@/account/notices";
import { readerCall } from "@/account/reader-call";
import { claimDevice, endDevice, rememberDevice } from "./device-end";
import { sha256Hex, subscribeDevice, unsubscribeDevice } from "./push";

export type Turned =
  | { ok: true; device: NoticeDevice }
  // "refused": the reader or the browser said no. "changed": another reader, or none, is signed in now.
  // "mark": the browser cannot keep whose device it is. "save": the account did not take it.
  | { ok: false; why: "refused" | "changed" | "mark" | "save" };

// `mine`: the reader of the press. `next`: the notices of this device after the change, from the ones before.
export async function turnOnDevice(mine: string, known: readonly NoticeDevice[], next: (had: NoticeKind[]) => NoticeKind[]): Promise<Turned> {
  // The browser can ask for a long time, and the reader can change in it.
  const subscribed = await subscribeDevice();
  if (!subscribed) return { ok: false, why: "refused" };
  if (accountKey() !== mine) {
    await unsubscribeDevice();
    return { ok: false, why: "changed" };
  }
  // First the browser keeps whose device this is. Without the mark the device shows no notice.
  if (!(await claimDevice(mine)) || accountKey() !== mine) {
    await endDevice(null);
    return { ok: false, why: "mark" };
  }
  const hash = await sha256Hex(subscribed.endpoint);
  const kinds = next(known.find((device) => device.endpointHash === hash)?.kinds ?? []);
  // The server refuses the save when the session is not the session of this reader.
  const answer = (await readerCall("/api/me/notices/device", { method: "PUT", body: JSON.stringify({ ...subscribed, kinds }) })) as { saved?: unknown } | null;
  if (answer?.saved !== true) return { ok: false, why: "save" };
  // So the same reader gets this device back after a sign-out and a new sign-in.
  rememberDevice(mine, kinds);
  return { ok: true, device: { id: hash, label: subscribed.label, kinds, endpointHash: hash } };
}

// The same reader signed in again on a device that the reader signed out of. The device gets its
// notices back only if the account still has it, with no notice: that is what a sign-out leaves.
// A device that the reader removed is not in the account, and nothing comes back.
export async function restoreDevice(mine: string, kinds: readonly string[]): Promise<boolean> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const current = await registration?.pushManager.getSubscription();
  if (!current) return false;
  const hash = await sha256Hex(current.endpoint);
  const notices = (await readerCall("/api/me/notices")) as { devices?: NoticeDevice[] } | null;
  const known = notices?.devices?.find((device) => device.endpointHash === hash);
  if (!known || known.kinds.length > 0 || accountKey() !== mine) return false;
  const wanted = kinds.filter((kind): kind is NoticeKind => (NOTICE_KINDS as readonly string[]).includes(kind));
  if (wanted.length === 0) return false;
  return (await turnOnDevice(mine, [], () => wanted)).ok;
}
