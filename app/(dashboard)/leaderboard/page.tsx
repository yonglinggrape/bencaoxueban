"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trophy, Zap, Crown, Medal } from "lucide-react"

interface LeaderboardUser {
  id: string; name: string; level: number; exp: number; streak: number
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/leaderboard").then(r => r.json()).then(d => { setUsers(d.users || []); setLoading(false) })
  }, [])

  const sorted = [...users].sort((a, b) => b.exp - a.exp)
  const top3 = sorted.slice(0, 3)
  const rankIcons = [<Crown key="1" className="h-5 w-5 text-amber-400" />, <Medal key="2" className="h-5 w-5 text-slate-400" />, <Medal key="3" className="h-5 w-5 text-amber-700" />]

  if (loading) return <div className="max-w-3xl mx-auto"><Card><CardContent className="pt-6 text-center"><p className="text-muted-foreground">加载中...</p></CardContent></Card></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-green-500" />学伴榜</h1>

      {/* Top 3 */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-3 mb-6">
          {[top3[1], top3[0], top3[2]].map((u, i) => u && (
            <div key={u.id} className={`text-center ${i === 1 ? "-mt-2" : ""}`}>
              <Avatar className={`mx-auto mb-1 ${i === 1 ? "h-16 w-16 border-4 border-amber-400" : "h-12 w-12"}`}>
                <AvatarFallback className={i === 1 ? "bg-green-100 text-green-800 text-lg" : "bg-muted"}>{u.name?.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex justify-center">{rankIcons[[1, 2, 0][i]] || rankIcons[2]}</div>
              <p className="text-sm font-medium mt-1">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.exp} 经验</p>
            </div>
          ))}
        </div>
      )}

      {/* Full list */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {sorted.map((u, i) => (
              <div key={u.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <span className={`w-8 text-center font-bold text-sm ${i < 3 ? "text-green-500" : "text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <Avatar className="h-9 w-9"><AvatarFallback>{u.name?.slice(0, 2)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u.name}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs"><Zap className="h-3 w-3 mr-0.5" />Lv.{u.level}</Badge>
                    <span className="text-xs text-muted-foreground">连续 {u.streak} 天</span>
                  </div>
                </div>
                <span className="font-bold text-sm">{u.exp} 经验</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
