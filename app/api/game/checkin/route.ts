import { NextResponse } from "next/server"
import { checkDailyStreak } from "@/lib/game/daily"

export async function POST(req: Request) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  try {
    const result = await checkDailyStreak(userId)
    return NextResponse.json(result)
  } catch (e) {
    console.error("[Checkin]", e)
    return NextResponse.json({ error: "签到失败" }, { status: 500 })
  }
}
