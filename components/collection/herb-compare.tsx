"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftRight, Leaf, Loader2 } from "lucide-react"

interface HerbData {
  id: string; name: string; latinName: string | null; category: string; rarity: string
  properties: string | null; effects: string | null; usage: string | null; mnemonic: string | null
  topicId: string | null; topic: { id: string; name: string } | null
}

export function HerbCompare({ herb }: { herb: HerbData }) {
  const [similarHerbs, setSimilarHerbs] = useState<HerbData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!herb.topic?.name) { setLoading(false); return }
    // Fetch herbs in the same chapter
    fetch(`/api/collection/herbs?topicId=${herb.topicId}`)
      .then(r => r.json())
      .then(d => {
        const same = (d.herbs || []).filter((h: HerbData) => h.name !== herb.name)
        // Take up to 5 similar herbs
        setSimilarHerbs(same.slice(0, 5))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [herb])

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>
  }

  if (similarHerbs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p>暂无同类药材数据</p>
      </div>
    )
  }

  // Build comparison rows
  const compareFields = [
    { label: "性味归经", key: "properties" as const },
    { label: "功效", key: "effects" as const },
    { label: "主治", key: "usage" as const },
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        <ArrowLeftRight className="h-4 w-4 inline mr-1" />
        同属 <Badge variant="secondary" className="mx-0.5">{herb.topic?.name}</Badge> 章节的同类药材对比
      </p>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-medium">药材</th>
              {compareFields.map(f => (
                <th key={f.key} className="text-left py-2 px-3 font-medium">{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Current herb first */}
            <tr className="border-b bg-green-50/50 dark:bg-green-950/10">
              <td className="py-2 px-3 font-semibold text-green-700">
                <Leaf className="h-3 w-3 inline mr-1" />{herb.name}
              </td>
              {compareFields.map(f => (
                <td key={f.key} className="py-2 px-3 text-muted-foreground text-xs leading-relaxed">
                  {herb[f.key] || "待补充"}
                </td>
              ))}
            </tr>
            {/* Similar herbs */}
            {similarHerbs.map(h => (
              <tr key={h.id} className="border-b hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{h.name}</td>
                {compareFields.map(f => (
                  <td key={f.key} className="py-2 px-3 text-muted-foreground text-xs leading-relaxed">
                    {h[f.key] || "待补充"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
