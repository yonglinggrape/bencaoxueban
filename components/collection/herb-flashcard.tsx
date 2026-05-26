"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, RotateCw, Loader2, Leaf } from "lucide-react"

interface HerbData {
  id: string; name: string; latinName: string | null; category: string; rarity: string
  properties: string | null; effects: string | null; usage: string | null; mnemonic: string | null
  topicId: string | null; topic: { id: string; name: string } | null
}

export function HerbFlashcard({ herb }: { herb: HerbData }) {
  const [cards, setCards] = useState<HerbData[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!herb.topic?.name) { setCards([herb]); setLoading(false); return }
    fetch(`/api/collection/herbs?topicId=${herb.topicId}`)
      .then(r => r.json())
      .then(d => {
        const same = (d.herbs || []).filter((h: HerbData) => h.name !== herb.name)
        setCards([herb, ...same.slice(0, 9)]) // current herb first + up to 9 similar
        setLoading(false)
      })
      .catch(() => { setCards([herb]); setLoading(false) })
  }, [herb])

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>
  }

  const card = cards[currentIdx]
  if (!card) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{currentIdx + 1} / {cards.length}</span>
        <span>点击卡片翻转</span>
      </div>

      {/* Flip card */}
      <div
        className="relative w-full cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className={`relative w-full min-h-[280px] transition-all duration-500 rounded-xl border-2 ${
            flipped ? "border-green-400 bg-green-50/30 dark:bg-green-950/20" : "border-green-200 hover:border-green-400"
          }`}
          style={{ transformStyle: "preserve-3d" }}
        >
          {!flipped ? (
            /* Front - herb name */
            <div className="flex flex-col items-center justify-center min-h-[280px] p-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <Leaf className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-1">{card.name}</h2>
              <p className="text-sm text-muted-foreground italic mb-3">{card.latinName || " "}</p>
              <Badge variant="secondary">{card.category}</Badge>
              <p className="text-xs text-muted-foreground mt-4">
                <RotateCw className="h-3 w-3 inline mr-1" />点击翻转查看详情
              </p>
            </div>
          ) : (
            /* Back - details */
            <div className="min-h-[280px] p-6 space-y-4">
              <h2 className="text-xl font-bold text-center mb-4">{card.name}</h2>
              <div className="p-3 rounded-lg border bg-white dark:bg-stone-900">
                <h4 className="font-medium text-sm mb-1">性味归经</h4>
                <p className="text-sm text-muted-foreground">{card.properties || "待补充"}</p>
              </div>
              <div className="p-3 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/10">
                <h4 className="font-medium text-sm mb-1 text-green-700">功效</h4>
                <p className="text-sm text-muted-foreground">{card.effects || "待补充"}</p>
              </div>
              <div className="p-3 rounded-lg border bg-white dark:bg-stone-900">
                <h4 className="font-medium text-sm mb-1">主治</h4>
                <p className="text-sm text-muted-foreground">{card.usage || "待补充"}</p>
              </div>
              {card.mnemonic && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                  <h4 className="font-medium text-sm mb-1 text-amber-700">记忆口诀</h4>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">{card.mnemonic}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      {cards.length > 1 && (
        <div className="flex justify-between items-center">
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIdx(i => Math.max(0, i - 1)); setFlipped(false) }}
            disabled={currentIdx === 0}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />上一味
          </button>
          <span className="text-sm text-muted-foreground">{card.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false) }}
            disabled={currentIdx >= cards.length - 1}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-30"
          >
            下一味<ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
