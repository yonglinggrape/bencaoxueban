import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const topicId = req.nextUrl.searchParams.get("topicId")
  const masteryLevel = req.nextUrl.searchParams.get("masteryLevel")
  const search = req.nextUrl.searchParams.get("search")

  const where: Record<string, unknown> = {}
  if (topicId && topicId !== "all") where.topicId = topicId
  if (masteryLevel && masteryLevel !== "all") where.masteryLevel = masteryLevel
  if (search) where.name = { contains: search }

  const herbs = await prisma.herbCard.findMany({
    where,
    orderBy: { name: "asc" },
    include: { topic: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ herbs })
}
