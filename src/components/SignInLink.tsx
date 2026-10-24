"use client";

import { type MouseEvent, useEffect, useState } from "react";
import { signInHref } from "@/account/client";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";

// The link to the sign-in, with a state while the sign-in page opens. The way there takes a moment,
// and a reader who sees nothing presses again and again (Kelson, 2026-10-11).
// The address holds this page and this paragraph, so it is made at the press.
export function useSignInLink() {
  const [going, setGoing] = useState(false);
  useEffect(() => {
    // The reader came back with the back button: the link works again.
    const back = () => setGoing(false);
    window.addEventListener("pageshow", back);
    return () => window.removeEventListener("pageshow", back);
  }, []);
  return {
    going,
    link: {
      href: "/api/auth/start",
      "aria-busy": going || undefined,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        if (going) return event.preventDefault();
        event.currentTarget.href = signInHref();
        setGoing(true);
      },
    },
  };
}

// A plain sign-in button.
export function SignInLink({ className, lang = "en" }: { className?: string; lang?: Lang }) {
  const t = messages(lang);
  const { going, link } = useSignInLink();
  return (
    <a className={className} {...link}>
      {going ? t.signInGoing : t.signIn}
    </a>
  );
}
