import { useLayoutEffect, useRef, useState } from "react";

// For a box that scrolls inside: true while more of its content is below. The box then fades at its
// end, so the reader knows to scroll. Put `ref` and `onScroll` on the box.
export function useMoreBelow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [more, setMore] = useState(false);
  const look = () => {
    const el = ref.current;
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  };
  // After each render: the content can change with no scroll.
  useLayoutEffect(look);
  return { ref, onScroll: look, "data-more": more ? "" : undefined } as const;
}
