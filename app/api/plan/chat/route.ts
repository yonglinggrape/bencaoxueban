import { NextResponse } from "next/server"
import { deepseekChat, hasDeepSeekKey } from "@/lib/ai/client"
import { getActivePlan } from "@/lib/ai/plan-generator"
import { prisma } from "@/lib/db"

type PlanOperation = {
  action: "create" | "update" | "delete" | "replace_plan"
  taskId?: string
  title?: string
  description?: string
  taskType?: string
  scheduledDate?: string
  isCompleted?: boolean
  reason?: string
}

function parseProposal(text: string): { reply: string; operations: PlanOperation[] } | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as { reply?: unknown; operations?: unknown }
    if (!Array.isArray(parsed.operations)) return null
    return {
      reply: typeof parsed.reply === "string" ? parsed.reply : "我已经整理好计划调整草案。",
      operations: parsed.operations
        .filter((op): op is PlanOperation => typeof op === "object" && op !== null && "action" in op)
        .map(op => op as PlanOperation),
    }
  } catch {
    return null
  }
}

async function ensurePlanChatSession(userId: string, sessionId?: string) {
  if (sessionId) {
    const existing = await prisma.chatSession.findFirst({ where: { id: sessionId, userId } })
    if (existing) return existing.id
  }

  const existing = await prisma.chatSession.findFirst({
    where: { userId, title: "学习计划助手" },
    orderBy: { updatedAt: "desc" },
  })
  if (existing) return existing.id

  const created = await prisma.chatSession.create({ data: { userId, title: "学习计划助手" } })
  return created.id
}

export async function POST(req: Request) {
  try {
    const { userId, message, sessionId } = await req.json()
    if (!userId || !message) {
      return NextResponse.json({ error: "userId and message required" }, { status: 400 })
    }
    if (!hasDeepSeekKey()) {
      return NextResponse.json({ error: "DeepSeek API key not configured" }, { status: 503 })
    }

    const activePlan = await getActivePlan(userId)
    const sid = await ensurePlanChatSession(userId, sessionId)
    await prisma.chatMessage.create({ data: { sessionId: sid, role: "user", content: message } })

    const history = await prisma.chatMessage.findMany({
      where: { sessionId: sid },
      orderBy: { createdAt: "asc" },
      take: 12,
    })

    const systemPrompt = `你是中药学学习计划助手。请根据用户要求调整学习计划，但只输出JSON，不要输出Markdown。
输出格式：
{
  "reply": "给学生看的简短说明",
  "operations": [
    {
      "action": "create|update|delete|replace_plan",
      "taskId": "更新或删除时填写现有任务id",
      "title": "任务标题",
      "description": "任务说明",
      "taskType": "study|practice|quiz|review",
      "scheduledDate": "YYYY-MM-DD",
      "isCompleted": false,
      "reason": "为什么这样调整"
    }
  ]
}
规则：
1. 不要直接声称已经修改计划，只说这是调整草案。
2. 有现有任务id时，update/delete必须使用现有taskId。
3. 新增任务必须给出title、description、taskType、scheduledDate。
4. 用户要求重做整周计划时使用replace_plan，并在operations中给出一组create式任务。
5. 日期必须落在当前计划周内；没有计划时从今天起安排7天。`

    const text = await deepseekChat([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          currentPlan: activePlan,
          today: new Date().toISOString().slice(0, 10),
          conversation: history.map(m => ({ role: m.role, content: m.content })),
          latestMessage: message,
        }),
      },
    ], 4096)

    const proposal = parseProposal(text)
    if (!proposal || proposal.operations.length === 0) {
      return NextResponse.json({ error: "AI did not return a valid plan proposal" }, { status: 502 })
    }

    await prisma.chatMessage.create({ data: { sessionId: sid, role: "assistant", content: proposal.reply } })
    await prisma.chatSession.update({ where: { id: sid }, data: { updatedAt: new Date() } })

    return NextResponse.json({ sessionId: sid, reply: proposal.reply, proposal })
  } catch (e) {
    console.error("[Plan Chat]", e)
    return NextResponse.json({ error: "生成计划草案失败" }, { status: 500 })
  }
}
