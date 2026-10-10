import { useCallback, useEffect, useRef, useState } from "react";

// How long a sheet takes to go. The styles in motion.css use the same time.
export const LEAVE_MS = 180;

// A sheet that closes moves away first. `leave` starts the move, and `onClose` comes after it.
// A reader who asked for less motion gets `onClose` at once.
export function useLeave(onClose: () => void) {
  const [leaving, setLeaving] = useState(false);
  const close = useRef(onClose);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    },
    [],
  );
  const leave = useCallback(() => {
    if (timer.current !== null) return;
    if (!window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return close.current();
    setLeaving(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      close.current();
    }, LEAVE_MS);
  }, []);
  return { leaving, leave };
}
