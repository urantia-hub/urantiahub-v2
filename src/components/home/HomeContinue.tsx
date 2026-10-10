"use client";

import Link from "next/link";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { accountPlaceKnown, accountPlaceUnknown, subscribeToAccountPlace } from "@/account/sync";
import { track } from "@/analytics";
import { paperById, referenceHref } from "@/content/paper-index";
import { readLastRead, subscribeToLastRead } from "@/reader/last-read";

const none = () => null;

function usePlace() {
  const last = useSyncExternalStore(subscribeToLastRead, readLastRead, none);
  const paper = last ? paperById(last.paperId) : undefined;
  return last && paper ? { last, paper } : null;
}

// On the home page: the way back to the place that the reader left. The button is in the server's HTML,
// and CSS shows it only while the page carries the mark of a place, so it moves nothing when it shows.
export function HomeContinue() {
  const place = usePlace();
  // The place of a signed-in reader can come from the account, a moment after the page.
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const answered = useSyncExternalStore(subscribeToAccountPlace, accountPlaceKnown, accountPlaceUnknown);
  const coming = account.status === "in" && !answered;
  useLayoutEffect(() => {
    if (place || coming) document.documentElement.dataset.place = "";
    else delete document.documentElement.dataset.place;
  }, [place, coming]);
  return (
    <Link className="btn home-continue" href={place ? referenceHref({ paperId: place.last.paperId, sectionId: place.last.sectionId }) : "/papers"} onClick={() => track("home_continue_clicked")}>
      Continue reading
    </Link>
  );
}

// Under the buttons: where "Continue reading" goes. Its room is kept from the first paint.
export function HomePlace() {
  const place = usePlace();
  const where = place ? [place.paper.id === "0" ? null : `Paper ${place.paper.id}`, place.paper.title, place.last.label].filter(Boolean).join(" · ") : "";
  return <p className="home-place">{where}</p>;
}
