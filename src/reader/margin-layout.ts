// Where each card of notes sits in the margin: at the top of its paragraph, or below the card before
// it when that one is long. The answer has the order of the input.
export function placeCards(cards: readonly { top: number; height: number }[], gap = 12): number[] {
  const order = cards.map((_, i) => i).sort((a, b) => cards[a].top - cards[b].top);
  const tops = new Array<number>(cards.length);
  let free = -Infinity;
  for (const i of order) {
    tops[i] = Math.max(cards[i].top, free);
    free = tops[i] + cards[i].height + gap;
  }
  return tops;
}
