// Questions that people bring. A new visitor sees one from each group on the search screen, chosen at random.
// They are the Hub's own copy. They do not claim that the text answers them. Kelson approves each change.
// Before a question enters the pool, run it against the live search and read its first results.
export const STARTER_GROUPS: readonly { name: string; questions: readonly string[] }[] = [
  { name: "Today", questions: ["Why is the world in such turmoil?", "Where is civilization going?", "How do I live without fear?"] },
  { name: "The person", questions: ["What happens after death?", "What is the soul?", "How do I find peace of mind?"] },
  { name: "The universe", questions: ["How big is the universe?", "What are angels?", "Is there life on other worlds?"] },
  { name: "The story of our world", questions: ["When did humans come to the Americas?", "How did life begin on earth?", "Where did marriage come from?", "Why do people fear ghosts?"] },
  { name: "Jesus", questions: ["Where did Jesus travel before his public ministry?", "What was Jesus like as a child?", "What did Jesus teach about prayer?"] },
];
