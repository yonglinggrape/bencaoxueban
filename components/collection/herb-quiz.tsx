"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Brain, ArrowRight, ArrowLeft, RefreshCw, CheckCircle, XCircle } from "lucide-react"

interface HerbData {
  id: string; name: string; latinName: string | null; category: string; rarity: string
  properties: string | null; effects: string | null; usage: string | null; mnemonic: string | null
  topicId: string | null; masteryLevel: string | null
  topic: { id: string; name: string } | null
}

interface QuizQuestion {
  id: string; content: string; questionType: string
  options: { label: string; text: string }[]; correctAnswer: string; explanation: string; difficulty: string
  domainId: string; topicId: string
}

type Phase = "idle" | "quiz" | "result"

export function HerbQuiz({ herb, userId }: { herb: HerbData; userId: string }) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<{ correct: number; wrong: number; items: Record<string, { correct: boolean; explanation: string }> } | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/ai/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: herb.topicId,
          herbName: herb.name,
          topicName: herb.topic?.name,
          count: 5,
          saveToDb: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成失败")
      setQuestions(data.questions || [])
      setCurrentIdx(0)
      setAnswers({})
      setResults(null)
      setPhase("quiz")
    } catch {
      toast.error("生成失败，请重试")
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmit() {
    if (!userId) { toast.error("请先登录"); return }
    setSubmitting(true)

    let correct = 0
    let wrong = 0
    const items: Record<string, { correct: boolean; explanation: string }> = {}

    for (const q of questions) {
      const userAnswer = answers[q.id] || ""
      const isCorrect = userAnswer === q.correctAnswer
      if (isCorrect) correct++; else wrong++
      items[q.id] = { correct: isCorrect, explanation: q.explanation }

      try {
        await fetch("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            questionId: q.id,
            userAnswer,
            isCorrect,
            domainId: q.domainId,
            topicId: q.topicId,
          }),
        })
      } catch { /* non-critical */ }
    }

    setResults({ correct, wrong, items })
    setPhase("result")
    setSubmitting(false)
    toast.success(`评测完成！正确 ${correct}/${questions.length}`)
  }

  function resetQuiz() {
    setPhase("idle")
    setQuestions([])
    setAnswers({})
    setResults(null)
  }

  // ====== Idle: Generate button ======
  if (phase === "idle") {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg border border-green-200 bg-green-50/30 dark:bg-green-950/10">
          <h4 className="font-medium text-sm mb-2 text-green-700 flex items-center gap-1.5">
            <Brain className="h-4 w-4" />智能题库
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            AI 根据{herb.name}的知识点生成练习题，可在此作答并自动记录错题。
          </p>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="bg-green-600 hover:bg-green-700"
          >
            <Brain className="h-4 w-4 mr-1.5" />
            {generating ? "生成中..." : `生成${herb.name}练习题`}
          </Button>
        </div>
      </div>
    )
  }

  // ====== Quiz: Answer questions ======
  if (phase === "quiz") {
    const q = questions[currentIdx]
    if (!q) return null
    const isLast = currentIdx === questions.length - 1
    const answered = !!answers[q.id]

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{currentIdx + 1} / {questions.length}</Badge>
          <button onClick={resetQuiz} className="text-sm text-muted-foreground hover:text-foreground">← 返回</button>
        </div>
        <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-2" />

        <div className="p-4 rounded-lg border">
          <h4 className="font-medium mb-4">{q.content}</h4>
          <RadioGroup
            value={answers[q.id] || ""}
            onValueChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
          >
            <div className="space-y-2">
              {q.options.map((opt) => (
                <label
                  key={opt.label}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    answers[q.id] === opt.label
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "hover:bg-muted"
                  }`}
                >
                  <RadioGroupItem value={opt.label} id={`q-${q.id}-${opt.label}`} />
                  <Label htmlFor={`q-${q.id}-${opt.label}`} className="flex-1 cursor-pointer text-sm">
                    <span className="font-medium mr-2">{opt.label}.</span>{opt.text}
                  </Label>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(i => i - 1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />上一题
          </Button>
          {isLast ? (
            <Button
              onClick={handleSubmit}
              disabled={!answered || submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? "提交中..." : "提交评测"}
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => setCurrentIdx(i => i + 1)} disabled={!answered}>
              下一题<ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ====== Result: Show score ======
  if (phase === "result" && results) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg border text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{results.correct}/{questions.length}</div>
          <p className="text-sm text-muted-foreground">
            正确 {results.correct} 题，错误 {results.wrong} 题
            {results.wrong > 0 && "，错题已自动记录到错题本"}
          </p>
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => {
            const r = results.items[q.id]
            const userAnswer = answers[q.id] || ""
            return (
              <div key={q.id} className={`p-3 rounded-lg border ${r.correct ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}`}>
                <div className="flex items-start gap-2">
                  {r.correct
                    ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    : <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{i + 1}. {q.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      你的答案：{userAnswer || "未作答"}
                      {!r.correct && <> · 正确答案：{q.correctAnswer}</>}
                    </p>
                    {!r.correct && r.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">解析：{r.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={generating} className="flex-1 bg-green-600 hover:bg-green-700">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            {generating ? "生成中..." : "重新生成"}
          </Button>
          <Button variant="outline" onClick={resetQuiz}>
            返回
          </Button>
        </div>
      </div>
    )
  }

  return null
}
