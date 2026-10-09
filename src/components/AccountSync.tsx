"use client";

import { useEffect, useSyncExternalStore } from "react";
import { accountState, serverAccountState, startAccount, subscribeToAccount } from "@/account/client";
import { forgetAccountData, pullFromAccount, startSync } from "@/account/sync";

// Finds out who is signed in, one time for each page load, and keeps a signed-in reader's place and
// settings in the account. It draws nothing.
export function AccountSync() {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const status = account.status;
  // The key names the reader for the server. A pull waits for it, and runs again for another reader.
  const key = account.status === "in" ? (account.user?.key ?? null) : null;
  useEffect(() => {
    startSync();
    void startAccount();
  }, []);
  useEffect(() => {
    if (status === "in" && key) void pullFromAccount();
    // Signed out by a press, by the server, or because the session ended while the reader was away.
    if (status === "out") forgetAccountData();
  }, [status, key]);
  return null;
}
