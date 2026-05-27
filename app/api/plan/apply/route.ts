import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getActivePlan } from "@/lib/ai/plan-generator"

type PlanOperation = {
  action: "create" | "update" | "delete" | "replace_plan"
  taskId?: string
  title?: string
  description?: string
  taskType?: string
  scheduledDate?: string
  isCompleted?: boolean
}

function oneWeekRange() {
  const start = new Date().toISOString().slice(0, 10)
  const end = new Date()
  end.setDate(end.getDate() + 6)
  return { start, end: end.toISOString().slice(0, 10) }
}

async function findOrCreatePlan(userId: string) {
  const existing = await prisma.learningPlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
  })
  if (existing) return existing

  const { start, end } = oneWeekRange()
  return prisma.learningPlan.create({
    data: {
      userId,
      title: "聊天制定学习计划",
      description: "由计划助手根据对话生成",
      startDate: start,
      endDate: end,
      isActive: true,
    },
  })
}

export async function POST(req: Request) {
  try {
    const { userId, operations } = await req.json()
    if (!userId || !Array.isArray(operations)) {
      return NextResponse.json({ error: "userId and operations required" }, { status: 400 })
    }

    const plan = await findOrCreatePlan(userId)
    const validTaskIds = new Set(
      (await prisma.planTask.findMany({ where: { planId: plan.id }, select: { id: true } }))
        .map(t => t.id)
    )

    if ((operations as PlanOperation[]).some(op => op.action === "replace_plan")) {
      await prisma.planTask.deleteMany({ where: { planId: plan.id } })
      validTaskIds.clear()
    }

    for (let i = 0; i < (operations as PlanOperation[]).length; i++) {
      const op = (operations as PlanOperation[])[i]
      if (op.action === "replace_plan") continue

      if (op.action === "create") {
        if (!op.title || !op.scheduledDate) continue
        await prisma.planTask.create({
          data: {
            planId: plan.id,
            title: op.title,
            description: op.description || "",
            taskType: op.taskType || "study",
            scheduledDate: op.scheduledDate,
            sortOrder: i,
          },
        })
        continue
      }

      if (!op.taskId || !validTaskIds.has(op.taskId)) continue

      if (op.action === "delete") {
        await prisma.planTask.delete({ where: { id: op.taskId } })
        validTaskIds.delete(op.taskId)
        continue
      }

      if (op.action === "update") {
        await prisma.planTask.update({
          where: { id: op.taskId },
          data: {
            ...(op.title ? { title: op.title } : {}),
            ...(typeof op.description === "string" ? { description: op.description } : {}),
            ...(op.taskType ? { taskType: op.taskType } : {}),
            ...(op.scheduledDate ? { scheduledDate: op.scheduledDate } : {}),
            ...(typeof op.isCompleted === "boolean"
              ? { isCompleted: op.isCompleted, completedAt: op.isCompleted ? new Date() : null }
              : {}),
          },
        })
      }
    }

    return NextResponse.json({ applied: true, plan: await getActivePlan(userId) })
  } catch (e) {
    console.error("[Plan Apply]", e)
    return NextResponse.json({ error: "应用计划草案失败" }, { status: 500 })
  }
}
