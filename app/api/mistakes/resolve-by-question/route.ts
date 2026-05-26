import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(req: Request) {
  try {
    const { userId, questionIds } = await req.json()
    if (!userId || !Array.isArray(questionIds)) {
      return NextResponse.json({ error: "userId and questionIds array required" }, { status: 400 })
    }

    const result = await prisma.answerRecord.updateMany({
      where: {
        userId,
        questionId: { in: questionIds },
        isCorrect: false,
        resolved: false,
      },
      data: { resolved: true },
    })

    return NextResponse.json({ resolved: result.count })
  } catch (e) {
    console.error("[Mistakes resolve-by-question PATCH]", e)
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}
