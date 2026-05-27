"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  LayoutDashboard, BookOpen, PenLine, Leaf, Trophy, MessageCircle, User, LogOut, Menu, X, ChevronLeft, Gem, Zap
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/home", label: "学习台", icon: LayoutDashboard },
  { href: "/collection", label: "本草药典", icon: Leaf },
  { href: "/learning", label: "学习计划", icon: BookOpen },
  { href: "/quiz", label: "智能练习", icon: PenLine },
  { href: "/leaderboard", label: "学伴榜", icon: Trophy },
  { href: "/tutor", label: "AI 导师", icon: MessageCircle },
  { href: "/profile", label: "个人中心", icon: User },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const user = session?.user as Record<string, unknown> | undefined

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col bg-green-800 dark:bg-stone-950 border-r border-green-700/30 transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}>
        <div className="flex items-center gap-2 p-4 border-b border-green-700/30">
          {!collapsed && (
            <>
              <Leaf className="h-6 w-6 text-green-300" />
              <span className="font-bold text-green-100 text-lg">本草学伴</span>
            </>
          )}
          <Button variant="ghost" size="icon" className="ml-auto text-green-300 hover:text-green-100" onClick={() => setCollapsed(!collapsed)}>
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>
        <ScrollArea className="flex-1 py-2">
          {NAV_ITEMS.map(item => (
            <Tooltip key={item.href}>
              <TooltipTrigger>
                <Link href={item.href} className={cn(
                  "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors",
                  pathname === item.href ? "bg-green-700/50 text-green-100" : "text-green-200/70 hover:text-green-100 hover:bg-green-800/30"
                )}>
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
            </Tooltip>
          ))}
        </ScrollArea>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-56 bg-green-800 dark:bg-stone-950 p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-green-100">本草学伴</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}><X className="h-4 w-4 text-green-300" /></Button>
            </div>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1",
                pathname === item.href ? "bg-green-700/50 text-green-100" : "text-green-200/70 hover:text-green-100"
              )}>
                <item.icon className="h-4 w-4" /><span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 h-14 border-b bg-white dark:bg-stone-900 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Badge variant="secondary" className="gap-1">
            <Zap className="h-3 w-3" /> Lv.{(user?.level as number) || 1}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Gem className="h-3 w-3" /> {(user?.points as number) || 0}
          </Badge>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-green-200 text-green-800 text-xs">
              {(user?.name as string)?.slice(0, 2) || "本"}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
