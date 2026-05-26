import { NextResponse } from "next/server"
import { completeDailyTask } from "@/lib/game/daily"

export async function POST(req: Request) {
  const { userId, taskId } = await req.json()
  if (!userId || !taskId) return NextResponse.json({ error: "required" }, { status: 400 })
  try {
    await completeDailyTask(userId, taskId)
    return NextResponse.json({ success: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
