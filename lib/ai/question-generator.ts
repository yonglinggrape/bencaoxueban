import { deepseekChat, hasDeepSeekKey } from "./client"
import { QUESTION_GENERATION_PROMPT, SIMILAR_QUESTION_PROMPT } from "./prompts"

export interface Question {
  id: string; domainId: string; topicId: string; content: string; questionType: string
  options: { label: string; text: string }[]; correctAnswer: string; explanation: string; difficulty: string; createdAt: string
}

const MOCK_QUESTIONS: Record<string, Question[]> = {
  HERBOLOGY: [
    { id: "q-001", domainId: "HERBOLOGY", topicId: "herb", content: "麻黄的主要功效是？", questionType: "single_choice", options: [{ label: "A", text: "发汗解表，宣肺平喘" }, { label: "B", text: "清热泻火，解毒消痈" }, { label: "C", text: "活血化瘀，通络止痛" }, { label: "D", text: "补气养血，安神定志" }], correctAnswer: "A", explanation: "麻黄为辛温解表药，具有发汗解表、宣肺平喘、利水消肿的功效。", difficulty: "easy", createdAt: new Date().toISOString() },
    { id: "q-002", domainId: "HERBOLOGY", topicId: "herb", content: "以下哪味药材属于清热药？", questionType: "single_choice", options: [{ label: "A", text: "桂枝" }, { label: "B", text: "黄连" }, { label: "C", text: "当归" }, { label: "D", text: "人参" }], correctAnswer: "B", explanation: "黄连为清热燥湿药，桂枝为解表药，当归为补血药，人参为补气药。", difficulty: "easy", createdAt: new Date().toISOString() },
    { id: "q-003", domainId: "HERBOLOGY", topicId: "herb", content: "甘草在方剂中最常见的作用是？", questionType: "single_choice", options: [{ label: "A", text: "发汗解表" }, { label: "B", text: "调和诸药" }, { label: "C", text: "活血化瘀" }, { label: "D", text: "安神定志" }], correctAnswer: "B", explanation: "甘草性平味甘，善于调和诸药，是方剂中最常用的调和药。", difficulty: "easy", createdAt: new Date().toISOString() },
    { id: "q-004", domainId: "HERBOLOGY", topicId: "herb", content: "金银花属于哪一类中药？", questionType: "single_choice", options: [{ label: "A", text: "解表药" }, { label: "B", text: "清热药" }, { label: "C", text: "补虚药" }, { label: "D", text: "安神药" }], correctAnswer: "B", explanation: "金银花为清热解毒药，属于清热药范畴。", difficulty: "easy", createdAt: new Date().toISOString() },
    { id: "q-005", domainId: "HERBOLOGY", topicId: "herb", content: "大黄的主要功效不包括？", questionType: "single_choice", options: [{ label: "A", text: "泻下攻积" }, { label: "B", text: "清热泻火" }, { label: "C", text: "补气养血" }, { label: "D", text: "凉血解毒" }], correctAnswer: "C", explanation: "大黄为泻下药，具有泻下攻积、清热泻火、凉血解毒等功效，无补气养血作用。", difficulty: "medium", createdAt: new Date().toISOString() },
  ],
}

function parseJson(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

function parseJsonArray(text: string): Record<string, unknown>[] | null {
  const m = text.match(/\[[\s\S]*\]/)
  if (!m) return null
  try {
    const parsed = JSON.parse(m[0])
    return Array.isArray(parsed) ? parsed : null
  } catch { return null }
}

export async function generateQuestion(domainId: string, topicId = "general", _weakTopics: string[] = [], context?: string): Promise<Question> {
  if (hasDeepSeekKey()) {
    try {
      const userMsg = context
        ? `知识域: ${domainId}, 主题: ${topicId}。${context}。请生成一道高质量中药学考题，输出JSON。`
        : `知识域: ${domainId}, 主题: ${topicId}。请生成一道高质量中药学考题，输出JSON。`
      const text = await deepseekChat([
        { role: "system", content: QUESTION_GENERATION_PROMPT },
        { role: "user", content: userMsg },
      ], 2048)
      const p = parseJson(text)
      if (p) {
        return {
          id: `q-${Date.now()}`, domainId, topicId,
          content: p.content as string,
          questionType: (p.questionType as string) || "single_choice",
          options: p.options as { label: string; text: string }[],
          correctAnswer: p.correctAnswer as string,
          explanation: (p.explanation as string) || "",
          difficulty: (p.difficulty as string) || "medium",
          createdAt: new Date().toISOString(),
        }
      }
    } catch (e) { console.error("[QGen] DeepSeek failed:", e) }
  }
  const bank = MOCK_QUESTIONS[domainId] || Object.values(MOCK_QUESTIONS).flat()
  const q = bank[Math.floor(Math.random() * bank.length)]
  return { ...q, id: `q-${Date.now()}`, domainId, topicId, createdAt: new Date().toISOString() }
}

export async function generateQuestions(domainId: string, topicId = "general", count = 5, weakTopics: string[] = [], context?: string): Promise<Question[]> {
  return Promise.all(Array.from({ length: count }, () => generateQuestion(domainId, topicId, weakTopics, context)))
}

export async function generateSimilarQuestions(
  chapterName: string,
  similarHerbs: string[],
  originalQuestionContent: string,
  count: number = 3
): Promise<Question[]> {
  const herbList = similarHerbs.join("、")
  const prompt = `章节：${chapterName}
同类药材：${herbList}
原始错题内容：${originalQuestionContent}
请生成 ${count} 道单选题，重点考察这些药材的功效区别和临床应用选择。`

  if (hasDeepSeekKey()) {
    try {
      const text = await deepseekChat([
        { role: "system", content: SIMILAR_QUESTION_PROMPT },
        { role: "user", content: prompt },
      ], 4096)
      const parsed = parseJsonArray(text)
      if (parsed) {
        return parsed.map((p: Record<string, unknown>) => ({
          id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          domainId: "HERBOLOGY",
          topicId: "herb",
          content: p.content as string,
          questionType: (p.questionType as string) || "single_choice",
          options: p.options as { label: string; text: string }[],
          correctAnswer: p.correctAnswer as string,
          explanation: (p.explanation as string) || "",
          difficulty: (p.difficulty as string) || "medium",
          createdAt: new Date().toISOString(),
        }))
      }
    } catch (e) { console.error("[SimilarQGen] DeepSeek failed:", e) }
  }

  return []
}
