import { prisma } from "@/lib/db"

export async function generateDailyTasks(userId: string) {
  const today = new Date().toISOString().split("T")[0]
  const existing = await prisma.userDailyTask.findMany({ where: { userId, date: today }, include: { dailyTask: true } })
  if (existing.length > 0) return existing.map(e => ({ id: e.id, title: e.dailyTask.title, description: e.dailyTask.description || "", type: e.dailyTask.taskType, target: JSON.parse(e.dailyTask.requirement || "{}").target || 1, progress: e.progress, completed: e.isCompleted, date: e.date, rewardExp: e.dailyTask.rewardExp, rewardPoints: e.dailyTask.rewardPoints }))

  const templates = await prisma.dailyTask.findMany()
  const shuffled = templates.sort(() => Math.random() - 0.5).slice(0, 3)
  const tasks = []
  for (const t of shuffled) {
    const ut = await prisma.userDailyTask.create({ data: { userId, dailyTaskId: t.id, date: today, progress: 0 } })
    tasks.push({ id: ut.id, title: t.title, description: t.description || "", type: t.taskType, target: JSON.parse(t.requirement || "{}").target || 1, progress: 0, completed: false, date: today, rewardExp: t.rewardExp, rewardPoints: t.rewardPoints })
  }
  return tasks
}

export async function completeDailyTask(userId: string, taskId: string) {
  const task = await prisma.userDailyTask.findUnique({ where: { id: taskId }, include: { dailyTask: true } })
  if (!task || task.isCompleted) throw new Error("Task not found or already completed")
  await prisma.userDailyTask.update({ where: { id: taskId }, data: { isCompleted: true, completedAt: new Date() } })
}

export async function checkDailyStreak(userId: string) {
  const today = new Date().toISOString().split("T")[0]
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { streak: 0, reward: { exp: 0, points: 0 } }
  const lastStr = user.lastStudyAt?.toISOString().split("T")[0]
  let streak = user.streak
  if (lastStr !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
    streak = lastStr === yesterday ? streak + 1 : 1
    await prisma.user.update({ where: { id: userId }, data: { streak } })
  }
  return { streak }
}
