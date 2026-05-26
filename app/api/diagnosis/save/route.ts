import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { userId, weakCategories, weakTopics, overallAssessment, suggestions } = await req.json()
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    const record = await prisma.savedDiagnosis.upsert({
      where: { userId },
      update: {
        weakCategories: JSON.stringify(weakCategories),
        weakTopics: JSON.stringify(weakTopics),
        overallAssessment: overallAssessment || "",
        suggestions: JSON.stringify(suggestions),
      },
      create: {
        userId,
        weakCategories: JSON.stringify(weakCategories),
        weakTopics: JSON.stringify(weakTopics),
        overallAssessment: overallAssessment || "",
        suggestions: JSON.stringify(suggestions),
      },
    })

    return NextResponse.json({ saved: true })
  } catch (e) {
    console.error("[Diagnosis Save]", e)
    return NextResponse.json({ error: "保存失败" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const record = await prisma.savedDiagnosis.findUnique({ where: { userId } })
  if (!record) return NextResponse.json(null, { status: 404 })

  return NextResponse.json({
    weakCategories: JSON.parse(record.weakCategories),
    weakTopics: JSON.parse(record.weakTopics),
    overallAssessment: record.overallAssessment,
    suggestions: JSON.parse(record.suggestions),
    createdAt: record.createdAt,
  })
}
