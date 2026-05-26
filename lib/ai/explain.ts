import { deepseekChat, hasDeepSeekKey } from "./client"
import { MNEMONIC_PROMPT } from "./prompts"

export async function explainAnswer(questionId: string, userAnswer: string, correctAnswer: string) {
  if (!hasDeepSeekKey()) {
    return {
      questionId,
      userAnswer,
      correctAnswer,
      explanation: `正确答案是 ${correctAnswer}，你的答案是 ${userAnswer}。请配置 DEEPSEEK_API_KEY 后获取 AI 解析。`,
      mnemonic: "辨证审因定治法，理法方药一线穿。",
      mnemonicExplanation: "中医药学习需要把知识点和临床应用串联起来。",
    }
  }

  try {
    const text = await deepseekChat([
      { role: "system", content: MNEMONIC_PROMPT },
      {
        role: "user",
        content: `题目ID:${questionId} 学生答案:${userAnswer} 正确答案:${correctAnswer}。请解释学生为什么错，提供正确思路和记忆口诀。输出JSON：{ "explanation": "", "mnemonic": "", "mnemonicExplanation": "" }`,
      },
    ], 2048)
    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      const p = JSON.parse(m[0])
      return {
        questionId,
        userAnswer,
        correctAnswer,
        explanation: p.explanation || "",
        mnemonic: p.mnemonic || "",
        mnemonicExplanation: p.mnemonicExplanation || "",
      }
    }
  } catch (e) {
    console.error("[Explain] DeepSeek failed:", e)
  }

  return {
    questionId,
    userAnswer,
    correctAnswer,
    explanation: `正确答案是 ${correctAnswer}。请多做针对性练习。`,
    mnemonic: "勤学苦练方为径，熟读精思自通神。",
    mnemonicExplanation: "学习中药需要持续复盘错题和核心功效。",
  }
}
