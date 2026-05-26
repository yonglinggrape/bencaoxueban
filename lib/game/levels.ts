export function getLevelInfo(totalExp: number) {
  let level = 1
  let expNeeded = 100
  let remaining = totalExp
  while (remaining >= expNeeded && level < 60) {
    remaining -= expNeeded
    level++
    expNeeded = Math.floor(100 * Math.pow(1.15, level - 1))
  }
  return {
    level,
    totalExp,
    expToNext: expNeeded,
    expInCurrentLevel: remaining,
    progress: expNeeded > 0 ? remaining / expNeeded : 1,
  }
}

export function calculateExpReward(difficulty: string, isCorrect: boolean, isStreak: boolean): number {
  if (!isCorrect) return 5
  const base: Record<string, number> = { easy: 30, medium: 50, hard: 100 }
  const exp = base[difficulty] || 30
  return isStreak ? Math.floor(exp * 1.5) : exp
}
