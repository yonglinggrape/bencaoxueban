"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowRight, BookMarked, BookOpen, Brain, CheckCircle, ChevronDown, ChevronUp, Leaf, RefreshCw, Search, Shuffle, Sparkles, Target } from "lucide-react"
import { ChapterSelector, type ChapterInfo } from "@/components/tcm/chapter-selector"
import { SimilarQuestionPanel } from "@/components/quiz/similar-question-panel"
import { MistakeNotebook } from "@/components/quiz/mistake-notebook"

interface Question {
  id: string
  domainId: string
  topicId: string
  topicName?: string
  content: string
  questionType: string
  options: { label: string; text: string }[]
  correctAnswer: string
  explanation: string | null
  difficulty: string
  isAiGenerated?: boolean
  createdAt?: string
}

interface DiagnosisResult {
  weakCategories: { category: string; errorRate: number; totalQuestions: number }[]
  weakTopics: { topicId: string; topicName: string; category: string; errorRate: number; totalQuestions: number }[]
  overallAssessment: string
  suggestions: string[]
}

interface SimilarQuestion {
  id: string
  content: string
  options: { label: string; text: string }[]
  correctAnswer: string
  explanation: string
  difficulty: string
  generatedForCategory: string
}

type Phase = "mode" | "config" | "quiz" | "result" | "questionBank"
type QuizMode = "chapter" | "random" | "mistake"
type QuestionSource = "bank" | "ai"

const DOMAIN_NAMES: Record<string, string> = { HERBOLOGY: "中药学" }
const DIFFICULTY_LABELS: Record<string, string> = { easy: "简单", medium: "中等", hard: "困难" }

function normalizeDiagnosis(data: Partial<DiagnosisResult> | null | undefined): DiagnosisResult {
  return {
    weakCategories: Array.isArray(data?.weakCategories) ? data.weakCategories : [],
    weakTopics: Array.isArray(data?.weakTopics) ? data.weakTopics : [],
    overallAssessment: typeof data?.overallAssessment === "string" && data.overallAssessment
      ? data.overallAssessment
      : "诊断暂不可用，请稍后在学习计划中重试。",
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
  }
}

export default function QuizPage() {
  const { data: session } = useSession()
  const userId = (session?.user as Record<string, unknown>)?.id as string || ""

  const [phase, setPhase] = useState<Phase>("mode")
  const [mode, setMode] = useState<QuizMode>("chapter")
  const [questionSource, setQuestionSource] = useState<QuestionSource>("bank")
  const [chapters, setChapters] = useState<ChapterInfo[]>([])
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [questionCount, setQuestionCount] = useState(10)

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([])
  const [pendingMistakeQuestionIds, setPendingMistakeQuestionIds] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/collection/chapters").then(r => r.json()).then(d => setChapters(d.chapters || []))
  }, [])

  function goToConfig(nextMode: QuizMode) {
    setMode(nextMode)
    setPhase("config")
    setQuestionSource("bank")
    setSelectedChapters([])
  }

  async function loadAiChapterQuestions() {
    if (selectedChapters.length === 0) {
      toast.error("请先选择章节")
      return []
    }

    const base = Math.floor(questionCount / selectedChapters.length)
    const remainder = questionCount % selectedChapters.length
    const generated: Question[] = []

    for (let i = 0; i < selectedChapters.length; i++) {
      const topicId = selectedChapters[i]
      const chapter = chapters.find(ch => ch.topicId === topicId)
      const count = base + (i < remainder ? 1 : 0)
      if (count <= 0) continue

      const res = await fetch("/api/ai/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          topicName: chapter?.name,
          count,
          saveToDb: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "AI 出题失败")
      generated.push(...(data.questions || []))
    }

    return generated
  }

  async function startQuiz() {
    setLoading(true)
    try {
      let loadedQuestions: Question[] = []

      if (mode === "chapter" && questionSource === "ai") {
        loadedQuestions = await loadAiChapterQuestions()
      } else {
        const params = new URLSearchParams()
        params.set("count", String(questionCount))

        if (mode === "chapter" && selectedChapters.length > 0) {
          params.set("mode", "chapter")
          params.set("topicIds", selectedChapters.join(","))
        } else if (mode === "mistake") {
          params.set("mode", "mistake")
          params.set("userId", userId)
        } else {
          params.set("mode", "random")
        }

        const res = await fetch(`/api/quiz/questions?${params.toString()}`)
        const data = await res.json()
        loadedQuestions = data.questions || []
      }

      if (loadedQuestions.length === 0) {
        toast.error(mode === "mistake" ? "暂无错题记录，先去练习吧！" : "暂无题目")
        return
      }

      setQuestions(loadedQuestions)
      setCurrentIdx(0)
      setAnswers({})
      setDiagnosis(null)
      setSimilarQuestions([])
      setPendingMistakeQuestionIds([])
      setPhase("quiz")
    } catch (e) {
      console.error("[Quiz start]", e)
      toast.error(questionSource === "ai" ? "AI 出题失败，请检查 DeepSeek 配置" : "加载题目失败")
    } finally {
      setLoading(false)
    }
  }

  async function submitAnswers() {
    setLoading(true)
    let correctCount = 0
    const herbsCollected: string[] = []
    let leveledUp = false
    let allSimilarQuestions: SimilarQuestion[] = []

    try {
      for (const q of questions) {
        const userAnswer = answers[q.id] || ""
        const isCorrect = userAnswer === q.correctAnswer
        if (isCorrect) correctCount++

        const res = await fetch("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, questionId: q.id, userAnswer, isCorrect, domainId: q.domainId, topicId: q.topicId }),
        })
        const data = await res.json()
        if (data.herbCard) herbsCollected.push(data.herbCard.name)
        if (data.levelUp) leveledUp = true
        if (data.similarQuestions?.length > 0) {
          allSimilarQuestions = [...allSimilarQuestions, ...data.similarQuestions]
        }
      }

      setSimilarQuestions(allSimilarQuestions)
      setPendingMistakeQuestionIds(mode === "mistake"
        ? questions.filter(q => answers[q.id] === q.correctAnswer).map(q => q.id)
        : []
      )

      let diagData: DiagnosisResult
      try {
        const diagRes = await fetch("/api/ai/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })
        diagData = normalizeDiagnosis(diagRes.ok ? await diagRes.json() : null)
      } catch {
        diagData = normalizeDiagnosis(null)
      }
      setDiagnosis(diagData)

      fetch("/api/diagnosis/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...diagData }),
      }).catch(() => { /* non-critical */ })

      setPhase("result")
      toast.success(`评测完成！正确 ${correctCount}/${questions.length}`, { description: `获得 ${correctCount * 30} 经验` })
      if (leveledUp) toast.success("升级了！")
      for (const h of herbsCollected) toast("获得药卡", { description: `${h}`, icon: <Leaf className="h-4 w-4 text-green-500" /> })
      if (allSimilarQuestions.length > 0) toast("AI 已为你生成同类药材巩固练习", { icon: <Sparkles className="h-4 w-4 text-amber-500" /> })
    } catch (e) {
      console.error("[Quiz submit]", e)
      toast.error("提交失败")
    } finally {
      setLoading(false)
    }
  }

  async function clearPendingMistakes() {
    if (pendingMistakeQuestionIds.length === 0) return
    try {
      const res = await fetch("/api/mistakes/resolve-by-question", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, questionIds: pendingMistakeQuestionIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "清除失败")
      toast.success(`已消除 ${data.resolved || pendingMistakeQuestionIds.length} 条错题记录`)
      setPendingMistakeQuestionIds([])
    } catch {
      toast.error("消除错题失败")
    }
  }

  function resetQuiz() {
    setPhase("mode")
    setQuestions([])
    setAnswers({})
    setDiagnosis(null)
    setSimilarQuestions([])
    setPendingMistakeQuestionIds([])
  }

  if (phase === "mode") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-green-500" />智能练习</h1>
        <p className="text-muted-foreground text-sm">选择练习方式，按章节、随机题库或习题集进行学习。</p>

        <div className="grid gap-4">
          <ModeCard icon={BookOpen} title="章节练习" desc="按教材章节练习，可选择题库出题或 AI 智能出题。" color="bg-green-100 text-green-700" onClick={() => goToConfig("chapter")} />
          <ModeCard icon={Shuffle} title="随机练习" desc="从题库中随机抽题，全面检测各章节掌握情况。" color="bg-blue-100 text-blue-700" onClick={() => goToConfig("random")} />
          <ModeCard icon={BookMarked} title="习题集" desc="查看所有题目和错题本，题目默认收起，点击后展开详情。" color="bg-purple-100 text-purple-700" onClick={() => setPhase("questionBank")} />
        </div>
      </div>
    )
  }

  if (phase === "config") {
    const modeLabels: Record<QuizMode, { title: string; desc: string }> = {
      chapter: { title: "章节练习", desc: "选择章节、题目数量和出题方式。" },
      random: { title: "随机练习", desc: "设置题目数量，系统从题库随机抽题。" },
      mistake: { title: "错题复习", desc: "从你之前答错且未消除的题目中抽取。" },
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={resetQuiz} className="text-sm text-muted-foreground hover:text-foreground">← 返回</button>
          <h1 className="text-xl font-bold">{modeLabels[mode].title}</h1>
        </div>
        <p className="text-sm text-muted-foreground -mt-4">{modeLabels[mode].desc}</p>

        {mode === "chapter" && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">选择章节</CardTitle></CardHeader>
              <CardContent>
                <ChapterSelector chapters={chapters.filter(c => c.topicId)} selected={selectedChapters} onChange={setSelectedChapters} multiSelect />
                {selectedChapters.length === 0 && <p className="text-sm text-muted-foreground mt-3">题库出题未选章节时会从所有章节随机出题；AI 智能出题必须选择章节。</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">出题方式</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button variant={questionSource === "bank" ? "default" : "outline"} onClick={() => setQuestionSource("bank")} className={questionSource === "bank" ? "bg-green-600 hover:bg-green-700" : ""}>题库出题</Button>
                <Button variant={questionSource === "ai" ? "default" : "outline"} onClick={() => setQuestionSource("ai")} className={questionSource === "ai" ? "bg-green-600 hover:bg-green-700" : ""}>
                  <Sparkles className="h-4 w-4 mr-2" />AI 智能出题
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">题目数量</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map(n => (
                <Button key={n} variant={questionCount === n ? "default" : "outline"} size="sm" onClick={() => setQuestionCount(n)} className={questionCount === n ? "bg-green-600 hover:bg-green-700" : ""}>
                  {n} 题
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button onClick={startQuiz} disabled={loading} size="lg" className="w-full bg-green-600 hover:bg-green-700">
          <Brain className="h-4 w-4 mr-2" />{loading ? (questionSource === "ai" ? "AI 出题中..." : "加载中...") : "开始练习"}
        </Button>
      </div>
    )
  }

  const q = questions[currentIdx]
  const isLast = currentIdx === questions.length - 1

  if (phase === "quiz") {
    if (!q) {
      return <EmptyState text="暂无题目" onBack={resetQuiz} />
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setPhase("config")} className="text-sm text-muted-foreground hover:text-foreground">← 返回配置</button>
          <Badge variant="secondary">{currentIdx + 1} / {questions.length}</Badge>
        </div>
        <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-2" />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{q.content}</CardTitle>
            <CardDescription>
              {DOMAIN_NAMES[q.domainId] || q.domainId} · {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
              {q.isAiGenerated && <Badge variant="outline" className="ml-2">AI</Badge>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}>
              <div className="space-y-3">
                {q.options.map(opt => (
                  <label key={opt.label} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === opt.label ? "border-green-500 bg-green-50 dark:bg-green-950" : "hover:bg-muted"}`}>
                    <RadioGroupItem value={opt.label} id={`${q.id}-${opt.label}`} />
                    <Label htmlFor={`${q.id}-${opt.label}`} className="flex-1 cursor-pointer">
                      <span className="font-medium mr-2">{opt.label}.</span>{opt.text}
                    </Label>
                  </label>
                ))}
              </div>
            </RadioGroup>
            <div className="flex justify-between mt-6">
              <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>上一题</Button>
              {isLast ? (
                <Button onClick={submitAnswers} disabled={!answers[q.id] || loading} className="bg-green-600 hover:bg-green-700">
                  {loading ? "提交中..." : "提交评测"} <CheckCircle className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={() => setCurrentIdx(i => i + 1)} disabled={!answers[q.id]}>下一题 <ArrowRight className="h-4 w-4 ml-2" /></Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (phase === "questionBank") {
    return (
      <QuestionBankView
        userId={userId}
        chapters={chapters}
        onBack={resetQuiz}
        onStartMistakeReview={() => goToConfig("mistake")}
      />
    )
  }

  if (phase === "result" && diagnosis) {
    return (
      <DiagnosisResultView
        diagnosis={diagnosis}
        userId={userId}
        onRetry={resetQuiz}
        similarQuestions={similarQuestions}
        pendingMistakeQuestionIds={pendingMistakeQuestionIds}
        onClearMistakes={clearPendingMistakes}
        onKeepMistakes={() => setPendingMistakeQuestionIds([])}
      />
    )
  }

  return null
}

function ModeCard({ icon: Icon, title, desc, color, onClick }: { icon: typeof BookOpen; title: string; desc: string; color: string; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:border-green-400 hover:shadow-md transition-all" onClick={onClick}>
      <CardContent className="pt-6 flex items-start gap-4">
        <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-3" />
      </CardContent>
    </Card>
  )
}

function EmptyState({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card><CardContent className="pt-6 text-center"><p>{text}</p><Button onClick={onBack} className="mt-4"><RefreshCw className="h-4 w-4 mr-2" />重新选择</Button></CardContent></Card>
    </div>
  )
}

function QuestionBankView({ userId, chapters, onBack, onStartMistakeReview }: { userId: string; chapters: ChapterInfo[]; onBack: () => void; onStartMistakeReview: () => void }) {
  const [tab, setTab] = useState<"all" | "mistakes">("all")
  const [questions, setQuestions] = useState<Question[]>([])
  const [topicId, setTopicId] = useState("all")
  const [source, setSource] = useState("all")
  const [search, setSearch] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (tab !== "all") return
    const controller = new AbortController()
    const params = new URLSearchParams({ topicId, source, search, limit: "1000" })
    fetch(`/api/quiz/bank?${params.toString()}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => setQuestions(d.questions || []))
      .catch(() => {
        if (!controller.signal.aborted) toast.error("加载习题集失败")
      })
    return () => controller.abort()
  }, [tab, topicId, source, search])

  const grouped = useMemo(() => {
    const map = new Map<string, { topicName: string; questions: Question[] }>()
    for (const q of questions) {
      const key = q.topicId || "unknown"
      if (!map.has(key)) map.set(key, { topicName: q.topicName || "综合", questions: [] })
      map.get(key)!.questions.push(q)
    }
    return Array.from(map.entries())
  }, [questions])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">← 返回</button>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookMarked className="h-6 w-6 text-purple-500" />习题集</h1>
      </div>

      <div className="flex gap-2 rounded-lg bg-muted p-1 w-fit">
        <Button size="sm" variant={tab === "all" ? "default" : "ghost"} onClick={() => setTab("all")} className={tab === "all" ? "bg-green-600 hover:bg-green-700" : ""}>全部题目</Button>
        <Button size="sm" variant={tab === "mistakes" ? "default" : "ghost"} onClick={() => setTab("mistakes")} className={tab === "mistakes" ? "bg-green-600 hover:bg-green-700" : ""}>错题本</Button>
      </div>

      {tab === "mistakes" ? (
        <div className="space-y-4">
          <Button onClick={onStartMistakeReview} className="bg-amber-600 hover:bg-amber-700"><Target className="h-4 w-4 mr-2" />开始错题复习</Button>
          <MistakeNotebook userId={userId} onRedoQuestion={onStartMistakeReview} />
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索题干..." className="pl-10" />
              </div>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger className="w-40"><SelectValue placeholder="章节" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部章节</SelectItem>
                  {chapters.filter(ch => ch.topicId).map(ch => <SelectItem key={ch.topicId!} value={ch.topicId!}>{ch.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-36"><SelectValue placeholder="题源" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部题源</SelectItem>
                  <SelectItem value="bank">题库</SelectItem>
                  <SelectItem value="ai">AI 生成</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {grouped.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">暂无题目</CardContent></Card>
          ) : grouped.map(([groupId, group]) => {
            const groupOpen = !!expandedGroups[groupId]
            return (
              <Card key={groupId}>
                <button className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50" onClick={() => setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))}>
                  <div>
                    <h3 className="font-medium">{group.topicName}</h3>
                    <p className="text-sm text-muted-foreground">{group.questions.length} 道题</p>
                  </div>
                  {groupOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                {groupOpen && (
                  <CardContent className="border-t space-y-3 pt-4">
                    {group.questions.map(q => {
                      const open = !!expandedQuestions[q.id]
                      return (
                        <div key={q.id} className="rounded-lg border">
                          <button className="w-full p-3 text-left flex items-start justify-between gap-3 hover:bg-muted/50" onClick={() => setExpandedQuestions(prev => ({ ...prev, [q.id]: !prev[q.id] }))}>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{q.content}</p>
                              <div className="flex gap-1 flex-wrap">
                                <Badge variant="secondary">{DIFFICULTY_LABELS[q.difficulty] || q.difficulty}</Badge>
                                <Badge variant="outline">{q.isAiGenerated ? "AI 生成" : "题库"}</Badge>
                              </div>
                            </div>
                            {open ? <ChevronUp className="h-4 w-4 mt-1" /> : <ChevronDown className="h-4 w-4 mt-1" />}
                          </button>
                          {open && (
                            <div className="px-3 pb-3 space-y-2">
                              {q.options.map(opt => (
                                <div key={opt.label} className={`text-sm rounded-md border p-2 ${opt.label === q.correctAnswer ? "border-green-300 bg-green-50 dark:bg-green-950" : "bg-muted/30"}`}>
                                  <span className="font-medium mr-2">{opt.label}.</span>{opt.text}
                                </div>
                              ))}
                              <p className="text-sm"><span className="font-medium">正确答案：</span>{q.correctAnswer}</p>
                              {q.explanation && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">解析：</span>{q.explanation}</p>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DiagnosisResultView({
  diagnosis,
  userId,
  onRetry,
  similarQuestions,
  pendingMistakeQuestionIds,
  onClearMistakes,
  onKeepMistakes,
}: {
  diagnosis: DiagnosisResult
  userId: string
  onRetry: () => void
  similarQuestions: SimilarQuestion[]
  pendingMistakeQuestionIds: string[]
  onClearMistakes: () => void
  onKeepMistakes: () => void
}) {
  const [plan, setPlan] = useState<{ days: { date: string; tasks: { title: string; description: string; taskType: string }[] }[] } | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const weakCategories = Array.isArray(diagnosis.weakCategories) ? diagnosis.weakCategories : []
  const suggestions = Array.isArray(diagnosis.suggestions) ? diagnosis.suggestions : []

  async function generatePlan() {
    setPlanLoading(true)
    try {
      const res = await fetch("/api/ai/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) })
      setPlan(await res.json())
    } catch { toast.error("生成计划失败") }
    finally { setPlanLoading(false) }
  }

  async function handleAddToPlan() {
    try {
      const tasks = similarQuestions.map((q, i) => ({
        title: `同类药材练习: ${q.generatedForCategory} (${i + 1})`,
        description: q.content.slice(0, 50),
        topicId: null,
        taskType: "practice",
        scheduledDate: new Date(Date.now() + (i + 1) * 86400000).toISOString().slice(0, 10),
      }))
      await fetch("/api/plan/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tasks }),
      })
      toast.success("已加入学习计划")
    } catch { toast.error("加入计划失败") }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">评测结果</h1>

      {pendingMistakeQuestionIds.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/10">
          <CardHeader>
            <CardTitle className="text-base">是否消除本次已答对的错题？</CardTitle>
            <CardDescription>本次错题复习中有 {pendingMistakeQuestionIds.length} 道题已答对。确认后，这些题会从错题本中移除；答错的题会继续保留。</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={onClearMistakes} className="bg-green-600 hover:bg-green-700">消除本次错题</Button>
            <Button variant="outline" onClick={onKeepMistakes}>暂不消除</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>中药类别掌握度</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {weakCategories.length === 0 && <p className="text-sm text-muted-foreground">暂无可用的分类诊断数据。</p>}
          {weakCategories.map(d => (
            <div key={d.category}>
              <div className="flex justify-between text-sm mb-1"><span>{d.category}</span><span>{Math.round((1 - d.errorRate) * 100)}%</span></div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${d.errorRate > 0.4 ? "bg-red-500" : d.errorRate > 0.2 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${(1 - d.errorRate) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>AI 诊断</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{diagnosis.overallAssessment}</p>
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">学习建议：</h4>
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SimilarQuestionPanel questions={similarQuestions} userId={userId} onAddToPlan={handleAddToPlan} />

      {!plan && (
        <Button onClick={generatePlan} disabled={planLoading} size="lg" className="w-full bg-green-600 hover:bg-green-700">
          <Brain className="h-4 w-4 mr-2" />{planLoading ? "AI 正在生成学习计划..." : "AI 生成学习计划"}
        </Button>
      )}

      {plan && (
        <Card>
          <CardHeader><CardTitle>AI 学习计划</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {plan.days.slice(0, 7).map((day, i) => (
              <div key={i} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">第 {i + 1} 天 · {day.date}</h4>
                <div className="space-y-2">
                  {day.tasks.map((task, j) => (
                    <div key={j} className="flex items-start gap-3 text-sm p-2 rounded bg-muted/50">
                      <Badge variant="outline" className="mt-0.5 text-xs">{task.taskType}</Badge>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-muted-foreground">{task.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={onRetry} className="w-full"><RefreshCw className="h-4 w-4 mr-2" />重新练习</Button>
    </div>
  )
}
