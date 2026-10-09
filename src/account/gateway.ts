import "server-only";
import { UrantiaAPI } from "@urantia/api";
import { Refused } from "./call";
import type { Gateway } from "./data";

// The only place that asks api.urantia.dev for a reader's own data. `src/content` asks for the Papers.
const api = (token: string) => new UrantiaAPI({ baseUrl: process.env.URANTIA_API_BASE_URL || undefined, token });

// The package reports a failed request as an Error whose message starts with the status.
async function asked<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof Error && /^401\b/.test(error.message)) throw new Refused();
    throw error;
  }
}

export const gateway: Gateway & { profileName(accessToken: string): Promise<string | null> } = {
  preferences: async (token) => (await asked(api(token).me.preferences.get())).data ?? {},
  savePreferences: async (token, patch) => {
    await asked(api(token).me.preferences.update(patch));
  },
  profileName: async (token) => {
    const name = (await asked(api(token).me.get())).data?.name;
    return typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : null;
  },
};
