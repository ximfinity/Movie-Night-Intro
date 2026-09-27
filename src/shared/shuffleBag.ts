/** Returns a picker that deals indices from a shuffled "bag" per key: every index in
 * [0, size) comes up once before any repeats, and a new round never starts with the index
 * that ended the previous one. So a slide with 4 subtitle variations shows all 4 across
 * loops of the show instead of pure random, which often repeats the same line back-to-back.
 * If `size` changes for a key (options edited), that key's bag starts over. */
export function createShuffleBag(
  random: () => number = Math.random
): (key: string, size: number) => number {
  const bags = new Map<string, { remaining: number[]; last: number | null; size: number }>()

  return (key, size) => {
    if (size <= 0) return -1
    let bag = bags.get(key)
    if (!bag || bag.size !== size) {
      bag = { remaining: [], last: null, size }
      bags.set(key, bag)
    }
    if (bag.remaining.length === 0) {
      const deck = Array.from({ length: size }, (_, i) => i)
      for (let i = size - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[deck[i], deck[j]] = [deck[j], deck[i]]
      }
      // Picks come off the end; don't let a new round open with the previous round's last.
      if (size > 1 && deck[size - 1] === bag.last)
        [deck[0], deck[size - 1]] = [deck[size - 1], deck[0]]
      bag.remaining = deck
    }
    const pick = bag.remaining.pop()!
    bag.last = pick
    return pick
  }
}
