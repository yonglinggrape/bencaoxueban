export type CardRating = "again" | "hard" | "good"

export interface CardProgress {
  box: number
  dueAt: number
  reviews: number
  lastReviewedAt: number | null
  lastRating: CardRating | null
}

export interface DailyProgress {
  date: string
  score: number
  answered: number
  correct: number
  cardReviews: number
}

export interface StudyStore {
  version: number
  cards: { progress: Record<string, CardProgress> }
  daily: DailyProgress
}

const STORE_VERSION = 1
const STORAGE_KEY = "bencaoxueban-study-state"

// ─── SRS Algorithm (Leitner Box) ───────────────────────────

export function applyCardRating(progress: CardProgress, rating: CardRating, now = Date.now()): CardProgress {
  const nextBox = rating === "again" ? 0 : rating === "hard" ? Math.min(progress.box + 1, 4) : Math.min(progress.box + 2, 6)
  const hardIntervals = [1, 2, 4, 7, 12]
  const goodIntervals = [2, 4, 7, 14, 21, 35, 60]
  const delayDays = rating === "again" ? 0 : rating === "hard" ? (hardIntervals[Math.min(nextBox, 4)] ?? 1) : (goodIntervals[Math.min(nextBox, 6)] ?? 2)
  return { box: nextBox, dueAt: now + delayDays * 24 * 60 * 60 * 1000, reviews: progress.reviews + 1, lastReviewedAt: now, lastRating: rating }
}

export function getCardProgress(store: StudyStore, cardId: string): CardProgress {
  return store.cards.progress[cardId] || { box: 0, dueAt: 0, reviews: 0, lastReviewedAt: null, lastRating: null }
}

export function isCardDue(store: StudyStore, cardId: string, now = Date.now()): boolean {
  return getCardProgress(store, cardId).dueAt <= now
}

export function getDueCards(store: StudyStore, cardIds: string[], now = Date.now()): string[] {
  return cardIds.filter(id => isCardDue(store, id, now))
}

// ─── Daily Progress ────────────────────────────────────────

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function createEmptyDaily(): DailyProgress {
  return { date: getTodayKey(), score: 0, answered: 0, correct: 0, cardReviews: 0 }
}

export function addDailyProgress(store: StudyStore, patch: Partial<Omit<DailyProgress, "date">>) {
  const today = getTodayKey()
  const current = store.daily.date === today ? store.daily : createEmptyDaily()
  return {
    ...store,
    daily: {
      date: today,
      score: Math.max(0, current.score + (patch.score || 0)),
      answered: current.answered + (patch.answered || 0),
      correct: current.correct + (patch.correct || 0),
      cardReviews: current.cardReviews + (patch.cardReviews || 0),
    },
  }
}

// ─── Persistence ────────────────────────────────────────────

export function createDefaultStore(): StudyStore {
  return { version: STORE_VERSION, cards: { progress: {} }, daily: createEmptyDaily() }
}

export function loadStudyStore(): StudyStore {
  if (typeof window === "undefined") return createDefaultStore()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultStore()
    const parsed = JSON.parse(raw) as Partial<StudyStore>
    if (parsed.version !== STORE_VERSION) return createDefaultStore()
    const today = getTodayKey()
    return {
      version: STORE_VERSION,
      cards: { progress: parsed.cards?.progress || {} },
      daily: parsed.daily?.date === today ? parsed.daily : createEmptyDaily(),
    }
  } catch { return createDefaultStore() }
}

export function saveStudyStore(store: StudyStore): void {
  if (typeof window === "undefined") return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) } catch { /* quota exceeded, ignore */ }
}

// ─── Stats ──────────────────────────────────────────────────

export function getCardStats(store: StudyStore, cardIds: string[], now = Date.now()) {
  let total = 0; let due = 0; let reviewed = 0
  for (const id of cardIds) {
    total++
    const p = getCardProgress(store, id)
    if (p.reviews > 0) reviewed++
    if (isCardDue(store, id, now)) due++
  }
  return { total, due, reviewed }
}
