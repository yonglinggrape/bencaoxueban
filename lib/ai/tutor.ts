import { deepseekChat, hasDeepSeekKey } from "./client"
import { TUTOR_PROMPT } from "./prompts"
import { diagnoseWeakPoints } from "./diagnosis"
import { prisma } from "@/lib/db"

export interface UserContext { userId: string; userName: string; level: number; exp: number }
export interface ChatMessage { id: string; sessionId: string; role: string; content: string; createdAt: string }
export interface ChatSession { id: string; userId: string; title: string; messages: ChatMessage[]; createdAt: string; updatedAt: string }

async function ensureSession(sessionId: string, userId: string): Promise<void> {
  const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } })
  if (!existing) {
    await prisma.chatSession.create({ data: { id: sessionId, userId, title: "学习对话" } })
  }
}

export async function chatWithTutor(sessionId: string, message: string, context: UserContext): Promise<string> {
  await ensureSession(sessionId, context.userId)
  await prisma.chatMessage.create({ data: { sessionId, role: "user", content: message } })

  if (!hasDeepSeekKey()) {
    const fallback = `${context.userName}同学，当前还没有配置 DeepSeek API Key。请先配置 DEEPSEEK_API_KEY 后再使用 AI 导师。`
    await prisma.chatMessage.create({ data: { sessionId, role: "assistant", content: fallback } })
    return fallback
  }

  try {
    let diagInfo = ""
    try { diagInfo = (await diagnoseWeakPoints(context.userId)).overallAssessment } catch { /* non-critical */ }

    const history = await prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" }, take: 20 })
    const systemPrompt = `${TUTOR_PROMPT}\n\n当前学生：${context.userName}，等级：Lv.${context.level}。${diagInfo}`
    const reply = await deepseekChat([
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    ], 2048)

    await prisma.chatMessage.create({ data: { sessionId, role: "assistant", content: reply } })
    await prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })
    return reply
  } catch (e) {
    console.error("[Tutor] DeepSeek failed:", e)
    const fallback = "本草助手暂时无法连接 DeepSeek，请稍后重试。"
    await prisma.chatMessage.create({ data: { sessionId, role: "assistant", content: fallback } })
    return fallback
  }
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const msgs = await prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } })
  return msgs.map(m => ({ id: m.id, sessionId: m.sessionId, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() }))
}

export async function createChatSession(userId: string, title = "学习对话"): Promise<ChatSession> {
  const s = await prisma.chatSession.create({ data: { userId, title } })
  return { id: s.id, userId: s.userId, title: s.title, messages: [], createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() }
}
