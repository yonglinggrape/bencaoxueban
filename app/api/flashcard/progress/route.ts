import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const records = await prisma.flashcardProgress.findMany({ where: { userId } })
  const progress: Record<string, { box: number; dueAt: number; reviews: number; lastReviewedAt: number | null; lastRating: string | null }> = {}
  for (const r of records) {
    progress[r.cardId] = {
      box: r.box,
      dueAt: r.dueAt.getTime(),
      reviews: r.reviews,
      lastReviewedAt: r.lastReviewedAt?.getTime() ?? null,
      lastRating: r.lastRating,
    }
  }

  return NextResponse.json({ progress })
}
