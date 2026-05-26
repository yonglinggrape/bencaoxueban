import { anthropic, hasAnthropicKey } from "./client"
import { TUTOR_PROMPT } from "./prompts"
import { diagnoseWeakPoints } from "./diagnosis"
import { prisma } from "@/lib/db"

export interface UserContext { userId: string; userName: string; level: number; exp: number }
export interface ChatMessage { id: string; sessionId: string; role: string; content: string; createdAt: string }
export interface ChatSession { id: string; userId: string; title: string; messages: ChatMessage[]; createdAt: string; updatedAt: string }

function extractText(resp: { content: unknown[] }): string {
  for (const b of resp.content) {
    const block = b as Record<string, unknown>
    if (block.type === "text" && typeof block.text === "string") return block.text as string
  }
  return ""
}

async function ensureSession(sessionId: string, userId: string): Promise<void> {
  const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } })
  if (!existing) {
    await prisma.chatSession.create({ data: { id: sessionId, userId, title: "学习对话" } })
  }
}

export async function chatWithTutor(sessionId: string, message: string, context: UserContext): Promise<string> {
  await ensureSession(sessionId, context.userId)

  await prisma.chatMessage.create({ data: { sessionId, role: "user", content: message } })

  if (!hasAnthropicKey()) {
    const mockReply = `${context.userName}同学，你的问题很好！你现在是 Lv.${context.level}。中药学讲究四气五味、升降浮沉，辨证用药是核心方法论。`
    await prisma.chatMessage.create({ data: { sessionId, role: "assistant", content: mockReply } })
    return mockReply
  }

  try {
    let diagInfo = ""
    try { diagInfo = (await diagnoseWeakPoints(context.userId)).overallAssessment } catch { /* */ }

    const history = await prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" }, take: 20 })
    const systemPrompt = TUTOR_PROMPT +
      `\n\n当前学生：${context.userName}，等级：Lv.${context.level}。${diagInfo}`

    const resp = await anthropic!.messages.create({
      model: "claude-sonnet-4-6-20250514", max_tokens: 2048,
      system: systemPrompt,
      messages: history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    })
    const reply = extractText(resp)
    await prisma.chatMessage.create({ data: { sessionId, role: "assistant", content: reply } })
    await prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })
    return reply
  } catch (e) { console.error("[Tutor] AI failed:", e); return "本草助手暂时无法回应，请稍后再试。" }
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const msgs = await prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } })
  return msgs.map(m => ({ id: m.id, sessionId: m.sessionId, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() }))
}

export async function createChatSession(userId: string, title = "学习对话"): Promise<ChatSession> {
  const s = await prisma.chatSession.create({ data: { userId, title } })
  return { id: s.id, userId: s.userId, title: s.title, messages: [], createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() }
}
