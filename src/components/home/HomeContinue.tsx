"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { accountPlaceKnown, accountPlaceUnknown, subscribeToAccountPlace } from "@/account/sync";
import { track } from "@/analytics";
import { paperById, referenceHref } from "@/content/paper-index";
import { contentsHref } from "@/i18n/paths";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { readLastRead, subscribeToLastRead } from "@/reader/last-read";
import { launchResumeHref, watchLaunchEnd } from "@/reader/launch-resume";
import { usePlaceLabel } from "@/reader/place-label";

const none = () => null;

function usePlace(lang: Lang) {
  const last = useSyncExternalStore(subscribeToLastRead, readLastRead, none);
  const paper = last ? paperById(last.paperId, lang) : undefined;
  return last && paper ? { last, paper } : null;
}

// On the home page: the way back to the place that the reader left. The button is in the server's HTML,
// and CSS shows it only while the page carries the mark of a place, so it moves nothing when it shows.
export function HomeContinue({ lang = "en" }: { lang?: Lang }) {
  const place = usePlace(lang);
  // The place of a signed-in reader can come from the account, a moment after the page.
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const answered = useSyncExternalStore(subscribeToAccountPlace, accountPlaceKnown, accountPlaceUnknown);
  const coming = account.status === "in" && !answered;
  useLayoutEffect(() => {
    if (place || coming) document.documentElement.dataset.place = "";
    else delete document.documentElement.dataset.place;
  }, [place, coming]);
  const router = useRouter();
  useEffect(() => {
    const href = launchResumeHref(lang);
    if (!href) return;
    track("app_launch_resumed");
    watchLaunchEnd(window.location.pathname);
    router.replace(href);
  }, [lang, router]);
  return (
    <Link className="btn home-continue" href={place ? referenceHref({ paperId: place.last.paperId, sectionId: place.last.sectionId }, lang) : contentsHref(lang)} onClick={() => track("home_continue_clicked")}>
      {messages(lang).continueReading}
    </Link>
  );
}

// Under the buttons: where "Continue reading" goes. Its room is kept from the first paint.
export function HomePlace({ lang = "en" }: { lang?: Lang }) {
  const place = usePlace(lang);
  const label = usePlaceLabel(place?.last ?? null, lang);
  const where = place ? [place.paper.id === "0" ? null : messages(lang).paperNumber(place.paper.id), place.paper.title, label].filter(Boolean).join(" · ") : "";
  return <p className="home-place">{where}</p>;
}
