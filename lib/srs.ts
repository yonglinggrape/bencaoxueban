export type CardRating = "again" | "hard" | "good"

export interface CardProgress {
  box: number
  dueAt: number
  reviews: number
  lastReviewedAt: number | null
  lastRating: CardRating | null
}

const hardIntervals = [1, 2, 4, 7, 12]
const goodIntervals = [2, 4, 7, 14, 21, 35, 60]

export function applyCardRating(prev: CardProgress, rating: CardRating, now = Date.now()): CardProgress {
  let box: number
  let dueAt: number

  if (rating === "again") {
    box = 0
    dueAt = now
  } else if (rating === "hard") {
    box = Math.min(prev.box + 1, 4)
    const days = hardIntervals[box] ?? 12
    dueAt = now + days * 86400000
  } else {
    box = Math.min(prev.box + 2, 6)
    const days = goodIntervals[box] ?? 60
    dueAt = now + days * 86400000
  }

  return {
    box,
    dueAt,
    reviews: prev.reviews + 1,
    lastReviewedAt: now,
    lastRating: rating,
  }
}

export function isCardDue(progress: CardProgress, now = Date.now()): boolean {
  return progress.dueAt <= now
}

export function getDueCards(progressMap: Record<string, CardProgress>, cardIds: string[], now = Date.now()): string[] {
  return cardIds.filter(id => {
    const p = progressMap[id]
    if (!p) return true // new card, never reviewed
    return isCardDue(p, now)
  })
}
