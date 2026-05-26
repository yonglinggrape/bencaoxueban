import { NextResponse } from "next/server"
import { generateDailyTasks } from "@/lib/game/daily"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId") || ""

  try {
    const tasks = await generateDailyTasks(userId)
    return NextResponse.json(tasks)
  } catch { return NextResponse.json([]) }
}
