"use client"

import { cn } from "@/lib/utils"
import { Leaf, Clock } from "lucide-react"

export interface ChapterSummary {
  id: string
  name: string
  hours: number
  herbCount: number
  questionCount: number
  topicId: string | null
  masterCount: number
  familiarCount: number
  understandCount: number
}

interface ChapterNavProps {
  chapters: ChapterSummary[]
  selectedId: string | "all"
  onSelect: (id: string) => void
}

export function ChapterNav({ chapters, selectedId, onSelect }: ChapterNavProps) {
  return (
    <nav className="space-y-1">
      <button
        onClick={() => onSelect("all")}
        className={cn(
          "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          selectedId === "all"
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          <Leaf className="h-4 w-4" />
          <span>全部章节</span>
        </div>
      </button>
      {chapters.map(ch => (
        <button
          key={ch.id}
          onClick={() => onSelect(ch.topicId || ch.id)}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg transition-colors",
            selectedId === (ch.topicId || ch.id)
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "hover:bg-muted"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate">{ch.name}</span>
            <span className="text-xs text-muted-foreground ml-1 flex-shrink-0">{ch.herbCount}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{ch.hours}课时</span>
          </div>
        </button>
      ))}
    </nav>
  )
}
