"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { initOffline, offlineState, serverOfflineState, subscribeToOffline } from "@/reader/offline";
import { whenIdle } from "@/lib/when-idle";

function subscribeToConnection(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}
const connected = () => navigator.onLine;
const serverConnected = () => true;

// A small line below the header for a reader with no connection who keeps the papers on this device.
// The reader can close it. It shows again at the next visit with no connection. This component also
// starts "Read offline" at each page load, when the browser is idle.
export function OfflineStrip() {
  const offline = useSyncExternalStore(subscribeToOffline, offlineState, serverOfflineState);
  const online = useSyncExternalStore(subscribeToConnection, connected, serverConnected);
  const [closed, setClosed] = useState(false);
  useEffect(() => whenIdle(() => void initOffline()), []);
  // A new loss of the connection shows the line again.
  if (online && closed) setClosed(false);
  if (online || closed || offline.mode === "off") return null;
  return (
    <div className="offline-strip" role="status">
      <Icon name="noSignal" />
      <span>
        <b>No connection.</b> {offline.mode === "on" ? `All ${offline.total} papers are on this device.` : `${offline.have} of the ${offline.total} papers are on this device. The rest download when you go online.`}
      </span>
      <button type="button" aria-label="Close" onClick={() => setClosed(true)}>
        <Icon name="close" />
      </button>
    </div>
  );
}
