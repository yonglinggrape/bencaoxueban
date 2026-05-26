import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { processAnswerReward, grantHerbCard } from "@/lib/game/rewards"
import { checkAchievements } from "@/lib/game/achievements"
import { findSimilarHerbs } from "@/lib/tcm/similar-herbs"
import { generateSimilarQuestions } from "@/lib/ai/question-generator"

export async function POST(req: Request) {
  try {
    const { userId, questionId, userAnswer, isCorrect, domainId, topicId } = await req.json()
    if (!userId || !questionId) return NextResponse.json({ error: "userId and questionId required" }, { status: 400 })

    const record = await prisma.answerRecord.create({
      data: { userId, questionId, userAnswer, isCorrect, domainId, topicId },
    })

    const result = await processAnswerReward(userId, "medium", isCorrect, false)
    const newAchievements = await checkAchievements(userId)

    // Random herb card drop on correct answer
    let herbCard: { id: string; name: string; rarity: string } | null = null

    if (isCorrect && Math.random() < 0.3) {
      const herbs = await prisma.herbCard.findMany({ take: 50 })
      if (herbs.length > 0) {
        const herb = herbs[Math.floor(Math.random() * herbs.length)]
        await grantHerbCard(userId, herb.id)
        herbCard = { id: herb.id, name: herb.name, rarity: herb.rarity }
      }
    }

    // Wrong answer → AI generate similar-herb questions
    let similarQuestions: Record<string, unknown>[] = []

    if (!isCorrect && topicId) {
      try {
        // Get the question and its topic
        const question = await prisma.question.findUnique({
          where: { id: questionId },
          include: { topic: true },
        })

        if (question?.topic) {
          const topicName = question.topic.name
          const similarHerbs = findSimilarHerbs(topicName, "", 4)

          if (similarHerbs.length > 0) {
            const herbNames = similarHerbs.map(h => h.name)
            const generated = await generateSimilarQuestions(topicName, herbNames, question.content, 3)

            // Save generated questions to DB
            for (const gq of generated) {
              const saved = await prisma.question.create({
                data: {
                  content: gq.content,
                  questionType: gq.questionType,
                  options: JSON.stringify(gq.options),
                  correctAnswer: gq.correctAnswer,
                  explanation: gq.explanation,
                  domainId: domainId || "HERBOLOGY",
                  topicId: topicId,
                  difficulty: gq.difficulty,
                  isAiGenerated: true,
                  sourceQuestionId: questionId,
                  generatedForCategory: topicName,
                },
              })
              similarQuestions.push({
                id: saved.id,
                content: saved.content,
                options: gq.options,
                correctAnswer: saved.correctAnswer,
                explanation: saved.explanation,
                difficulty: saved.difficulty,
                generatedForCategory: topicName,
              })
            }

            // Auto-create PlanTasks for generated questions
            try {
              let plan = await prisma.learningPlan.findFirst({
                where: { userId, isActive: true },
              })
              if (!plan) {
                const today = new Date()
                const endDate = new Date(today)
                endDate.setDate(endDate.getDate() + 7)
                plan = await prisma.learningPlan.create({
                  data: {
                    userId,
                    title: "巩固练习计划",
                    description: "基于错题AI生成的同类药材练习",
                    startDate: today.toISOString().slice(0, 10),
                    endDate: endDate.toISOString().slice(0, 10),
                    isActive: true,
                  },
                })
              }
              for (let i = 0; i < generated.length; i++) {
                const gq = generated[i]
                const taskDate = new Date()
                taskDate.setDate(taskDate.getDate() + i)
                await prisma.planTask.create({
                  data: {
                    planId: plan.id,
                    title: `同类药材巩固: ${topicName}`,
                    description: gq.content.slice(0, 100),
                    domainId: domainId || "HERBOLOGY",
                    topicId: topicId,
                    category: topicName,
                    taskType: "practice",
                    scheduledDate: taskDate.toISOString().slice(0, 10),
                    sortOrder: i,
                  },
                })
              }
            } catch (e) {
              console.error("[Quiz Submit] Auto plan task creation failed:", e)
              // Non-critical
            }
          }
        }
      } catch (e) {
        console.error("[Quiz Submit] AI similar question generation failed:", e)
        // Non-critical, continue without similar questions
      }
    }

    return NextResponse.json({
      record,
      levelUp: result.leveledUp,
      newAchievements,
      herbCard,
      similarQuestions,
    })
  } catch (e) {
    console.error("[Quiz Submit]", e)
    return NextResponse.json({ error: "提交失败" }, { status: 500 })
  }
}
