import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getLevelInfo } from "@/lib/game/levels"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId") || "default-user"
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const [answerCount, herbCount, achievementCount] = await Promise.all([
    prisma.answerRecord.count({ where: { userId } }),
    prisma.userHerb.count({ where: { userId } }),
    prisma.userAchievement.count({ where: { userId } }),
  ])

  const correctCount = await prisma.answerRecord.count({ where: { userId, isCorrect: true } })

  return NextResponse.json({
    userId: user.id,
    game: getLevelInfo(user.exp),
    stats: { totalQuestions: answerCount, correctRate: answerCount > 0 ? correctCount / answerCount : 0, streak: user.streak, points: user.points, herbCards: herbCount, achievements: achievementCount },
  })
}
