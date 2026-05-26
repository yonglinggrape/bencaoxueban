import { prisma } from "@/lib/db"
import { getLevelInfo, calculateExpReward } from "./levels"

export async function grantExp(userId: string, amount: number) {
  const user = await prisma.user.update({ where: { id: userId }, data: { exp: { increment: amount }, lastStudyAt: new Date() } })
  const prev = getLevelInfo(Math.max(0, user.exp - amount))
  const now = getLevelInfo(user.exp)
  const leveledUp = prev.level < now.level
  return { leveledUp, levelInfo: now }
}

export async function grantPoints(userId: string, amount: number, reason: string, source = "答题奖励") {
  await prisma.user.update({ where: { id: userId }, data: { points: { increment: amount } } })
  await prisma.pointRecord.create({ data: { userId, amount, reason, source } })
}

export async function grantHerbCard(userId: string, herbId: string) {
  const existing = await prisma.userHerb.findUnique({ where: { userId_herbId: { userId, herbId } } })
  if (existing) {
    await prisma.userHerb.update({ where: { id: existing.id }, data: { timesEncountered: { increment: 1 } } })
  } else {
    await prisma.userHerb.create({ data: { userId, herbId } })
  }
}

export async function processAnswerReward(userId: string, difficulty: string, isCorrect: boolean, isStreak: boolean) {
  const exp = calculateExpReward(difficulty, isCorrect, isStreak)
  const result = await grantExp(userId, exp)
  if (isCorrect) {
    const points = difficulty === "hard" ? 10 : difficulty === "medium" ? 5 : 2
    await grantPoints(userId, points, "答题正确")
  }
  return result
}
