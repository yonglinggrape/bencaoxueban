"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Leaf, Search, Star, BookOpen, ChevronDown, ChevronUp, CheckCircle2, Circle, Bell, BellRing, FileText, Network, Brain } from "lucide-react"
import { ChapterNav, type ChapterSummary } from "@/components/tcm/chapter-nav"
import { HerbDetail } from "@/components/collection/herb-detail"
import { HerbCompare } from "@/components/collection/herb-compare"
import { HerbQuiz } from "@/components/collection/herb-quiz"

interface HerbData {
  id: string; name: string; latinName: string | null; category: string; rarity: string
  properties: string | null; effects: string | null; usage: string | null; mnemonic: string | null
  topicId: string | null; masteryLevel: string | null
  topic: { id: string; name: string } | null
}

const RARITY_COLORS: Record<string, string> = { "常见": "bg-green-100 text-green-700", "珍稀": "bg-blue-100 text-blue-700", "名贵": "bg-purple-100 text-purple-700", "仙草": "bg-amber-100 text-amber-700" }
const RARITY_STARS: Record<string, number> = { "常见": 1, "珍稀": 2, "名贵": 3, "仙草": 4 }

export default function CollectionPage() {
  const { data: session } = useSession()
  const userId = (session?.user as Record<string, unknown>)?.id as string || ""

  const [herbs, setHerbs] = useState<HerbData[]>([])
  const [chapters, setChapters] = useState<ChapterSummary[]>([])
  const [search, setSearch] = useState("")
  const [selectedChapter, setSelectedChapter] = useState<string>("all")
  const [filterMastery, setFilterMastery] = useState<"all" | "mastered" | "unmastered">("all")
  const [selected, setSelected] = useState<HerbData | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailTab, setDetailTab] = useState("detail")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMastered, setUserMastered] = useState<Set<string>>(new Set())
  const [userHerbMap, setUserHerbMap] = useState<Record<string, string>>({})
  const [reminderDue, setReminderDue] = useState(0)

  useEffect(() => {
    fetch("/api/collection/chapters").then(r => r.json()).then(d => setChapters(d.chapters || []))
    loadData()
  }, [userId])

  async function loadData() {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedChapter !== "all") params.set("topicId", selectedChapter)
    const [herbsRes, herbsUserRes, remindersRes] = await Promise.all([
      fetch(`/api/collection/herbs${params.toString() ? "?" + params.toString() : ""}`),
      userId ? fetch(`/api/collection/herbs?userId=${userId}`).then(r => r.json()).catch(() => ({ herbs: [] })) : Promise.resolve({ herbs: [] }),
      userId ? fetch(`/api/reminders?userId=${userId}`).then(r => r.json()).catch(() => ({ reminders: [], dueCount: 0 })) : Promise.resolve({ reminders: [], dueCount: 0 }),
    ])
    const herbsData = await herbsRes.json()
    // Fetch user herb data for mastery status
    if (userId) {
      try {
        const userHerbRes = await fetch(`/api/user/progress?userId=${userId}`)
        // Use a different approach - fetch user herbs directly
        const mastered = new Set<string>()
        const herbMap: Record<string, string> = {}
        if (herbsUserRes.userHerbs) {
          for (const uh of herbsUserRes.userHerbs) {
            if (uh.mastered) mastered.add(uh.herbId)
            herbMap[uh.herbId] = uh.id
          }
        }
        setUserMastered(mastered)
        setUserHerbMap(herbMap)
      } catch { /* */ }
    }
    setHerbs(herbsData.herbs || [])
    setReminderDue(remindersRes.dueCount || 0)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [selectedChapter, userId])

  async function toggleMastery(herbId: string, currentMastered: boolean) {
    if (!userId) return
    const newMastered = !currentMastered
    try {
      await fetch("/api/collection/herbs/master", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, herbId, mastered: newMastered }),
      })
      setUserMastered(prev => {
        const next = new Set(prev)
        if (newMastered) next.add(herbId); else next.delete(herbId)
        return next
      })
      toast.success(newMastered ? "已标记为掌握" : "已取消掌握")
      // Refresh reminder count
      fetch(`/api/reminders?userId=${userId}`).then(r => r.json()).then(d => setReminderDue(d.dueCount || 0)).catch(() => {})
    } catch { toast.error("操作失败") }
  }

  function handleChapterSelect(id: string) {
    setSelectedChapter(id)
    setSelected(null)
  }

  const filtered = (() => {
    let result = search ? herbs.filter(h => h.name.includes(search) || h.category.includes(search)) : herbs
    if (filterMastery === "mastered") result = result.filter(h => userMastered.has(h.id))
    if (filterMastery === "unmastered") result = result.filter(h => !userMastered.has(h.id))
    return result
  })()

  // Group by chapter when showing all
  const grouped = selectedChapter === "all" && !search && filterMastery === "all"
    ? chapters.reduce((acc, ch) => {
        const chHerbs = filtered.filter(h => h.topic?.name === ch.name)
        if (chHerbs.length > 0) acc.push({ chapter: ch, herbs: chHerbs })
        return acc
      }, [] as { chapter: ChapterSummary; herbs: HerbData[] }[])
    : null

  const masteredCount = herbs.filter(h => userMastered.has(h.id)).length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-green-500" />本草图鉴</h1>
        {reminderDue > 0 && (
          <Badge className="bg-amber-100 text-amber-700 gap-1">
            <BellRing className="h-3 w-3" />{reminderDue} 味药材待复习
          </Badge>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            <ChapterNav chapters={chapters} selectedId={selectedChapter} onSelect={handleChapterSelect} />
          </div>
        </aside>

        {/* Mobile chapter toggle */}
        <div className="lg:hidden w-full">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-lg border mb-2 text-sm"
          >
            <span>{selectedChapter === "all" ? "全部章节" : chapters.find(c => c.topicId === selectedChapter)?.name || "选择章节"}</span>
            {sidebarOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {sidebarOpen && (
            <div className="mb-4 p-2 border rounded-lg bg-card">
              <ChapterNav chapters={chapters} selectedId={selectedChapter} onSelect={(id) => { handleChapterSelect(id); setSidebarOpen(false) }} />
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search + mastery filter */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索药材..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-1">
              {[
                { v: "all" as const, label: `全部 (${herbs.length})` },
                { v: "mastered" as const, label: `已掌握 (${masteredCount})` },
                { v: "unmastered" as const, label: `未掌握 (${herbs.length - masteredCount})` },
              ].map(m => (
                <button
                  key={m.v}
                  onClick={() => setFilterMastery(m.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterMastery === m.v ? "bg-green-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detail view with tabs */}
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                  {[
                    { key: "detail", icon: FileText, label: "详情" },
                    { key: "compare", icon: Network, label: "同类对比" },
                    { key: "quiz", icon: Brain, label: "智能题库" },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setDetailTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        detailTab === tab.key
                          ? "bg-white dark:bg-stone-800 shadow-sm text-green-700"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={userMastered.has(selected.id) ? "outline" : "default"}
                    className={userMastered.has(selected.id) ? "" : "bg-green-600 hover:bg-green-700"}
                    onClick={() => toggleMastery(selected.id, userMastered.has(selected.id))}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {userMastered.has(selected.id) ? "取消掌握" : "标记为已掌握"}
                  </Button>
                  <button onClick={() => setSelected(null)} className="text-sm text-green-600 hover:underline">← 返回图鉴</button>
                </div>
              </div>

              <div key={selected.id} className={detailTab === "detail" ? "" : "hidden"}>
                <HerbDetail herb={selected} mastered={userMastered.has(selected.id)} />
              </div>
              <div key={selected.id} className={detailTab === "compare" ? "" : "hidden"}>
                <HerbCompare herb={selected} />
              </div>
              <div key={selected.id} className={detailTab === "quiz" ? "" : "hidden"}>
                <HerbQuiz herb={selected} userId={userId} />
              </div>
            </div>
          )}

          {/* Herb grid */}
          {!selected && (
            loading ? (
              <Card><CardContent className="pt-6 text-center"><p className="text-muted-foreground">正在采集中...</p></CardContent></Card>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="pt-6 text-center"><p className="text-muted-foreground">暂无药材数据</p></CardContent></Card>
            ) : grouped ? (
              <div className="space-y-8">
                {grouped.map(({ chapter, herbs: chHerbs }) => (
                  <section key={chapter.id}>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-green-500" />
                      {chapter.name}
                      <span className="text-sm text-muted-foreground font-normal">({chHerbs.length}味)</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                      {chHerbs.map(herb => <HerbCardItem key={herb.id} herb={herb} mastered={userMastered.has(herb.id)} onClick={() => setSelected(herb)} />)}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map(herb => <HerbCardItem key={herb.id} herb={herb} mastered={userMastered.has(herb.id)} onClick={() => setSelected(herb)} />)}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

function HerbCardItem({ herb, mastered, onClick }: { herb: HerbData; mastered: boolean; onClick: () => void }) {
  return (
    <Card
      className={`hover:shadow-md transition-shadow cursor-pointer border-2 hover:scale-[1.02] duration-200 ${
        mastered ? "border-green-400 bg-green-50/30 dark:bg-green-950/20" : "border-green-200/50 hover:border-green-400"
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-3 text-center relative">
        {mastered && (
          <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-green-500" />
        )}
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="font-semibold text-sm">{herb.name}</h3>
        <p className="text-xs text-muted-foreground italic mb-1.5 truncate">{herb.latinName || " "}</p>
        <div className="flex gap-1 justify-center mb-1.5">
          {Array.from({ length: RARITY_STARS[herb.rarity] || 1 }).map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <Badge variant="secondary" className="text-xs">{herb.category}</Badge>
      </CardContent>
    </Card>
  )
}
