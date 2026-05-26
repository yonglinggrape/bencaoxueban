import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  })

  return NextResponse.json({
    sessions: sessions.map(s => ({
      id: s.id,
      title: s.title,
      updatedAt: s.updatedAt,
      messageCount: s._count.messages,
    })),
  })
}

export async function DELETE(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 })
    await prisma.chatSession.delete({ where: { id: sessionId } })
    return NextResponse.json({ deleted: true })
  } catch (e) {
    console.error("[Chat Delete Session]", e)
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
