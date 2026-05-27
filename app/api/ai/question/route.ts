import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateQuestions } from "@/lib/ai/question-generator"

export async function POST(req: Request) {
  try {
    const { topicId, count, weakTopics, herbName, topicName, saveToDb } = await req.json()

    const domain = await prisma.knowledgeDomain.findUnique({ where: { slug: "herbology" } })
    const domainId = domain?.id || "HERBOLOGY"

    const context = herbName
      ? `中药: ${herbName}${topicName ? `, 章节: ${topicName}` : ""}`
      : topicName
        ? `章节: ${topicName}`
        : undefined
    const questions = await generateQuestions(domainId, topicId || "general", count || 5, weakTopics || [], context)

    if (saveToDb) {
      const saved = []
      for (const q of questions) {
        const s = await prisma.question.create({
          data: {
            content: q.content,
            questionType: q.questionType,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            domainId,
            topicId: topicId || null,
            difficulty: q.difficulty,
            isAiGenerated: true,
          },
        })
        saved.push({ ...q, id: s.id })
      }
      return NextResponse.json({ questions: saved, count: saved.length })
    }

    return NextResponse.json({ questions })
  } catch (e) {
    console.error("[AI Question API]", e)
    return NextResponse.json({ error: "生成失败" }, { status: 500 })
  }
}
