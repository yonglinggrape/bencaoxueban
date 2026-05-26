import { NextResponse } from "next/server"
import { generateLearningPlan, getActivePlan } from "@/lib/ai/plan-generator"

export async function POST(req: Request) {
  const { userId, weeksAhead } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  return NextResponse.json(await generateLearningPlan(userId, weeksAhead ?? 0))
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  const plan = await getActivePlan(userId)
  if (!plan) return NextResponse.json({ error: "No active plan" }, { status: 404 })
  return NextResponse.json(plan)
}
