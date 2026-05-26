import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { grantExp, grantPoints } from "@/lib/game/rewards"

export async function POST(req: Request) {
  try {
    const { userId, taskId } = await req.json()
    if (!userId || !taskId) return NextResponse.json({ error: "userId and taskId required" }, { status: 400 })

    const task = await prisma.planTask.findUnique({ where: { id: taskId } })
    if (!task) return NextResponse.json({ error: "task not found" }, { status: 404 })
    if (task.isCompleted) return NextResponse.json({ error: "task already completed" }, { status: 400 })

    await prisma.planTask.update({
      where: { id: taskId },
      data: { isCompleted: true, completedAt: new Date() },
    })

    // Grant XP for completing a learning plan task
    const reward = await grantExp(userId, 20)
    await grantPoints(userId, 5, "完成学习计划任务", "plan")

    return NextResponse.json({ completed: true, levelUp: reward.leveledUp })
  } catch (e) {
    console.error("[Plan Complete]", e)
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}
