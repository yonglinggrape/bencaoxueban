"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Gem, Zap, Leaf, Award, Target, TrendingUp } from "lucide-react"
import { getLevelInfo } from "@/lib/game/levels"

export default function ProfilePage() {
  const { data: session } = useSession()
  const user = session?.user as Record<string, unknown> | undefined
  const [stats, setStats] = useState<Record<string, number>>({})
  const exp = (user?.exp as number) || 0
  const levelInfo = getLevelInfo(exp)

  useEffect(() => {
    if (user?.id) fetch(`/api/user/progress?userId=${user.id}`).then(r => r.json()).then(d => setStats(d.stats || {}))
  }, [user?.id])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 border-4 border-green-400 mb-4">
            <AvatarFallback className="bg-green-200 text-green-800 text-3xl">{(user?.name as string)?.slice(0, 2) || "本"}</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold">{user?.name || "本草学子"}</h1>
          <div className="flex gap-3 mt-3">
            <Badge className="gap-1"><Zap className="h-3 w-3" />Lv.{levelInfo.level}</Badge>
            <Badge variant="secondary" className="gap-1"><Leaf className="h-3 w-3" />{stats.herbCards || 0} 药卡</Badge>
            <Badge variant="outline" className="gap-1"><Gem className="h-3 w-3" />{user?.points || 0} 积分</Badge>
          </div>
          <div className="w-full max-w-xs mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>学习进度</span><span>{Math.round(levelInfo.progress * 100)}%</span></div>
            <Progress value={levelInfo.progress * 100} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">总经验：{exp}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ icon: Target, label: "答题总数", value: stats.totalQuestions || 0 },
          { icon: TrendingUp, label: "正确率", value: `${Math.round((stats.correctRate || 0) * 100)}%` },
          { icon: Leaf, label: "收集药卡", value: stats.herbCards || 0 },
          { icon: Award, label: "成就", value: stats.achievements || 0 }].map(s => (
          <Card key={s.label}><CardContent className="pt-6 text-center">
            <s.icon className="h-5 w-5 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>学习等级</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-green-600">Lv.{levelInfo.level}</p>
            <Progress value={levelInfo.progress * 100} className="h-3 mt-3" />
            <p className="text-sm text-muted-foreground mt-2">
              距离 Lv.{levelInfo.level + 1} 还需 {levelInfo.expToNext - levelInfo.expInCurrentLevel} 经验
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
