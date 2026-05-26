import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateSimilarQuestions } from "@/lib/ai/question-generator"
import { findSimilarHerbs } from "@/lib/tcm/similar-herbs"

export async function POST(req: Request) {
  try {
    const { topicName, originalQuestionContent, topicId, count } = await req.json()
    if (!topicName || !originalQuestionContent) {
      return NextResponse.json({ error: "topicName and originalQuestionContent required" }, { status: 400 })
    }

    const domain = await prisma.knowledgeDomain.findUnique({ where: { slug: "herbology" } })
    const domainId = domain?.id || "HERBOLOGY"

    const similarHerbs = findSimilarHerbs(topicName, "", 4)
    const herbNames = similarHerbs.map(h => h.name)

    const generated = await generateSimilarQuestions(
      topicName,
      herbNames.length > 0 ? herbNames : [topicName],
      originalQuestionContent,
      count || 3
    )

    if (generated.length === 0) {
      return NextResponse.json({ questions: [], count: 0 })
    }

    const savedQuestions = []
    for (const gq of generated) {
      const saved = await prisma.question.create({
        data: {
          content: gq.content,
          questionType: gq.questionType,
          options: JSON.stringify(gq.options),
          correctAnswer: gq.correctAnswer,
          explanation: gq.explanation,
          domainId,
          topicId: topicId || null,
          difficulty: gq.difficulty,
          isAiGenerated: true,
          generatedForCategory: topicName,
        },
      })
      savedQuestions.push({
        id: saved.id,
        content: saved.content,
        options: gq.options,
        correctAnswer: saved.correctAnswer,
        explanation: saved.explanation,
        difficulty: saved.difficulty,
        generatedForCategory: topicName,
      })
    }

    return NextResponse.json({ questions: savedQuestions, count: savedQuestions.length })
  } catch (e) {
    console.error("[Similar Questions API]", e)
    return NextResponse.json({ error: "生成失败" }, { status: 500 })
  }
}
