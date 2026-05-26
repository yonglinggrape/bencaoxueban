import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  const topicId = req.nextUrl.searchParams.get("topicId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const where: Record<string, unknown> = { userId, isCorrect: false, resolved: false }
  if (topicId) where.topicId = topicId

  const records = await prisma.answerRecord.findMany({
    where,
    include: {
      question: {
        include: { topic: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Group by topic
  const groups: Record<string, {
    topicId: string
    topicName: string
    count: number
    mistakes: Array<{
      id: string
      questionId: string
      content: string
      options: { label: string; text: string }[]
      correctAnswer: string
      userAnswer: string
      explanation: string | null
      createdAt: string
    }>
  }> = {}

  for (const r of records) {
    const tId = r.topicId || "unknown"
    const tName = r.question.topic?.name || "综合"
    if (!groups[tId]) {
      groups[tId] = { topicId: tId, topicName: tName, count: 0, mistakes: [] }
    }
    groups[tId].count++
    groups[tId].mistakes.push({
      id: r.id,
      questionId: r.questionId,
      content: r.question.content,
      options: JSON.parse(r.question.options),
      correctAnswer: r.question.correctAnswer,
      userAnswer: r.userAnswer,
      explanation: r.question.explanation,
      createdAt: r.createdAt.toISOString(),
    })
  }

  return NextResponse.json({
    groups: Object.values(groups),
    total: records.length,
  })
}

export async function PATCH(req: Request) {
  try {
    const { ids } = await req.json()
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 })
    }

    await prisma.answerRecord.updateMany({
      where: { id: { in: ids } },
      data: { resolved: true },
    })

    return NextResponse.json({ resolved: ids.length })
  } catch (e) {
    console.error("[Mistakes PATCH]", e)
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}
