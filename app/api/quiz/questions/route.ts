import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") || "random"
  const topicIds = req.nextUrl.searchParams.get("topicIds")?.split(",").filter(Boolean) || []
  const userId = req.nextUrl.searchParams.get("userId")
  const count = Math.min(parseInt(req.nextUrl.searchParams.get("count") || "8"), 50)
  const difficulty = req.nextUrl.searchParams.get("difficulty")

  const where: Record<string, unknown> = {}
  if (difficulty && difficulty !== "all") where.difficulty = difficulty
  if (topicIds.length > 0 && mode === "chapter") {
    where.topicId = { in: topicIds }
  }

  let questions

  if (mode === "mistake" && userId) {
    // Find question IDs the user answered wrong
    const wrongRecords = await prisma.answerRecord.findMany({
      where: { userId, isCorrect: false },
      select: { questionId: true },
      distinct: ["questionId"],
    })
    const wrongIds = wrongRecords.map(r => r.questionId)
    if (wrongIds.length === 0) {
      return NextResponse.json({ questions: [] })
    }
    where.id = { in: wrongIds }
    questions = await prisma.question.findMany({
      where,
      take: count,
      orderBy: { createdAt: "desc" },
    })
  } else {
    // Random or chapter mode
    questions = await prisma.question.findMany({
      where,
      take: count,
      orderBy: { createdAt: "desc" },
    })
  }

  // Shuffle questions for random/mistake modes
  if (mode === "random" || mode === "mistake") {
    questions = questions.sort(() => Math.random() - 0.5)
  }

  const formatted = questions.map(q => ({
    id: q.id, domainId: q.domainId, topicId: q.topicId || "",
    content: q.content, questionType: q.questionType,
    options: JSON.parse(q.options), correctAnswer: q.correctAnswer,
    explanation: q.explanation, difficulty: q.difficulty,
  }))

  return NextResponse.json({ questions: formatted })
}
