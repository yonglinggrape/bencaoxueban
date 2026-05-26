import type { Metadata } from "next"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "本草学伴 — 中药学 AI 学习平台",
  description: "AI 驱动中药学学习，精准诊断薄弱点，轻松掌握各类中药",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased" style={{ fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif' }}>
        <Providers>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
