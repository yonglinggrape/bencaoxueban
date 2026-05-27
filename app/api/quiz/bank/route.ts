import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const topicId = req.nextUrl.searchParams.get("topicId")
  const source = req.nextUrl.searchParams.get("source") || "all"
  const search = req.nextUrl.searchParams.get("search")
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "500", 10), 1000)

  const where: Record<string, unknown> = {}
  if (topicId && topicId !== "all") where.topicId = topicId
  if (source === "ai") where.isAiGenerated = true
  if (source === "bank") where.isAiGenerated = false
  if (search) where.content = { contains: search }

  const questions = await prisma.question.findMany({
    where,
    take: limit,
    orderBy: [{ topic: { name: "asc" } }, { createdAt: "desc" }],
    include: { topic: { select: { id: true, name: true } } },
  })

  return NextResponse.json({
    questions: questions.map(q => ({
      id: q.id,
      domainId: q.domainId,
      topicId: q.topicId || "",
      topicName: q.topic?.name || "综合",
      content: q.content,
      questionType: q.questionType,
      options: JSON.parse(q.options),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      isAiGenerated: q.isAiGenerated,
      createdAt: q.createdAt.toISOString(),
    })),
  })
}
