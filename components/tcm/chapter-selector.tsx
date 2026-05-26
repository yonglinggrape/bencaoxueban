"use client"

import { cn } from "@/lib/utils"
import { BookOpen, Clock, Leaf } from "lucide-react"

export interface ChapterInfo {
  id: string
  name: string
  hours: number
  herbCount: number
  questionCount: number
  topicId: string | null
}

interface ChapterSelectorProps {
  chapters: ChapterInfo[]
  selected: string[]
  onChange: (ids: string[]) => void
  multiSelect: boolean
}

export function ChapterSelector({ chapters, selected, onChange, multiSelect }: ChapterSelectorProps) {
  function toggle(id: string) {
    if (multiSelect) {
      onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
    } else {
      onChange(selected.includes(id) ? [] : [id])
    }
  }

  const selectAll = () => onChange(chapters.map(c => c.topicId).filter(Boolean) as string[])
  const clearAll = () => onChange([])

  return (
    <div>
      {multiSelect && (
        <div className="flex gap-2 mb-3">
          <button onClick={selectAll} className="text-xs text-green-600 hover:underline">全选</button>
          <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">清除</button>
          {selected.length > 0 && (
            <span className="text-xs text-muted-foreground">已选 {selected.length} 个章节</span>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {chapters.map(ch => {
          const isSelected = selected.includes(ch.topicId || ch.id)
          return (
            <button
              key={ch.id}
              onClick={() => toggle(ch.topicId || ch.id)}
              className={cn(
                "text-left p-3 rounded-lg border transition-all",
                isSelected
                  ? "border-green-500 bg-green-50 dark:bg-green-950 ring-1 ring-green-500"
                  : "border-border hover:border-green-300 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <BookOpen className={cn("h-4 w-4 flex-shrink-0", isSelected ? "text-green-600" : "text-muted-foreground")} />
                <span className="text-sm font-medium truncate">{ch.name}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5"><Leaf className="h-3 w-3" />{ch.herbCount}味</span>
                <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{ch.hours}课时</span>
                {ch.questionCount > 0 && <span>{ch.questionCount}题</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
