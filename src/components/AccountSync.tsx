"use client";

import { useEffect, useSyncExternalStore } from "react";
import { accountState, serverAccountState, startAccount, subscribeToAccount } from "@/account/client";
import { pullFromAccount, startSync } from "@/account/sync";

// Finds out who is signed in, one time for each page load, and keeps a signed-in reader's place and
// settings in the account. It draws nothing.
export function AccountSync() {
  const status = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState).status;
  useEffect(() => {
    startSync();
    void startAccount();
  }, []);
  useEffect(() => {
    if (status === "in") void pullFromAccount();
  }, [status]);
  return null;
}
