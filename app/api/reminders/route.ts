import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const now = new Date()
  const [all, due] = await Promise.all([
    prisma.herbReminder.findMany({
      where: { userId, reviewed: false },
      include: { herb: { select: { id: true, name: true, category: true } } },
      orderBy: { nextReviewAt: "asc" },
    }),
    prisma.herbReminder.count({
      where: { userId, reviewed: false, nextReviewAt: { lte: now } },
    }),
  ])

  return NextResponse.json({ reminders: all, dueCount: due })
}

export async function POST(req: Request) {
  try {
    const { userId, herbId } = await req.json()
    if (!userId || !herbId) return NextResponse.json({ error: "userId and herbId required" }, { status: 400 })

    // Mark as reviewed and set next review date
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 7)
    await prisma.herbReminder.update({
      where: { userId_herbId: { userId, herbId } },
      data: { reviewed: true, nextReviewAt: nextDate },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[Reminder]", e)
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}
