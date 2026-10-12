"use client";

import { useSyncExternalStore } from "react";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import { offlineState, removeOffline, serverOfflineState, startOffline, subscribeToOffline } from "@/reader/offline";

// "Read offline", in the settings: a switch of this device. Its small line says what the device keeps.
export function OfflineRow() {
  const offline = useSyncExternalStore(subscribeToOffline, offlineState, serverOfflineState);
  if (!offline.can) return null;
  const on = offline.mode !== "off";
  const line = offline.mode === "on" ? `${offline.total} papers kept` : offline.mode === "loading" ? `${offline.have} of ${offline.total} papers` : `All ${offline.total} papers, about 5 MB`;
  return (
    <div className="device-row offline-row">
      <Icon name="download" />
      <span id="offline-name">
        Read offline
        <small role="status">{line}</small>
      </span>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={on}
        aria-labelledby="offline-name"
        onClick={() => {
          track("offline_set", { on: !on });
          void (on ? removeOffline() : startOffline());
        }}
      />
    </div>
  );
}
