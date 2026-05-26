import { NextResponse } from "next/server"
import { explainAnswer } from "@/lib/ai/explain"

export async function POST(req: Request) {
  const { questionId, userAnswer, correctAnswer } = await req.json()
  if (!questionId || userAnswer === undefined || !correctAnswer) return NextResponse.json({ error: "required fields missing" }, { status: 400 })
  return NextResponse.json(await explainAnswer(questionId, userAnswer, correctAnswer))
}
