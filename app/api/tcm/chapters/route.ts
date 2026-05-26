import { NextResponse } from "next/server"
import { COURSE_CHAPTERS } from "@/lib/tcm/chapters"

export async function GET() {
  const chapters = COURSE_CHAPTERS.map(ch => ({
    id: ch.id, name: ch.name, hours: ch.hours,
    masterDrugs: ch.drugs.master,
    familiarDrugs: ch.drugs.familiar,
    understandDrugs: ch.drugs.understand,
    keyPoints: ch.keyPoints,
    comparePairs: ch.comparePairs,
    reviewTips: ch.reviewTips,
  }))
  return NextResponse.json({ chapters, totalChapters: chapters.length })
}
