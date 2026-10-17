// The notices of a signed-in reader: which ones go by email, the hour, the time zone, and the devices.
// The API keeps them. A browser sends the values, so each function checks them before a call.

// `streak` goes as a push only. The API refuses it by email.
export const NOTICE_KINDS = ["daily", "reminder", "releases", "streak"] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];
export const DEFAULT_HOUR = 7;

// `zone` is null until the reader made a choice: the page then shows the zone of the device.
export type NoticeSettings = { email: Record<NoticeKind, boolean>; push: Record<NoticeKind, boolean>; hour: number; zone: string | null; asked: boolean };
// The address of a device never comes back from the API. The browser finds its own row by the hash.
// `kinds` is from an earlier form, and is empty: a push goes to each device of the reader.
export type NoticeDevice = { id: string; label: string; kinds: NoticeKind[]; endpointHash: string };
export type Notices = { settings: NoticeSettings; devices: NoticeDevice[] };
export type DeviceInput = { endpoint: string; p256dh: string; auth: string; kinds: NoticeKind[]; label: string };
export type DeviceRemoval = { endpoint: string } | { all: true };

export type NoticesGateway = {
  notices(accessToken: string): Promise<unknown>;
  saveNotices(accessToken: string, patch: Record<string, unknown>): Promise<void>;
  saveDevice(accessToken: string, device: DeviceInput): Promise<void>;
  removeDevice(accessToken: string, which: DeviceRemoval): Promise<void>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isKind = (value: unknown): value is NoticeKind => typeof value === "string" && (NOTICE_KINDS as readonly string[]).includes(value);
const isHour = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23;
const isZone = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 64;

export function parseNotices(answer: unknown): Notices {
  const given = isRecord(answer) ? answer : {};
  const settings = isRecord(given.settings) ? given.settings : {};
  const flags = (given: unknown): Record<NoticeKind, boolean> => {
    const of = isRecord(given) ? given : {};
    return { daily: of.daily === true, reminder: of.reminder === true, releases: of.releases === true, streak: of.streak === true };
  };
  const devices = Array.isArray(given.devices) ? given.devices : [];
  return {
    settings: {
      email: flags(settings.email),
      push: flags(settings.push),
      hour: isHour(settings.hour) ? settings.hour : DEFAULT_HOUR,
      zone: isRecord(given.settings) && isZone(settings.zone) ? settings.zone : null,
      asked: settings.asked === true,
    },
    devices: devices.flatMap((device): NoticeDevice[] => {
      if (!isRecord(device) || typeof device.id !== "string" || typeof device.endpointHash !== "string") return [];
      return [{ id: device.id, label: typeof device.label === "string" ? device.label : "", kinds: Array.isArray(device.kinds) ? device.kinds.filter(isKind) : [], endpointHash: device.endpointHash }];
    }),
  };
}

export async function readNotices(gateway: NoticesGateway, accessToken: string): Promise<Notices> {
  return parseNotices(await gateway.notices(accessToken));
}

// A change names only the fields that it changes. The API checks each one again.
export async function changeNotices(gateway: NoticesGateway, accessToken: string, value: unknown): Promise<{ saved: boolean }> {
  if (!isRecord(value)) return { saved: false };
  const patch: Record<string, unknown> = {};
  for (const channel of ["email", "push"] as const) {
    const given = value[channel];
    if (!isRecord(given)) continue;
    const flags = Object.fromEntries(Object.entries(given).filter(([kind, on]) => isKind(kind) && typeof on === "boolean" && !(channel === "email" && kind === "streak")));
    if (Object.keys(flags).length > 0) patch[channel] = flags;
  }
  if (isHour(value.hour)) patch.hour = value.hour;
  if (isZone(value.zone)) patch.zone = value.zone;
  if (value.asked === true) patch.asked = true;
  if (Object.keys(patch).length === 0) return { saved: false };
  await gateway.saveNotices(accessToken, patch);
  return { saved: true };
}

const KEY_TEXT = /^[A-Za-z0-9_-]{8,200}={0,2}$/;

export async function changeDevice(gateway: NoticesGateway, accessToken: string, value: unknown): Promise<{ saved: boolean }> {
  if (!isRecord(value)) return { saved: false };
  const { endpoint, p256dh, auth, kinds, label } = value;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1000) return { saved: false };
  if (typeof p256dh !== "string" || !KEY_TEXT.test(p256dh) || typeof auth !== "string" || !KEY_TEXT.test(auth)) return { saved: false };
  if (!Array.isArray(kinds) || !kinds.every(isKind)) return { saved: false };
  if (typeof label !== "string" || label.length > 60) return { saved: false };
  await gateway.saveDevice(accessToken, { endpoint, p256dh, auth, kinds, label });
  return { saved: true };
}

export async function removeDevice(gateway: NoticesGateway, accessToken: string, value: unknown): Promise<{ removed: boolean }> {
  if (!isRecord(value)) return { removed: false };
  const which: DeviceRemoval | null = value.all === true ? { all: true } : typeof value.endpoint === "string" && value.endpoint.length <= 1000 ? { endpoint: value.endpoint } : null;
  if (!which) return { removed: false };
  await gateway.removeDevice(accessToken, which);
  return { removed: true };
}
