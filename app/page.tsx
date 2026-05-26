import Link from "next/link"
import { Leaf, Brain, Library, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const FEATURES = [
  { icon: Brain, title: "AI 智能诊断", desc: "答题数据分析薄弱点，精准定位知识盲区" },
  { icon: Library, title: "海量题库", desc: "精选中药学考题，涵盖全部中药类别" },
  { icon: MessageCircle, title: "AI 导师", desc: "随时答疑解惑，生成专属记忆口诀" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-stone-50 to-green-50 dark:from-stone-950 dark:via-stone-900 dark:to-green-950">
      <section className="relative pt-24 pb-16 text-center px-4">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-sm">
            <Leaf className="h-4 w-4" /> 中药学 AI 学习平台
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-stone-800 dark:text-stone-100 mb-4">本草学伴</h1>
          <p className="text-xl md:text-2xl text-stone-500 dark:text-stone-400 mb-8">以 AI 辅助中药学习 · 精准诊断薄弱点 · 轻松掌握各类中药</p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8"><Link href="/login">开始学习</Link></Button>
            <Button asChild variant="outline" size="lg" className="px-8"><Link href="/register">注册账号</Link></Button>
          </div>
        </div>
      </section>
      <section className="py-16 px-4">
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <Card key={f.title} className="border-green-200/50 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/50">
                  <f.icon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-green-200/30">
        本草学伴 &copy; 2024 · 系统学习中药学 · 掌握每味药材
      </footer>
    </div>
  )
}
