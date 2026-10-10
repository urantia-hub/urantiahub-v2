"use client";

import { useState } from "react";

// The number of a parallel. A press, or the pointer over it, says what the number is.
export function Score({ percent }: { percent: number }) {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  return (
    <span className="parallel-score" onMouseEnter={() => setOver(true)} onMouseLeave={() => setOver(false)}>
      <button type="button" aria-expanded={open} aria-label={`${percent}% near in meaning. What is this number?`} onClick={() => setOpen((was) => !was)} onBlur={() => setOpen(false)}>
        {percent}%
      </button>
      {(open || over) && (
        <span className="score-tip" role="status">
          How near in meaning this passage is to the paragraph. A computer measures it.
        </span>
      )}
    </span>
  );
}
