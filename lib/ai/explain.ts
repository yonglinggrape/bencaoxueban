import { anthropic, hasAnthropicKey } from "./client"
import { MNEMONIC_PROMPT } from "./prompts"

function extractText(resp: { content: unknown[] }): string {
  for (const b of resp.content) {
    const block = b as Record<string, unknown>
    if (block.type === "text" && typeof block.text === "string") return block.text as string
  }
  return ""
}

export async function explainAnswer(questionId: string, userAnswer: string, correctAnswer: string) {
  if (!hasAnthropicKey()) {
    return { questionId, userAnswer, correctAnswer, explanation: `正确答案是 ${correctAnswer}，你的答案是 ${userAnswer}。请回顾相关知识点。`, mnemonic: "辨证审因定治法，理法方药一线穿。", mnemonicExplanation: "中医诊疗需整体性思维。" }
  }
  try {
    const resp = await anthropic!.messages.create({
      model: "claude-sonnet-4-6-20250514", max_tokens: 2048,
      system: "你是耐心的中医药辅导老师。解释学生为何答错，提供正确思路和记忆口诀。输出JSON：{ explanation, mnemonic, mnemonicExplanation }",
      messages: [{ role: "user", content: `题ID:${questionId} 学生答:${userAnswer} 正确答案:${correctAnswer}` }],
    })
    const text = extractText(resp)
    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      const p = JSON.parse(m[0])
      return { questionId, userAnswer, correctAnswer, explanation: p.explanation || "", mnemonic: p.mnemonic || "", mnemonicExplanation: p.mnemonicExplanation || "" }
    }
  } catch (e) { console.error("[Explain] AI failed:", e) }
  return { questionId, userAnswer, correctAnswer, explanation: `正确答案是 ${correctAnswer}。请多做针对性练习。`, mnemonic: "勤学苦练方为径，熟读精思自通神。", mnemonicExplanation: "学习中医药需勤奋积累。" }
}
