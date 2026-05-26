import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function DELETE(req: Request) {
  try {
    const { messageId } = await req.json()
    if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 })

    await prisma.chatMessage.delete({ where: { id: messageId } })
    return NextResponse.json({ deleted: true })
  } catch (e) {
    console.error("[Chat Delete]", e)
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
