import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { applyCardRating, type CardRating } from "@/lib/srs"

export async function POST(req: Request) {
  try {
    const { userId, cardId, rating } = await req.json()
    if (!userId || !cardId || !rating) {
      return NextResponse.json({ error: "userId, cardId, rating required" }, { status: 400 })
    }

    const existing = await prisma.flashcardProgress.findUnique({
      where: { userId_cardId: { userId, cardId } },
    })

    const now = Date.now()
    const prev = existing
      ? { box: existing.box, dueAt: existing.dueAt.getTime(), reviews: existing.reviews, lastReviewedAt: existing.lastReviewedAt?.getTime() ?? null, lastRating: existing.lastRating as CardRating | null }
      : { box: 0, dueAt: now, reviews: 0, lastReviewedAt: null, lastRating: null }

    const next = applyCardRating(prev, rating as CardRating, now)

    const record = await prisma.flashcardProgress.upsert({
      where: { userId_cardId: { userId, cardId } },
      update: {
        box: next.box,
        dueAt: new Date(next.dueAt),
        reviews: next.reviews,
        lastReviewedAt: next.lastReviewedAt ? new Date(next.lastReviewedAt) : null,
        lastRating: next.lastRating,
      },
      create: {
        userId,
        cardId,
        box: next.box,
        dueAt: new Date(next.dueAt),
        reviews: next.reviews,
        lastReviewedAt: next.lastReviewedAt ? new Date(next.lastReviewedAt) : null,
        lastRating: next.lastRating,
      },
    })

    return NextResponse.json({
      cardId,
      progress: {
        box: record.box,
        dueAt: record.dueAt.getTime(),
        reviews: record.reviews,
        lastReviewedAt: record.lastReviewedAt?.getTime() ?? null,
        lastRating: record.lastRating,
      },
    })
  } catch (e) {
    console.error("[Flashcard Review]", e)
    return NextResponse.json({ error: "提交失败" }, { status: 500 })
  }
}
