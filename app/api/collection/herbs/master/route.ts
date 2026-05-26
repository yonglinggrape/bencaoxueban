import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(req: Request) {
  try {
    const { userId, herbId, mastered } = await req.json()
    if (!userId || !herbId) return NextResponse.json({ error: "userId and herbId required" }, { status: 400 })

    const existing = await prisma.userHerb.findUnique({ where: { userId_herbId: { userId, herbId } } })
    if (!existing) {
      // Auto-create UserHerb entry if user hasn't collected it yet
      await prisma.userHerb.create({
        data: { userId, herbId, mastered, masteredAt: mastered ? new Date() : null },
      })
    } else {
      await prisma.userHerb.update({
        where: { id: existing.id },
        data: { mastered, masteredAt: mastered ? new Date() : null },
      })
    }

    // Manage reminder
    if (mastered) {
      const reviewDate = new Date()
      reviewDate.setDate(reviewDate.getDate() + 7) // default 7 days
      await prisma.herbReminder.upsert({
        where: { userId_herbId: { userId, herbId } },
        update: { masteredAt: new Date(), nextReviewAt: reviewDate, reviewed: false },
        create: { userId, herbId, masteredAt: new Date(), nextReviewAt: reviewDate, intervalDays: 7 },
      })
    } else {
      await prisma.herbReminder.deleteMany({ where: { userId, herbId } })
    }

    return NextResponse.json({ mastered })
  } catch (e) {
    console.error("[Herb Master]", e)
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}
