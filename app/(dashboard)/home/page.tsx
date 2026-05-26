"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BookOpen, PenLine, MessageCircle, Leaf, Gem, Zap, Flame, Sparkles } from "lucide-react"
import { getLevelInfo } from "@/lib/game/levels"

export default function DashboardHome() {
  const { data: session } = useSession()
  const user = session?.user as Record<string, unknown> | undefined
  const userId = user?.id as string || ""
  const exp = (user?.exp as number) || 0
  const levelInfo = getLevelInfo(exp)

  const [stats, setStats] = useState<Record<string, number>>({})

  useEffect(() => {
    if (userId) {
      fetch(`/api/user/progress?userId=${userId}`).then(r => r.json()).then(d => setStats(d.stats || {}))
    }
  }, [userId])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-green-100 via-emerald-50 to-amber-100 dark:from-green-950 dark:via-emerald-950/50 dark:to-amber-950 border-green-200">
        <CardContent className="pt-6 flex items-center gap-6">
          <Avatar className="h-20 w-20 border-4 border-green-400">
            <AvatarFallback className="bg-green-200 text-green-800 text-2xl">{(user?.name as string)?.slice(0, 2) || "本"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{(user?.name as string) || "本草学子"}，学习加油</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge className="gap-1 bg-green-600"><Zap className="h-3 w-3" />Lv.{levelInfo.level}</Badge>
              <Badge variant="secondary" className="gap-1"><Gem className="h-3 w-3" />{(user?.points as number) || 0} 积分</Badge>
              <Badge variant="outline" className="gap-1"><Leaf className="h-3 w-3" />{stats.herbCards || 0} 药卡</Badge>
              <Badge variant="outline" className="gap-1"><Flame className="h-3 w-3" />{stats.streak || 0} 天</Badge>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>学习进度</span><span>{Math.round(levelInfo.progress * 100)}%</span></div>
              <Progress value={levelInfo.progress * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">距下一级还需 {levelInfo.expToNext - levelInfo.expInCurrentLevel} 经验</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: "/quiz", icon: PenLine, label: "开始答题", color: "bg-blue-500" },
          { href: "/collection", icon: Leaf, label: "药卡图鉴", color: "bg-emerald-500" },
          { href: "/learning", icon: BookOpen, label: "学习计划", color: "bg-green-500" },
          { href: "/tutor", icon: MessageCircle, label: "AI 导师", color: "bg-purple-500" },
        ].map(item => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 hover:scale-[1.02] duration-200">
              <CardContent className="pt-6 text-center">
                <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="h-4 w-4 text-green-500" />学习数据</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "答题总数", value: stats.totalQuestions || 0, icon: PenLine },
              { label: "正确率", value: `${Math.round((stats.correctRate || 0) * 100)}%`, icon: Sparkles },
              { label: "收集药卡", value: stats.herbCards || 0, icon: Leaf },
              { label: "获得成就", value: stats.achievements || 0, icon: BookOpen },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-lg bg-muted/50">
                <s.icon className="h-4 w-4 mx-auto mb-1 text-green-500" />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
