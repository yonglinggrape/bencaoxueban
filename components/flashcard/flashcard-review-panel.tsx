"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Eye, EyeOff, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { getDueCards, type CardRating } from "@/lib/srs"

interface Flashcard {
  id: string; name: string; chapter: string; chapterName: string; category: string
  yaoxing: string; gongxiao: string; zhuzhi: string; zhuyi: string; isMaster: boolean
}

interface ChapterOpt { id: string; name: string }

export function FlashcardReviewPanel({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession()
  const userId = (session?.user as Record<string, unknown>)?.id as string || ""
  const [cards, setCards] = useState<Flashcard[]>([])
  const [progress, setProgress] = useState<Record<string, { box: number; dueAt: number; reviews: number }>>({})
  const [chapterFilter, setChapterFilter] = useState("all")
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!userId) return
    Promise.all([
      fetch("/api/collection/herbs").then(r => r.json()),
      fetch("/api/tcm/chapters").then(r => r.json()),
      fetch(`/api/flashcard/progress?userId=${userId}`).then(r => r.json()),
    ]).then(([herbsData, chaptersData, progressData]) => {
      const chapterMap = new Map(chaptersData.chapters?.map((c: { id: string; name: string }) => [c.name, c.id]) || [])
      const herbChapterMap = new Map<string, string>()
      for (const ch of chaptersData.chapters || []) {
        for (const d of ch.masterDrugs || []) herbChapterMap.set(d, { id: ch.id, name: ch.name })
        for (const d of ch.familiarDrugs || []) herbChapterMap.set(d, { id: ch.id, name: ch.name })
        for (const d of ch.understandDrugs || []) herbChapterMap.set(d, { id: ch.id, name: ch.name })
      }
      const flashcards: Flashcard[] = (herbsData.herbs || []).map((h: Record<string, unknown>) => {
        const ch = (herbChapterMap.get(h.name as string) || { id: "unknown", name: h.category }) as { id: string; name: string }
        return {
          id: `fc-${h.id}`,
          name: h.name as string,
          chapter: ch.id,
          chapterName: ch.name,
          category: h.category as string,
          yaoxing: (h.properties as string) || "暂无",
          gongxiao: (h.effects as string) || "暂无",
          zhuzhi: (h.usage as string) || "暂无",
          zhuyi: "",
          isMaster: false,
        }
      })
      setCards(flashcards)
      setProgress(progressData.progress || {})
      setLoading(false)
    }).catch(() => { setLoading(false); toast.error("加载闪卡失败") })
  }, [userId])

  const chapterOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: ChapterOpt[] = []
    for (const c of cards) {
      if (!seen.has(c.chapter)) { seen.add(c.chapter); opts.push({ id: c.chapter, name: c.chapterName }) }
    }
    return opts
  }, [cards])

  const filtered = useMemo(() => {
    if (chapterFilter === "all") return cards
    return cards.filter(c => c.chapter === chapterFilter)
  }, [cards, chapterFilter])

  const dueIds = useMemo(() => getDueCards(progress, filtered.map(c => c.id)), [progress, filtered])
  const dueCards = useMemo(() => filtered.filter(c => dueIds.includes(c.id)), [filtered, dueIds])
  const stats = useMemo(() => ({
    total: filtered.length,
    reviewed: Object.keys(progress).filter(id => filtered.some(c => c.id === id) && progress[id]?.reviews > 0).length,
    due: dueCards.length,
  }), [filtered, progress, dueCards])

  const card = dueCards[currentIdx]

  async function rateCard(rating: CardRating) {
    if (!card || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/flashcard/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, cardId: card.id, rating }),
      })
      const data = await res.json()
      setProgress(prev => ({ ...prev, [card.id]: data.progress }))
      setShowAnswer(false)
      if (currentIdx < dueCards.length - 1) {
        setCurrentIdx(i => i + 1)
      }
    } catch { toast.error("提交失败") }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return <Card><CardContent className="pt-6 text-center"><p className="text-muted-foreground">加载闪卡中...</p></CardContent></Card>
  }

  if (cards.length === 0) {
    return <Card><CardContent className="pt-6 text-center"><p className="text-muted-foreground">暂无闪卡数据</p></CardContent></Card>
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>总计 {stats.total}</span>
        <span>已复习 {stats.reviewed}</span>
        <span>待复习 <strong className="text-green-600">{stats.due}</strong></span>
      </div>
      <Progress value={stats.total > 0 ? (stats.reviewed / stats.total) * 100 : 0} className="h-1.5" />

      {/* Chapter filter */}
      <Select value={chapterFilter} onValueChange={(v: string) => { setChapterFilter(v); setCurrentIdx(0); setShowAnswer(false) }}>
        <SelectTrigger className="w-40"><SelectValue placeholder="全部章节" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部章节</SelectItem>
          {chapterOptions.map(ch => <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {dueCards.length === 0 ? (
        <div className="text-center py-8">
          <Sparkles className="h-10 w-10 mx-auto text-green-400 mb-2" />
          <p className="text-muted-foreground">今日复习完成！</p>
        </div>
      ) : (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">{card.chapterName}</Badge>
              <Badge variant="outline" className="text-xs">{card.category}</Badge>
            </div>
            <CardTitle className="text-xl">{card.name}</CardTitle>
            <CardDescription>{currentIdx + 1} / {dueCards.length}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showAnswer ? (
              <Button onClick={() => setShowAnswer(true)} className="w-full" variant="outline">
                <Eye className="h-4 w-4 mr-2" />显示答案
              </Button>
            ) : (
              <>
                <div className="space-y-3">
                  {[
                    { label: "性味归经", value: card.yaoxing },
                    { label: "功效", value: card.gongxiao },
                    { label: "主治", value: card.zhuzhi },
                  ].map(s => (
                    <div key={s.label} className="p-3 rounded-md bg-muted/50">
                      <span className="font-medium text-sm">{s.label}：</span>
                      <span className="text-sm text-muted-foreground">{s.value || "暂无"}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-center pt-2">
                  <Button onClick={() => rateCard("again")} disabled={submitting} variant="outline" size="sm" className="border-red-300 hover:bg-red-50">不记得</Button>
                  <Button onClick={() => rateCard("hard")} disabled={submitting} variant="outline" size="sm" className="border-amber-300 hover:bg-amber-50">模糊</Button>
                  <Button onClick={() => rateCard("good")} disabled={submitting} size="sm" className="bg-green-600 hover:bg-green-700">掌握</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {dueCards.length > 1 && (
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" disabled={currentIdx === 0} onClick={() => { setCurrentIdx(i => i - 1); setShowAnswer(false) }}>
            <ChevronLeft className="h-4 w-4 mr-1" />上一张
          </Button>
          <Button variant="ghost" size="sm" disabled={currentIdx >= dueCards.length - 1} onClick={() => { setCurrentIdx(i => i + 1); setShowAnswer(false) }}>
            下一张<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
