// The site allows each address a number of requests a minute for a reader's data. Past it, a request
// is refused with status 429 for a short time. The reader gets words that say so, not a plain failure.
export const LIMITED_WORDS = "Too many requests for now. Wait a minute, then try again.";

let limited = false;

// Each answer for a reader's data says if the limit refused it. Null is a request with no answer.
export function noteStatus(status: number | null): void {
  limited = status === 429;
}

// The words for the request that just failed: the limit when that was the reason, or the words given.
export function failureWords(other: string): string {
  return limited ? LIMITED_WORDS : other;
}
