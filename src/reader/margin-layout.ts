// Where each card of notes sits in the margin: at the top of its paragraph, or below the card before
// it when that one is long. The answer has the order of the input.
// `chosen` is the card of the marked paragraph. It has the first right to its place: the cards before
// it move up, and the cards after it move down.
export function placeCards(cards: readonly { top: number; height: number }[], gap = 12, chosen = -1): number[] {
  const order = cards.map((_, i) => i).sort((a, b) => cards[a].top - cards[b].top);
  const tops = new Array<number>(cards.length);
  const at = order.indexOf(chosen);
  let free = -Infinity;
  for (const i of order.slice(Math.max(at, 0))) {
    tops[i] = Math.max(cards[i].top, free);
    free = tops[i] + cards[i].height + gap;
  }
  if (at > 0) {
    let room = tops[chosen] - gap;
    for (const i of order.slice(0, at).reverse()) {
      tops[i] = Math.min(cards[i].top, room - cards[i].height);
      room = tops[i] - gap;
    }
  }
  return tops;
}
