import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { COURSE_CHAPTERS } from "@/lib/tcm/chapters"

export async function GET() {
  // Get all topics with herb counts from DB
  const topics = await prisma.topic.findMany({
    include: {
      _count: { select: { herbCards: true, questions: true } },
    },
  })

  const topicMap = new Map(topics.map(t => [t.name, t]))

  const chapters = COURSE_CHAPTERS
    .filter(ch => ch.name !== "总论")
    .map(ch => {
      const topic = topicMap.get(ch.name)
      const totalDrugs = ch.drugs.master.length + ch.drugs.familiar.length + ch.drugs.understand.length
      return {
        id: ch.id,
        name: ch.name,
        hours: ch.hours,
        herbCount: topic?._count.herbCards ?? totalDrugs,
        questionCount: topic?._count.questions ?? 0,
        topicId: topic?.id ?? null,
        masterCount: ch.drugs.master.length,
        familiarCount: ch.drugs.familiar.length,
        understandCount: ch.drugs.understand.length,
      }
    })

  return NextResponse.json({ chapters })
}
