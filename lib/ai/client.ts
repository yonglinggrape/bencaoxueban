import { Anthropic } from "@anthropic-ai/sdk"

function createAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === "sk-ant-placeholder") {
    console.warn("[AI] No valid ANTHROPIC_API_KEY — using mock data")
    return null
  }
  return new Anthropic({ apiKey })
}

export const anthropic = createAnthropicClient()
export const hasAnthropicKey = () => anthropic !== null

// DeepSeek (OpenAI-compatible)
const DEEPSEEK_BASE = "https://api.deepseek.com/v1"

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
      model: "deepseek-chat",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`DeepSeek API error ${resp.status}: ${err}`)
  }

  const data = await resp.json()
  return data.choices?.[0]?.message?.content || ""
}
