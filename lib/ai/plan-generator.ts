import { deepseekChat, hasDeepSeekKey } from "./client"
import { PLAN_GENERATION_PROMPT } from "./prompts"
import { diagnoseWeakPoints } from "./diagnosis"
import { prisma } from "@/lib/db"

export interface PlanTask { id: string; title: string; description: string; category: string; topicId: string; taskType: string; duration: number; completed: boolean }
export interface PlanDay { date: string; tasks: PlanTask[] }
export interface LearningPlan { id: string; userId: string; weekStart: string; weekEnd: string; days: PlanDay[]; isActive: boolean; createdAt: string }

function parseAIJson(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

function getWeekRange(weeksAhead = 0) {
  const now = new Date()
  const offset = now.getDay() === 0 ? -6 : 1 - now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() + offset + weeksAhead * 7)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { start: mon.toISOString().split("T")[0], end: sun.toISOString().split("T")[0] }
}

function dateStrings(start: string): string[] {
  const d = new Date(start)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d); dd.setDate(d.getDate() + i)
    return dd.toISOString().split("T")[0]
  })
}

export async function generateLearningPlan(userId: string, weeksAhead = 0) {
  const diagnosis = await diagnoseWeakPoints(userId)
  const { start, end } = getWeekRange(weeksAhead)
  const dates = dateStrings(start)

  let days: PlanDay[] = []

  if (hasDeepSeekKey()) {
    try {
      const text = await deepseekChat([
        { role: "system", content: PLAN_GENERATION_PROMPT },
        { role: "user", content: JSON.stringify({ weakCategories: diagnosis.weakCategories.slice(0, 3), weakTopics: diagnosis.weakTopics.slice(0, 5), week: `${start} ~ ${end}` }) },
      ], 4096)
      const ai = parseAIJson(text)
      if (ai) {
        days = ((ai.weeklyPlan as Record<string, unknown>)?.days as Array<Record<string, unknown>> || []).map((d: Record<string, unknown>) => ({
          date: d.date as string,
          tasks: ((d.tasks as Array<Record<string, unknown>>) || []).map((t: Record<string, unknown>, i: number) => ({ id: `task-${d.date}-${i}`, title: t.title as string, description: (t.description as string) || "", category: (t.category as string) || "中药学", topicId: (t.topicId as string) || "general", taskType: (t.taskType as string) || "study", duration: (t.duration as number) || 30, completed: false })),
        }))
      }
    } catch (e) { console.error("[PlanGen] AI failed:", e) }
  }

  // Fallback
  if (days.length === 0) {
    const topics = diagnosis.weakTopics.slice(0, 5)
    days = dates.map((d, i) => {
      const t = topics[i % topics.length]
      return {
        date: d,
        tasks: [
          { id: `${d}-1`, title: t ? `学习${t.topicName}` : "中药学基础复习", description: "系统学习相关药材知识", category: t?.category || "中药学", topicId: t?.topicId || "general", taskType: "study", duration: 30, completed: false },
          { id: `${d}-2`, title: "专项练习", description: "完成针对性练习题目", category: t?.category || "中药学", topicId: t?.topicId || "general", taskType: "practice", duration: 20, completed: false },
        ],
      }
    })
  }

  const plan = await prisma.learningPlan.create({
    data: {
      userId, title: `第${weeksAhead + 1}周学习计划`, startDate: start, endDate: end, isActive: true,
      tasks: { create: days.flatMap(d => d.tasks.map(t => ({ title: t.title, description: t.description, category: t.category, topicId: t.topicId, taskType: t.taskType, scheduledDate: d.date, sortOrder: 0 }))) },
    },
    include: { tasks: true },
  })

  const resultDays = days.map(d => {
    const dayTasks = d.tasks.map(t => {
      const found = plan.tasks.find(pt => pt.title === t.title && pt.scheduledDate === d.date)
      return { id: found?.id || t.id, title: t.title, description: t.description, category: t.category, topicId: t.topicId, taskType: t.taskType, duration: t.duration, completed: false }
    })
    return { date: d.date, tasks: dayTasks }
  })

  return { id: plan.id, userId: plan.userId, weekStart: plan.startDate, weekEnd: plan.endDate, days: resultDays, isActive: plan.isActive, createdAt: plan.createdAt.toISOString() }
}

export async function getActivePlan(userId: string) {
  const plan = await prisma.learningPlan.findFirst({ where: { userId, isActive: true }, include: { tasks: true }, orderBy: { createdAt: "desc" } })
  if (!plan) return null
  const dayMap = new Map<string, PlanTask[]>()
  for (const t of plan.tasks) {
    if (!dayMap.has(t.scheduledDate)) dayMap.set(t.scheduledDate, [])
    dayMap.get(t.scheduledDate)!.push({ id: t.id, title: t.title, description: t.description || "", category: (t as Record<string, unknown>).category as string || "", topicId: (t as Record<string, unknown>).topicId as string || "", taskType: t.taskType, duration: 30, completed: t.isCompleted })
  }
  return { id: plan.id, userId: plan.userId, weekStart: plan.startDate, weekEnd: plan.endDate, days: Array.from(dayMap.entries()).map(([date, tasks]) => ({ date, tasks })), isActive: plan.isActive, createdAt: plan.createdAt.toISOString() }
}
