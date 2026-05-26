"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Sparkles, CheckCircle, XCircle, BookOpen, Send } from "lucide-react"

interface SimilarQuestion {
  id: string
  content: string
  options: { label: string; text: string }[]
  correctAnswer: string
  explanation: string
  difficulty: string
  generatedForCategory: string
}

interface SimilarQuestionPanelProps {
  questions: SimilarQuestion[]
  userId: string
  onAddToPlan: () => void
}

const DIFFICULTY_LABELS: Record<string, string> = { easy: "简单", medium: "中等", hard: "困难" }

export function SimilarQuestionPanel({ questions, userId, onAddToPlan }: SimilarQuestionPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [planAdded, setPlanAdded] = useState(false)

  function checkAnswer(qId: string) {
    setRevealed(prev => ({ ...prev, [qId]: true }))
  }

  async function addToPlan() {
    setPlanAdded(true)
    onAddToPlan()
  }

  if (questions.length === 0) return null

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-amber-500" />
          同类药材巩固练习
        </CardTitle>
        <CardDescription>
          基于你的错题，AI 为你在 <Badge variant="outline" className="mx-1 text-xs">{questions[0]?.generatedForCategory}</Badge> 章节中生成了同类药材对比练习题，帮助你辨析相似药材。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q, qi) => {
          const userAnswer = answers[q.id]
          const isRevealed = revealed[q.id]
          const isCorrect = userAnswer === q.correctAnswer

          return (
            <div key={q.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">{qi + 1}. {q.content}</h4>
                <Badge variant="secondary" className="text-xs">{DIFFICULTY_LABELS[q.difficulty] || q.difficulty}</Badge>
              </div>

              <RadioGroup
                value={userAnswer || ""}
                onValueChange={(v) => { if (!isRevealed) setAnswers(prev => ({ ...prev, [q.id]: v })) }}
              >
                <div className="space-y-2">
                  {q.options.map(opt => (
                    <label
                      key={opt.label}
                      className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer transition-colors ${
                        isRevealed
                          ? opt.label === q.correctAnswer
                            ? "border-green-500 bg-green-50 dark:bg-green-950"
                            : userAnswer === opt.label
                            ? "border-red-500 bg-red-50 dark:bg-red-950"
                            : "border-border"
                          : userAnswer === opt.label
                          ? "border-green-500 bg-green-50 dark:bg-green-950"
                          : "hover:bg-muted"
                      }`}
                    >
                      <RadioGroupItem value={opt.label} id={`${q.id}-${opt.label}`} disabled={isRevealed} />
                      <Label htmlFor={`${q.id}-${opt.label}`} className="flex-1 cursor-pointer text-sm">
                        <span className="font-medium mr-1">{opt.label}.</span>{opt.text}
                      </Label>
                      {isRevealed && opt.label === q.correctAnswer && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                      {isRevealed && userAnswer === opt.label && opt.label !== q.correctAnswer && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                    </label>
                  ))}
                </div>
              </RadioGroup>

              {!isRevealed && userAnswer && (
                <Button onClick={() => checkAnswer(q.id)} size="sm" variant="outline" className="mt-3">
                  <Send className="h-3 w-3 mr-1" />检查答案
                </Button>
              )}

              {isRevealed && (
                <div className={`mt-3 p-3 rounded-md text-sm ${isCorrect ? "bg-green-50 dark:bg-green-950" : "bg-amber-50 dark:bg-amber-950"}`}>
                  <p className="font-medium">{isCorrect ? "回答正确！" : `正确答案: ${q.correctAnswer}`}</p>
                  <p className="text-muted-foreground mt-1">{q.explanation}</p>
                </div>
              )}
            </div>
          )
        })}

        {/* Add to plan button */}
        <Button
          onClick={addToPlan}
          disabled={planAdded}
          variant="outline"
          className="w-full border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          {planAdded ? "已加入学习计划" : "加入学习计划"}
        </Button>
      </CardContent>
    </Card>
  )
}
