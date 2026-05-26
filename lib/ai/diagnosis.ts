import { deepseekChat, hasDeepSeekKey } from "./client"
import { DIAGNOSIS_SYSTEM_PROMPT } from "./prompts"
import { prisma } from "@/lib/db"

export interface DiagnosisResult {
  userId: string
  weakCategories: { category: string; errorRate: number; totalQuestions: number }[]
  weakTopics: { topicId: string; topicName: string; category: string; errorRate: number; totalQuestions: number }[]
  overallAssessment: string
  suggestions: string[]
  diagnosedAt: string
}

function parseAIJson(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

export async function diagnoseWeakPoints(userId: string): Promise<DiagnosisResult> {
  try {
    const records = await prisma.answerRecord.findMany({
      where: { userId },
      include: { question: { include: { topic: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    const categoryMap = new Map<string, { correct: number; total: number; topics: Map<string, { name: string; correct: number; total: number }> }>()
    for (const r of records) {
      const category = r.question.generatedForCategory || r.question.topic?.name || "中药学"
      if (!categoryMap.has(category)) categoryMap.set(category, { correct: 0, total: 0, topics: new Map() })
      const cm = categoryMap.get(category)!
      cm.total++
      if (r.isCorrect) cm.correct++
      if (r.question.topic) {
        const tId = r.question.topic.id
        if (!cm.topics.has(tId)) cm.topics.set(tId, { name: r.question.topic.name, correct: 0, total: 0 })
        const tm = cm.topics.get(tId)!
        tm.total++
        if (r.isCorrect) tm.correct++
      }
    }

    const weakCategories: DiagnosisResult["weakCategories"] = []
    const weakTopics: DiagnosisResult["weakTopics"] = []
    for (const [cat, c] of categoryMap) {
      weakCategories.push({ category: cat, errorRate: c.total > 0 ? 1 - c.correct / c.total : 0, totalQuestions: c.total })
      for (const [tId, t] of c.topics) {
        weakTopics.push({ topicId: tId, topicName: t.name, category: cat, errorRate: t.total > 0 ? 1 - t.correct / t.total : 0, totalQuestions: t.total })
      }
    }
    weakCategories.sort((a, b) => b.errorRate - a.errorRate)
    weakTopics.sort((a, b) => b.errorRate - a.errorRate)

    if (records.length === 0) {
      return { userId, weakCategories: [], weakTopics: [], overallAssessment: "暂无答题记录。建议先从常见的解表药和清热药开始学习。", suggestions: ["学习常见解表药", "认识常用清热药", "掌握补虚药的基础知识"], diagnosedAt: new Date().toISOString() }
    }

    if (hasDeepSeekKey()) {
      try {
        const summary = records.slice(0, 50).map(r => `${r.question.generatedForCategory || r.question.topic?.name || "中药学"}/${r.question.topic?.name || ""}: ${r.isCorrect ? "O" : "X"}`).join("\n")
        const text = await deepseekChat([
          { role: "system", content: DIAGNOSIS_SYSTEM_PROMPT },
          { role: "user", content: `答题记录：\n${summary}\n请分析薄弱点，输出JSON。` },
        ], 2048)
        const ai = parseAIJson(text)
        if (ai) {
          return { userId, weakCategories: (ai.weakCategories as DiagnosisResult["weakCategories"]) || weakCategories, weakTopics: (ai.weakTopics as DiagnosisResult["weakTopics"]) || weakTopics, overallAssessment: ai.overallAssessment as string || "", suggestions: ai.suggestions as string[] || [], diagnosedAt: new Date().toISOString() }
        }
      } catch (e) { console.error("[Diagnosis] AI failed:", e) }
    }

    const top = weakCategories[0]
    return { userId, weakCategories, weakTopics, overallAssessment: top ? `最薄弱类别：${top.category}，错误率${(top.errorRate * 100).toFixed(0)}%。` : "表现均衡。", suggestions: top ? [`重点复习「${top.category}」`, "每日专项练习", "参考《中药学》教材"] : ["继续保持", "挑战高难度"], diagnosedAt: new Date().toISOString() }
  } catch (e) {
    console.error("[Diagnosis]", e)
    return { userId, weakCategories: [], weakTopics: [], overallAssessment: "诊断暂不可用", suggestions: [], diagnosedAt: new Date().toISOString() }
  }
}
