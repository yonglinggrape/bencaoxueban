import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { userId, tasks } = await req.json()
    if (!userId || !tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: "userId and tasks array required" }, { status: 400 })
    }

    // Find or create an active learning plan
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
          description: "基于错题AI生成的同类药材练习计划",
          startDate: today.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
          isActive: true,
        },
      })
    }

    // Create plan tasks
    const createdTasks = []
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i]
      const task = await prisma.planTask.create({
        data: {
          planId: plan.id,
          title: t.title || "同类药材练习",
          description: t.description || "",
          domainId: t.domainId || "HERBOLOGY",
          topicId: t.topicId || null,
          taskType: t.taskType || "practice",
          scheduledDate: t.scheduledDate || new Date().toISOString().slice(0, 10),
          sortOrder: i,
        },
      })
      createdTasks.push(task)
    }

    return NextResponse.json({ plan, tasks: createdTasks })
  } catch (e) {
    console.error("[Plan Tasks]", e)
    return NextResponse.json({ error: "创建任务失败" }, { status: 500 })
  }
}
