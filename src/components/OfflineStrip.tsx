"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
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

// A small line below the header for a reader with no connection who keeps papers on this device, in the
// language of the page, or else in the other language.
// The reader can close it. It shows again at the next visit with no connection. This component also
// starts "Read offline" at each page load, when the browser is idle.
export function OfflineStrip({ lang }: { lang: Lang }) {
  const t = messages(lang);
  const mine = useSyncExternalStore(subscribeToOffline, () => offlineState(lang), serverOfflineState);
  const other = useSyncExternalStore(subscribeToOffline, () => offlineState(lang === "en" ? "es" : "en"), serverOfflineState);
  const offline = mine.mode === "off" ? other : mine;
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
        <b>{t.noConnection}</b> {offline.mode === "on" ? t.offlineAll(offline.total) : t.offlineSome(offline.have, offline.total)}
      </span>
      <button type="button" aria-label={t.close} onClick={() => setClosed(true)}>
        <Icon name="close" />
      </button>
    </div>
  );
}
