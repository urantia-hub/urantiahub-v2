"use client";

import Link from "next/link";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { textsHref } from "@/i18n/paths";
import { readTextPlace, subscribeToTextPlaces } from "@/library/text-places";

const none = () => null;

// On the page of a work: the way back to the page that the reader read last, in this browser.
export function WorkContinue({ slug, start, lang = "en" }: { slug: string; start: string; lang?: Lang }) {
  const t = messages(lang).texts;
  const place = useSyncExternalStore(subscribeToTextPlaces, () => readTextPlace(slug), none);
  const key = place?.key ?? null;

  // The page kept room for the card before its first paint (`textPlaceScript`); with no card the room goes.
  // The page of the place is marked in the contents, and its book opens.
  useLayoutEffect(() => {
    if (!key) {
      delete document.documentElement.dataset.textPlace;
      return;
    }
    document.documentElement.dataset.textPlace = "";
    const here = document.querySelector<HTMLElement>(`.work-home [data-page="${CSS.escape(key)}"]`);
    here?.setAttribute("data-here", "");
    const book = here?.closest("details");
    if (book) book.open = true;
    return () => here?.removeAttribute("data-here");
  }, [key]);

  if (!place) return <div className="work-continue-slot" />;
  return (
    <div className="work-continue-slot">
      <Link className="work-continue" href={textsHref(lang, slug, place.key)}>
        <span>
          <small>{t.continue}</small>
          <strong>{place.title}</strong>
          {place.label && <em>{place.label}</em>}
        </span>
        <span className="go">
          <Icon name="paperAfter" />
        </span>
      </Link>
      <Link className="work-or-start" href={start}>
        {t.orStart}
      </Link>
    </div>
  );
}
