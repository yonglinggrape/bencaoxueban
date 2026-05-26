import { NextResponse } from "next/server"
import { diagnoseWeakPoints } from "@/lib/ai/diagnosis"

export async function POST(req: Request) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  return NextResponse.json(await diagnoseWeakPoints(userId))
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  return NextResponse.json(await diagnoseWeakPoints(userId))
}
