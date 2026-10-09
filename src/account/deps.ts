import "server-only";
import { createAuthorizeUrl, exchangeCode, refreshTokens, revokeTokens } from "@urantia/auth/server";
import { site } from "@/site";
import { gateway } from "./gateway";
import type { Deps } from "./handlers";

// UrantiaHub's own app on the accounts site. It is first-party, so a reader sees no permission screen.
const APP_ID = "urantiahub-app";
// All that the Hub will use, also bookmarks and notes (step 6): a reader then does not sign in again for them.
const SCOPES = ["profile", "preferences", "reading-progress", "bookmarks", "notes"];
const redirectUri = `${site.origin}/auth/callback`;
// Set only by the browser tests, which run against stand-ins.
const endpoints = { loginUrl: process.env.ACCOUNTS_URL || undefined, apiUrl: process.env.URANTIA_API_BASE_URL || undefined };

// The real dependencies of the account routes. With no `HUB_APP_SECRET`, the sign-in is off.
export const deps: Deps = {
  secret: process.env.HUB_APP_SECRET ?? "",
  origin: site.origin,
  authorize: ({ askAccount }) => createAuthorizeUrl({ appId: APP_ID, redirectUri, scopes: SCOPES, askAccount, loginUrl: endpoints.loginUrl }),
  exchange: ({ code, codeVerifier }) => exchangeCode({ appId: APP_ID, code, codeVerifier, redirectUri, appSecret: process.env.HUB_APP_SECRET, ...endpoints }),
  refresh: (refreshToken) => refreshTokens({ appId: APP_ID, refreshToken, ...endpoints }),
  revoke: async (refreshToken) => {
    await revokeTokens({ appId: APP_ID, refreshToken, ...endpoints });
  },
  profileName: gateway.profileName,
};
