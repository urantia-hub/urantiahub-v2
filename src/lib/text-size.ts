// The size of the text of a paper, as a step from 0 to 4. The middle step is the size of the design.
export const SCALES = [0.89, 0.94, 1, 1.11, 1.22] as const;
export const DEFAULT_STEP = 2;
export const TEXT_SIZE_KEY = "hub:text-size";

const CHANGE_EVENT = "textsizechange";
const clamp = (step: number) => Math.min(SCALES.length - 1, Math.max(0, Math.round(step)));

export function currentTextSize(): number {
  const step = Number(document.documentElement.dataset.textSize);
  return document.documentElement.dataset.textSize !== undefined && Number.isInteger(step) ? clamp(step) : DEFAULT_STEP;
}

// Changes the size now, and remembers it in this browser if storage is available.
export function applyTextSize(step: number): void {
  const next = clamp(step);
  document.documentElement.dataset.textSize = String(next);
  document.documentElement.style.setProperty("--reader-scale", String(SCALES[next]));
  try {
    window.localStorage.setItem(TEXT_SIZE_KEY, String(next));
  } catch {
    // Storage is blocked. The size still changes for this page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToTextSize(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

// Runs before the first paint, so a reader who chose another size never sees the text jump.
export const TEXT_SIZE_INIT_SCRIPT = `try{var s=localStorage.getItem("${TEXT_SIZE_KEY}"),k=${JSON.stringify(SCALES)};if(/^[0-4]$/.test(s)&&s!=="${DEFAULT_STEP}"){document.documentElement.dataset.textSize=s;document.documentElement.style.setProperty("--reader-scale",String(k[+s]))}}catch(e){}`;
