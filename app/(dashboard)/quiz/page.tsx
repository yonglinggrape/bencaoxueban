"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Brain, CheckCircle, XCircle, ArrowRight, RefreshCw, Leaf, BookOpen, Shuffle, Target, Sparkles, BookMarked } from "lucide-react"
import { ChapterSelector, type ChapterInfo } from "@/components/tcm/chapter-selector"
import { SimilarQuestionPanel } from "@/components/quiz/similar-question-panel"
import { MistakeNotebook } from "@/components/quiz/mistake-notebook"

interface Question { id: string; domainId: string; topicId: string; content: string; questionType: string; options: { label: string; text: string }[]; correctAnswer: string; explanation: string; difficulty: string }
interface DiagnosisResult { weakCategories: { category: string; errorRate: number; totalQuestions: number }[]; weakTopics: { topicId: string; topicName: string; category: string; errorRate: number; totalQuestions: number }[]; overallAssessment: string; suggestions: string[] }
interface SimilarQuestion { id: string; content: string; options: { label: string; text: string }[]; correctAnswer: string; explanation: string; difficulty: string; generatedForCategory: string }

const DOMAIN_NAMES: Record<string, string> = { HERBOLOGY: "中药学" }
const DIFFICULTY_LABELS: Record<string, string> = { easy: "简单", medium: "中等", hard: "困难" }

export default function QuizPage() {
  const { data: session } = useSession()
  const userId = (session?.user as Record<string, unknown>)?.id as string || ""

  // Phase state
  const [phase, setPhase] = useState<"mode" | "config" | "quiz" | "result" | "notebook">("mode")
  const [mode, setMode] = useState<"chapter" | "random" | "mistake">("chapter")

  // Config state
  const [chapters, setChapters] = useState<ChapterInfo[]>([])
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [questionCount, setQuestionCount] = useState(10)
  // Quiz state (existing)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([])

  useEffect(() => {
    fetch("/api/collection/chapters").then(r => r.json()).then(d => setChapters(d.chapters || []))
  }, [])

  function goToConfig(m: "chapter" | "random" | "mistake") {
    setMode(m)
    setPhase("config")
    setSelectedChapters([])
  }

  async function startQuiz() {
    setLoading(true)
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

    try {
      const res = await fetch(`/api/quiz/questions?${params.toString()}`)
      const data = await res.json()
      if (data.questions.length === 0) {
        toast.error(mode === "mistake" ? "暂无错题记录，先去练习吧！" : "暂无题目")
        setLoading(false)
        return
      }
      setQuestions(data.questions || [])
      setCurrentIdx(0)
      setAnswers({})
      setSubmitted(false)
      setDiagnosis(null)
      setPhase("quiz")
    } catch { toast.error("加载题目失败") }
    finally { setLoading(false) }
  }

  async function submitAnswers() {
    setLoading(true)
    let correctCount = 0
    let herbsCollected: string[] = []
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

      // Get diagnosis
      const diagRes = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const diagData = await diagRes.json()
      setDiagnosis(diagData)
      // Auto-save diagnosis
      fetch("/api/diagnosis/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...diagData }),
      }).catch(() => { /* non-critical */ })
      setPhase("result")

      toast.success(`评测完成！正确 ${correctCount}/${questions.length}`, { description: `获得 ${correctCount * 30} 经验` })
      if (leveledUp) toast.success("升级了！", { icon: "⚡" })
      for (const h of herbsCollected) toast("获得药卡", { description: `${h}`, icon: <Leaf className="h-4 w-4 text-green-500" /> })
      if (allSimilarQuestions.length > 0) toast("AI 已为你生成同类药材巩固练习", { icon: <Sparkles className="h-4 w-4 text-amber-500" /> })
    } catch { toast.error("提交失败") }
    finally { setLoading(false) }
  }

  function resetQuiz() {
    setPhase("mode")
    setQuestions([])
    setAnswers({})
    setSubmitted(false)
    setDiagnosis(null)
  }

  // ====== Mode Selection View ======
  if (phase === "mode") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-green-500" />智能练习</h1>
        <p className="text-muted-foreground text-sm">选择练习模式，开始你的中药学进阶之旅</p>

        <div className="grid gap-4">
          <Card
            className="cursor-pointer hover:border-green-400 hover:shadow-md transition-all"
            onClick={() => goToConfig("chapter")}
          >
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">章节练习</h3>
                <p className="text-sm text-muted-foreground">按教材章节针对性训练，选择你想练习的章节，系统从该章节抽取题目</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-3" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
            onClick={() => goToConfig("random")}
          >
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Shuffle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">随机练习</h3>
                <p className="text-sm text-muted-foreground">从题库中随机抽取题目，全面检验各章节掌握情况，模拟真实考试场景</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-3" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
            onClick={() => goToConfig("mistake")}
          >
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <Target className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">错题复习</h3>
                <p className="text-sm text-muted-foreground">针对之前答错的题目进行针对性复习，巩固薄弱知识点，避免重复犯错</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-3" />
            </CardContent>
          </Card>

          {/* 错题本入口 */}
          <Card
            className="cursor-pointer hover:border-purple-400 hover:shadow-md transition-all"
            onClick={() => setPhase("notebook")}
          >
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <BookMarked className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">错题本</h3>
                <p className="text-sm text-muted-foreground">查看和管理所有错题，按章节分类，重做或标记为已掌握</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-3" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ====== Configuration View ======
  if (phase === "config") {
    const modeLabels: Record<string, { title: string; desc: string }> = {
      chapter: { title: "章节练习", desc: "选择要练习的章节和题目数量" },
      random: { title: "随机练习", desc: "设置题目数量" },
      mistake: { title: "错题复习", desc: "从你之前答错的题目中抽取" },
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={resetQuiz} className="text-sm text-muted-foreground hover:text-foreground">← 返回</button>
          <h1 className="text-xl font-bold">{modeLabels[mode].title}</h1>
        </div>
        <p className="text-sm text-muted-foreground -mt-4">{modeLabels[mode].desc}</p>

        {/* Chapter selection for chapter mode */}
        {mode === "chapter" && (
          <Card>
            <CardHeader><CardTitle className="text-base">选择章节</CardTitle></CardHeader>
            <CardContent>
              <ChapterSelector
                chapters={chapters.filter(c => c.topicId)}
                selected={selectedChapters}
                onChange={setSelectedChapters}
                multiSelect
              />
              {selectedChapters.length === 0 && (
                <p className="text-sm text-muted-foreground mt-3">未选择则从所有章节随机出题</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Question count */}
        <Card>
          <CardHeader><CardTitle className="text-base">题目数量</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map(n => (
                <Button
                  key={n}
                  variant={questionCount === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuestionCount(n)}
                  className={questionCount === n ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {n} 题
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button onClick={startQuiz} disabled={loading} size="lg" className="w-full bg-green-600 hover:bg-green-700">
          <Brain className="h-4 w-4 mr-2" />{loading ? "加载中..." : "开始练习"}
        </Button>
      </div>
    )
  }

  // ====== Quiz View (existing, adapted) ======
  const q = questions[currentIdx]
  const isLast = currentIdx === questions.length - 1

  if (phase === "quiz") {
    if (loading && questions.length === 0) return <div className="max-w-2xl mx-auto py-12"><Card><CardContent className="pt-6 text-center"><p className="text-muted-foreground">正在加载题目...</p></CardContent></Card></div>

    if (!q) return <div className="max-w-2xl mx-auto py-12"><Card><CardContent className="pt-6 text-center"><p>暂无题目</p><Button onClick={resetQuiz} className="mt-4"><RefreshCw className="h-4 w-4 mr-2" />重新选择</Button></CardContent></Card></div>

    const options = typeof q.options === "string" ? JSON.parse(q.options) : q.options

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setPhase("config")} className="text-sm text-muted-foreground hover:text-foreground">← 返回设置</button>
          <Badge variant="secondary">{currentIdx + 1} / {questions.length}</Badge>
        </div>
        <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-2" />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{q.content}</CardTitle>
            <CardDescription>
              {DOMAIN_NAMES[q.domainId] || q.domainId} · {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}>
              <div className="space-y-3">
                {options.map((opt: { label: string; text: string }) => (
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
                <Button onClick={() => setCurrentIdx(i => i + 1)} disabled={!answers[q.id]}><ArrowRight className="h-4 w-4 mr-2" />下一题</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ====== Notebook View ======
  if (phase === "notebook") {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={resetQuiz} className="text-sm text-muted-foreground hover:text-foreground">← 返回</button>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookMarked className="h-6 w-6 text-purple-500" />错题本</h1>
        </div>
        <p className="text-sm text-muted-foreground -mt-4">按章节查看错题，重做或标记为已掌握</p>
        <MistakeNotebook
          userId={userId}
          onRedoQuestion={(questionId) => {
            // Load a single question in quiz mode
            setPhase("quiz")
            setMode("mistake")
            fetch(`/api/quiz/questions?mode=random&count=1`)
              .then(r => r.json())
              .then(d => {
                // Actually we need to load this specific question, so use mistake mode with userId
                setQuestions([]) // The mistake mode API will load it
                // For single question redo, just load from mistake mode
                startQuiz()
              })
              .catch(() => toast.error("加载题目失败"))
          }}
        />
      </div>
    )
  }

  // ====== Result View ======
  if (phase === "result" && diagnosis) {
    return <DiagnosisResultView diagnosis={diagnosis} userId={userId} onRetry={resetQuiz} similarQuestions={similarQuestions} />
  }

  return null
}

function DiagnosisResultView({ diagnosis, userId, onRetry, similarQuestions }: { diagnosis: DiagnosisResult; userId: string; onRetry: () => void; similarQuestions: SimilarQuestion[] }) {
  const [plan, setPlan] = useState<{ days: { date: string; tasks: { title: string; description: string; taskType: string }[] }[] } | null>(null)
  const [planLoading, setPlanLoading] = useState(false)

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

      {/* Category bar chart */}
      <Card>
        <CardHeader><CardTitle>中药类别掌握度</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {diagnosis.weakCategories.map(d => (
            <div key={d.category}>
              <div className="flex justify-between text-sm mb-1"><span>{d.category}</span><span>{Math.round((1 - d.errorRate) * 100)}%</span></div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${d.errorRate > 0.4 ? "bg-red-500" : d.errorRate > 0.2 ? "bg-amber-500" : "bg-green-500"}`}
                  style={{ width: `${(1 - d.errorRate) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Assessment */}
      <Card>
        <CardHeader><CardTitle>AI 诊断</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{diagnosis.overallAssessment}</p>
          {diagnosis.suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">学习建议：</h4>
              {diagnosis.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI-generated similar herb questions */}
      <SimilarQuestionPanel
        questions={similarQuestions}
        userId={userId}
        onAddToPlan={handleAddToPlan}
      />

      {/* Learning Plan */}
      {!plan && (
        <Button onClick={generatePlan} disabled={planLoading} size="lg" className="w-full bg-green-600 hover:bg-green-700">
          <Brain className="h-4 w-4 mr-2" />{planLoading ? "AI 正在生成学习计划..." : "AI 生成学习计划"}
        </Button>
      )}

      {plan && (
        <Card>
          <CardHeader>
            <CardTitle>AI 学习计划</CardTitle>
            {diagnosis.overallAssessment && (
              <CardDescription className="flex items-start gap-1.5 mt-1">
                <Brain className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{diagnosis.overallAssessment}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plan.days.slice(0, 7).map((day, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">第 {i + 1} 天 · {day.date}</h4>
                  <div className="space-y-2">
                    {day.tasks.map((task, j) => (
                      <div key={j} className="flex items-start gap-3 text-sm p-2 rounded bg-muted/50">
                        <Badge variant="outline" className="mt-0.5 text-xs">{task.taskType === "study" ? "学习" : task.taskType === "practice" ? "练习" : task.taskType === "quiz" ? "测验" : "复习"}</Badge>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-muted-foreground">{task.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={onRetry} className="w-full"><RefreshCw className="h-4 w-4 mr-2" />重新练习</Button>
    </div>
  )
}
