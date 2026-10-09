// The reader's place and settings in the account. Each function checks what it reads and what it
// writes: the record of preferences is shared by all apps, and a browser sends the values.

import { parsePlace, parseSettings, PLACE_KEY, type Place, type Settings, SETTINGS_KEY } from "./reader-data";

export type Gateway = {
  preferences(accessToken: string): Promise<Record<string, unknown>>;
  savePreferences(accessToken: string, patch: Record<string, unknown>): Promise<void>;
};

export type ReaderData = { place: Place | null; settings: Settings | null };

export async function readReader(gateway: Gateway, accessToken: string, now: number = Date.now()): Promise<ReaderData> {
  const all = await gateway.preferences(accessToken);
  return { place: parsePlace(all[PLACE_KEY], now), settings: parseSettings(all[SETTINGS_KEY], now) };
}

export async function savePlace(gateway: Gateway, accessToken: string, value: unknown, now: number = Date.now()): Promise<{ saved: boolean }> {
  const place = parsePlace(value, now);
  if (!place) return { saved: false };
  await gateway.savePreferences(accessToken, { [PLACE_KEY]: place });
  return { saved: true };
}

export async function saveSettings(gateway: Gateway, accessToken: string, value: unknown, now: number = Date.now()): Promise<{ saved: boolean }> {
  const settings = parseSettings(value, now);
  if (!settings) return { saved: false };
  await gateway.savePreferences(accessToken, { [SETTINGS_KEY]: settings });
  return { saved: true };
}
