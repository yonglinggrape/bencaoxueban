// DeepSeek (OpenAI-compatible)
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash"

export function hasDeepSeekKey() {
  return !!process.env.DEEPSEEK_API_KEY
}

interface DeepSeekMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export async function deepseekChat(messages: DeepSeekMessage[], maxTokens = 2048): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set")

  const resp = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      thinking: { type: "disabled" },
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`DeepSeek API error ${resp.status}: ${err}`)
  }

  const data = await resp.json()
  return data.choices?.[0]?.message?.content || ""
}
