import { prisma } from "@/lib/db"
import { grantExp, grantPoints } from "./rewards"

const ACHIEVEMENT_CHECKS = [
  { type: "first_answer", condition: (s: { totalAnswers: number }) => s.totalAnswers >= 1 },
  { type: "streak_3", condition: (s: { streak: number }) => s.streak >= 3 },
  { type: "streak_7", condition: (s: { streak: number }) => s.streak >= 7 },
  { type: "streak_30", condition: (s: { streak: number }) => s.streak >= 30 },
  { type: "total_100_questions", condition: (s: { totalAnswers: number }) => s.totalAnswers >= 100 },
  { type: "total_1000_questions", condition: (s: { totalAnswers: number }) => s.totalAnswers >= 1000 },
  { type: "collect_10_herbs", condition: (s: { herbCards: number }) => s.herbCards >= 10 },
  { type: "collect_50_herbs", condition: (s: { herbCards: number }) => s.herbCards >= 50 },
]

export async function checkAchievements(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { answerRecords: true, userHerbs: true, userAchievements: { include: { achievement: true } } } })
  if (!user) return []

  const stats = {
    totalAnswers: user.answerRecords.length,
    streak: user.streak,
    herbCards: user.userHerbs.length,
  }

  const earned = new Set(user.userAchievements.map(a => a.achievement.type || a.achievement.name))
  const newlyEarned: string[] = []

  for (const check of ACHIEVEMENT_CHECKS) {
    if (!earned.has(check.type) && check.condition(stats)) {
      const achievement = await prisma.achievement.findFirst({ where: { name: check.type } })
      if (achievement) {
        await prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } })
        await grantExp(userId, achievement.rewardExp)
        await grantPoints(userId, achievement.rewardPoints, `成就: ${achievement.name}`)
        newlyEarned.push(achievement.name)
      }
    }
  }
  return newlyEarned
}
