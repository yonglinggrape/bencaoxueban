"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { BookOpen, ChevronDown, ChevronUp, CheckCircle, XCircle, Trash2, RefreshCw, Brain } from "lucide-react"

interface MistakeItem {
  id: string; questionId: string; content: string
  options: { label: string; text: string }[]; correctAnswer: string
  userAnswer: string; explanation: string | null; createdAt: string
}

interface MistakeGroup {
  topicId: string; topicName: string; count: number; mistakes: MistakeItem[]
}

interface MistakeNotebookProps {
  userId: string
  onRedoQuestion: (questionId: string) => void
}

export function MistakeNotebook({ userId, onRedoQuestion }: MistakeNotebookProps) {
  const [groups, setGroups] = useState<MistakeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [redoing, setRedoing] = useState<Record<string, { show: boolean; answer: string; result: "correct" | "wrong" | null }>>({})
  const [generatingFor, setGeneratingFor] = useState<Record<string, boolean>>({})

  async function generateSimilarForMistake(mistakeId: string, topicName: string, topicId: string, content: string) {
    setGeneratingFor(prev => ({ ...prev, [mistakeId]: true }))
    try {
      const res = await fetch("/api/ai/similar-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicName, originalQuestionContent: content, topicId, domainId: "HERBOLOGY", count: 3 }),
      })
      const data = await res.json()
      toast.success(`已生成 ${data.count} 道同类药材练习题`, {
        description: "题目已保存到题库，可在章节练习中找到",
      })
    } catch {
      toast.error("生成失败，请重试")
    } finally {
      setGeneratingFor(prev => {
        const next = { ...prev }
        delete next[mistakeId]
        return next
      })
    }
  }

  const fetchMistakes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mistakes?userId=${userId}`)
      const data = await res.json()
      setGroups(data.groups || [])
      // Auto-expand first group
      if (data.groups?.length > 0) {
        setExpanded(prev => ({ ...prev, [data.groups[0].topicId]: true }))
      }
    } catch { toast.error("加载错题失败") }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { if (userId) fetchMistakes() }, [userId, fetchMistakes])

  async function resolveMistakes(ids: string[]) {
    try {
      await fetch("/api/mistakes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      // Remove from local state
      setGroups(prev => prev.map(g => ({
        ...g,
        mistakes: g.mistakes.filter(m => !ids.includes(m.id)),
        count: g.count - ids.filter(id => g.mistakes.some(m => m.id === id)).length,
      })).filter(g => g.mistakes.length > 0))
      toast.success("已标记为掌握")
    } catch { toast.error("操作失败") }
  }

  async function resolveGroup(topicId: string) {
    const group = groups.find(g => g.topicId === topicId)
    if (group) resolveMistakes(group.mistakes.map(m => m.id))
  }

  function checkInlineAnswer(mistakeId: string, answer: string, correctAnswer: string) {
    setRedoing(prev => ({
      ...prev,
      [mistakeId]: { show: true, answer, result: answer === correctAnswer ? "correct" : "wrong" },
    }))
  }

  function toggleGroup(topicId: string) {
    setExpanded(prev => ({ ...prev, [topicId]: !prev[topicId] }))
  }

  if (loading) {
    return <Card><CardContent className="pt-6 text-center"><p className="text-muted-foreground">加载错题中...</p></CardContent></Card>
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-green-300 mb-3" />
          <p className="text-lg font-medium mb-1">暂无错题</p>
          <p className="text-sm text-muted-foreground">继续保持，你的学习状态很好！</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">共 {groups.reduce((s, g) => s + g.count, 0)} 道错题，分布在 {groups.length} 个章节</div>

      {groups.map(group => (
        <Card key={group.topicId} className="overflow-hidden">
          <button
            onClick={() => toggleGroup(group.topicId)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-amber-500" />
              <div className="text-left">
                <h3 className="font-medium">{group.topicName}</h3>
                <p className="text-sm text-muted-foreground">{group.count} 道错题</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1 rounded-md hover:bg-muted transition-colors" onClick={(e) => { e.stopPropagation(); resolveGroup(group.topicId) }}>
                <Trash2 className="h-4 w-4" />全部掌握
              </span>
              {expanded[group.topicId] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </button>

          {expanded[group.topicId] && (
            <CardContent className="border-t space-y-4 pt-4">
              {group.mistakes.map(m => (
                <div key={m.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{m.content}</p>
                    <Badge variant="secondary" className="text-xs">{new Date(m.createdAt).toLocaleDateString("zh-CN")}</Badge>
                  </div>

                  {/* Show the wrong answer highlight */}
                  <div className="space-y-2">
                    {m.options.map(opt => (
                      <div key={opt.label} className={`flex items-center gap-2 text-sm p-2 rounded ${
                        opt.label === m.userAnswer
                          ? "bg-red-50 dark:bg-red-950 border border-red-300"
                          : opt.label === m.correctAnswer
                          ? "bg-green-50 dark:bg-green-950 border border-green-300"
                          : "opacity-60"
                      }`}>
                        <span className="font-medium">{opt.label}.</span>
                        <span>{opt.text}</span>
                        {opt.label === m.userAnswer && <XCircle className="h-4 w-4 text-red-500 ml-auto" />}
                        {opt.label === m.correctAnswer && opt.label !== m.userAnswer && <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />}
                      </div>
                    ))}
                  </div>

                  {m.explanation && (
                    <div className="p-3 rounded-md bg-muted/50 text-sm">
                      <span className="font-medium">解析：</span>
                      <span className="text-muted-foreground">{m.explanation}</span>
                    </div>
                  )}

                  {/* Inline redo */}
                  {redoing[m.id]?.show ? (
                    <div className={`p-3 rounded-md text-sm ${redoing[m.id].result === "correct" ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}>
                      <p className="font-medium">{redoing[m.id].result === "correct" ? "回答正确！" : "回答错误"}</p>
                      <Button variant="ghost" size="sm" onClick={() => setRedoing(prev => ({ ...prev, [m.id]: { show: false, answer: "", result: null } }))}>重新回答</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">重新作答：</p>
                      <RadioGroup value="" onValueChange={(v: string) => checkInlineAnswer(m.id, v, m.correctAnswer)}>
                        <div className="space-y-1">
                          {m.options.map(opt => (
                            <label key={opt.label} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted cursor-pointer">
                              <RadioGroupItem value={opt.label} id={`redo-${m.id}-${opt.label}`} />
                              <Label htmlFor={`redo-${m.id}-${opt.label}`} className="cursor-pointer">{opt.label}. {opt.text}</Label>
                            </label>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => onRedoQuestion(m.questionId)}>
                      <RefreshCw className="h-3 w-3 mr-1" />进入重做
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                      disabled={generatingFor[m.id]}
                      onClick={() => generateSimilarForMistake(m.id, group.topicName, group.topicId, m.content)}
                    >
                      <Brain className="h-3 w-3 mr-1" />
                      {generatingFor[m.id] ? "生成中..." : "AI同类题"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => resolveMistakes([m.id])}>
                      <CheckCircle className="h-3 w-3 mr-1" />已掌握
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
