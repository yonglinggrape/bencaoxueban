"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"

interface HerbData {
  id: string; name: string; latinName: string | null; category: string; rarity: string
  properties: string | null; effects: string | null; usage: string | null; mnemonic: string | null
  topicId: string | null; masteryLevel: string | null
  topic: { id: string; name: string } | null
}

const RARITY_COLORS: Record<string, string> = { "常见": "bg-green-100 text-green-700", "珍稀": "bg-blue-100 text-blue-700", "名贵": "bg-purple-100 text-purple-700", "仙草": "bg-amber-100 text-amber-700" }

export function HerbDetail({ herb, mastered }: { herb: HerbData; mastered: boolean }) {
  const [mnemonicOpen, setMnemonicOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{herb.name}</h2>
          <p className="text-sm text-muted-foreground italic">{herb.latinName || "暂无拉丁学名"}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge className={RARITY_COLORS[herb.rarity] || "bg-green-100 text-green-700"}>{herb.rarity}</Badge>
          <Badge variant="secondary">{herb.category}</Badge>
          {mastered && <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-0.5" />已掌握</Badge>}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="p-4 rounded-lg border">
          <h4 className="font-medium text-sm mb-1">性味归经</h4>
          <p className="text-sm text-muted-foreground">{herb.properties || "待补充"}</p>
        </div>
        <div className="p-4 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/10">
          <h4 className="font-medium text-sm mb-1 text-green-700">功效</h4>
          <p className="text-sm text-muted-foreground">{herb.effects || "待补充"}</p>
        </div>
        <div className="p-4 rounded-lg border">
          <h4 className="font-medium text-sm mb-1">主治</h4>
          <p className="text-sm text-muted-foreground">{herb.usage || "待补充"}</p>
        </div>
        {herb.mnemonic && (
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
            <button
              onClick={() => setMnemonicOpen(!mnemonicOpen)}
              className="w-full flex items-center justify-between font-medium text-sm text-amber-700"
            >
              <span>记忆口诀</span>
              {mnemonicOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {mnemonicOpen && (
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans mt-2">{herb.mnemonic}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
