import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getLevelInfo } from "@/lib/game/levels"

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, level: true, exp: true, streak: true,
      _count: { select: { answerRecords: true } },
    },
    orderBy: { exp: "desc" },
    take: 50,
  })
  const formatted = users.map(u => ({
    id: u.id, name: u.name || "本草学子", level: u.level, levelInfo: getLevelInfo(u.exp),
    exp: u.exp, streak: u.streak, totalAnswers: u._count.answerRecords,
  }))
  return NextResponse.json({ users: formatted })
}
