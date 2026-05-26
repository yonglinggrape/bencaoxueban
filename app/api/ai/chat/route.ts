import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { chatWithTutor, getChatHistory, createChatSession } from "@/lib/ai/tutor"

export async function POST(req: Request) {
  const { sessionId, message, context } = await req.json()
  if (!message || !context?.userId) return NextResponse.json({ error: "message and context.userId required" }, { status: 400 })
  const isNewSession = !sessionId
  const sid = sessionId || `session-${Date.now()}`
  const reply = await chatWithTutor(sid, message, context)

  // Auto-generate title for new sessions from first message
  if (isNewSession) {
    const title = message.slice(0, 20) + (message.length > 20 ? "…" : "")
    await prisma.chatSession.update({ where: { id: sid }, data: { title } })
  }

  // Get the latest assistant message id for deletion support
  const lastMsg = await prisma.chatMessage.findFirst({
    where: { sessionId: sid, role: "assistant" },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ sessionId: sid, reply, messageId: lastMsg?.id })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 })
  return NextResponse.json({ sessionId, messages: await getChatHistory(sessionId) })
}
