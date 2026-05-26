"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { BookOpen, Brain, Calendar, CheckCircle2, Circle, ArrowRight, Sparkles, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"

interface PlanTask { id: string; title: string; description: string; domainId: string; topicId: string; taskType: string; duration: number; completed: boolean }
interface PlanDay { date: string; tasks: PlanTask[] }
interface LearningPlan { id: string; userId: string; weekStart: string; weekEnd: string; days: PlanDay[]; isActive: boolean }
interface SavedDiagnosis { weakCategories: { category: string; errorRate: number; totalQuestions: number }[]; weakTopics: { topicId: string; topicName: string; errorRate: number }[]; overallAssessment: string; suggestions: string[]; createdAt: string }

export default function LearningPage() {
  const { data: session } = useSession()
  const userId = (session?.user as Record<string, unknown>)?.id as string || ""
  const router = useRouter()
  const [plan, setPlan] = useState<LearningPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [savedDiagnosis, setSavedDiagnosis] = useState<SavedDiagnosis | null>(null)
  const [todayExpanded, setTodayExpanded] = useState(false)
  const [refreshingDiagnosis, setRefreshingDiagnosis] = useState(false)

  async function refreshDiagnosis() {
    setRefreshingDiagnosis(true)
    try {
      const diagRes = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const diagData = await diagRes.json()
      await fetch("/api/diagnosis/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...diagData }),
      })
      setSavedDiagnosis(diagData)
      toast.success("诊断已更新")
    } catch { toast.error("诊断更新失败") }
    finally { setRefreshingDiagnosis(false) }
  }

  useEffect(() => {
    fetchPlan()
    fetchDiagnosis()
  }, [])

  async function fetchPlan() {
    setLoading(true)
    try {
      const res = await fetch(`/api/ai/plan?userId=${userId}`)
      if (res.ok) setPlan(await res.json())
    } catch { /* no plan yet */ }
    finally { setLoading(false) }
  }

  async function fetchDiagnosis() {
    try {
      const res = await fetch(`/api/diagnosis/save?userId=${userId}`)
      if (res.ok) setSavedDiagnosis(await res.json())
    } catch { /* no diagnosis yet */ }
  }

  async function generatePlan() {
    setGenerating(true)
    try {
      const res = await fetch("/api/ai/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "生成失败") }
      setPlan(await res.json())
      toast.success("AI 学习计划已生成！")
    } catch (e) { toast.error(e instanceof Error ? e.message : "生成失败") }
    finally { setGenerating(false) }
  }

  const today = new Date().toISOString().split("T")[0]
  const todayTasks = plan?.days?.find(d => d.date === today)?.tasks || []

  if (loading) return <div className="max-w-4xl mx-auto"><Card><CardContent className="pt-6 text-center"><p className="text-muted-foreground">加载中...</p></CardContent></Card></div>

  // ====== Empty Plan State ======
  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">学习计划</h1>

        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">还没有学习计划</h2>
            <p className="text-muted-foreground mb-6">先去"智能练习"完成初始评测，AI 将为你生成个性化学习计划。</p>
            <div className="flex gap-4 justify-center">
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => router.push("/quiz")}>去答题评测</Button>
              <Button onClick={generatePlan} disabled={generating} variant="outline"><Brain className="h-4 w-4 mr-2" />{generating ? "生成中..." : "直接生成计划"}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Weak Points from saved diagnosis */}
        {savedDiagnosis && <WeakPointsCard diagnosis={savedDiagnosis} onRefresh={refreshDiagnosis} refreshing={refreshingDiagnosis} />}

      </div>
    )
  }

  // ====== Plan View ======
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">学习计划</h1>
        <Badge variant="secondary"><Calendar className="h-3 w-3 mr-1" />{plan.weekStart} ~ {plan.weekEnd}</Badge>
      </div>

      {/* Today's Tasks */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setTodayExpanded(!todayExpanded)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-amber-500" />今日任务 · {today}</CardTitle>
            {todayExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </div>
        </CardHeader>
        {todayExpanded && (
        <CardContent>
          {todayTasks.length > 0 ? (
            <div className="space-y-3">
              {todayTasks.map(task => (
                <div key={task.id} className={`flex items-start gap-4 p-3 rounded-lg border ${task.completed ? "bg-green-50 dark:bg-green-950/30 border-green-200" : "bg-white dark:bg-stone-900"}`}>
                  {task.completed ? <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" /> : <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                      {task.title.includes("同类药材") || task.description?.includes("同类药材") ? (
                        <Badge className="text-xs bg-amber-100 text-amber-700"><Sparkles className="h-3 w-3 mr-0.5" />AI巩固</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">{task.taskType === "study" ? "学习" : task.taskType === "practice" ? "练习" : task.taskType === "quiz" ? "测验" : "复习"}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                  {!task.completed && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 flex-shrink-0"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/plan/tasks/complete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId, taskId: task.id }),
                          })
                          const data = await res.json()
                          if (data.completed) {
                            setPlan(prev => prev ? {
                              ...prev,
                              days: prev.days.map(d => ({
                                ...d,
                                tasks: d.tasks.map(t => t.id === task.id ? { ...t, completed: true } : t),
                              })),
                            } : null)
                            if (data.levelUp) toast.success("升级了！")
                            toast.success("任务完成，+20 经验")
                          }
                        } catch { toast.error("操作失败") }
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />完成
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : <p className="text-muted-foreground text-sm">今日暂无安排任务</p>}
        </CardContent>
        )}
      </Card>

{/* TODO: 本周计划暂注释
      <Card>
        <CardHeader>
          <CardTitle>本周计划</CardTitle>
          ...
        </CardHeader>
      </Card>
*/}

      {/* Weak Points */}
      {savedDiagnosis && <WeakPointsCard diagnosis={savedDiagnosis} onRefresh={refreshDiagnosis} refreshing={refreshingDiagnosis} />}

    </div>
  )
}

function WeakPointsCard({ diagnosis, onRefresh, refreshing }: { diagnosis: SavedDiagnosis; onRefresh: () => void; refreshing: boolean }) {
  const router = useRouter()

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            薄弱环节
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "诊断中..." : "重新诊断"}
          </Button>
        </div>
        <CardDescription>上次诊断于 {new Date(diagnosis.createdAt).toLocaleDateString("zh-CN")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {diagnosis.weakCategories.length > 0 ? (
          diagnosis.weakCategories.slice(0, 5).map(d => (
            <div key={d.category}>
              <div className="flex justify-between text-sm mb-1">
                <span>{d.category}</span>
                <span className="text-muted-foreground">{d.totalQuestions}题 · {Math.round((1 - d.errorRate) * 100)}%</span>
              </div>
              <Progress value={(1 - d.errorRate) * 100} className="h-2" />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">尚未收集到足够的答题数据</p>
        )}
        {diagnosis.overallAssessment && (
          <p className="text-sm text-muted-foreground mt-3">{diagnosis.overallAssessment}</p>
        )}

        {/* Suggestions with icons */}
        {diagnosis.suggestions.length > 0 && (
          <div className="space-y-1.5 mt-3">
            {diagnosis.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ArrowRight className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick guidance buttons */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1 border-green-300 hover:bg-green-50 text-sm" onClick={() => router.push("/quiz")}>
            <Brain className="h-3.5 w-3.5 mr-1" />去练习薄弱章节
          </Button>
          <Button size="sm" variant="outline" className="flex-1 border-green-300 hover:bg-green-50 text-sm" onClick={() => router.push("/collection")}>
            <BookOpen className="h-3.5 w-3.5 mr-1" />查看薄弱药材
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
