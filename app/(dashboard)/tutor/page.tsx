"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { MessageCircle, Send, User, Leaf, Loader2, Plus, Trash2, History } from "lucide-react"

interface Message { id?: string; role: string; content: string; createdAt?: string }
interface SessionInfo { id: string; title: string; updatedAt: string; messageCount: number }

export default function TutorPage() {
  const { data: session } = useSession()
  const user = session?.user as Record<string, unknown> | undefined
  const userId = user?.id as string || ""
  const userName = (user?.name as string) || "本草学子"
  const level = (user?.level as number) || 1

  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [sessionId, setSessionId] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load sessions list on mount
  useEffect(() => {
    if (!userId) return
    fetch(`/api/ai/chat/sessions?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        setSessions(d.sessions || [])
        if (d.sessions?.length > 0 && !sessionId) {
          loadSession(d.sessions[0].id)
        }
      })
  }, [userId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  async function loadSession(id: string) {
    setSessionId(id)
    setMessages([])
    try {
      const res = await fetch(`/api/ai/chat?sessionId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch { /* empty */ }
  }

  async function newSession() {
    setSessionId("")
    setMessages([])
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput("")
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: "user", content: msg }])
    setLoading(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          message: msg,
          context: { userId, userName, level },
        }),
      })
      const data = await res.json()
      if (!sessionId) {
        setSessionId(data.sessionId)
        // Refresh sessions list
        fetch(`/api/ai/chat/sessions?userId=${userId}`)
          .then(r => r.json())
          .then(d => setSessions(d.sessions || []))
      }
      setMessages(prev => [...prev, { id: data.messageId || `assistant-${Date.now()}`, role: "assistant", content: data.reply }])
    } catch { toast.error("回复失败") }
    finally { setLoading(false) }
  }

  async function deleteMessage(msgId?: string) {
    if (!msgId || msgId.startsWith("user-")) return
    try {
      await fetch("/api/ai/chat/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId }),
      })
      setMessages(prev => prev.filter(m => m.id !== msgId))
      // Refresh sessions count
      fetch(`/api/ai/chat/sessions?userId=${userId}`)
        .then(r => r.json())
        .then(d => setSessions(d.sessions || []))
    } catch { toast.error("删除失败") }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Session list sidebar - desktop */}
      <div className="hidden lg:block w-56 flex-shrink-0">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1"><History className="h-4 w-4" />会话记录</CardTitle>
              <Button variant="ghost" size="icon" onClick={newSession} title="新建会话"><Plus className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-0.5 px-2 pb-2">
                {sessions.map(s => (
                  <div key={s.id} className="group relative">
                    <button
                      onClick={() => loadSession(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        sessionId === s.id
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="truncate font-medium pr-5">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.messageCount} 条消息</div>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!confirm("删除此会话？")) return
                        await fetch("/api/ai/chat/sessions", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ sessionId: s.id }),
                        })
                        if (sessionId === s.id) { setSessionId(""); setMessages([]) }
                        setSessions(prev => prev.filter(x => x.id !== s.id))
                      }}
                      className="absolute top-2 right-2 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-500 transition-colors"
                      title="删除会话"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="text-xs text-muted-foreground px-3 py-4 text-center">暂无历史会话</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />AI 导师
            </h1>
            <Badge variant="secondary">本草助手</Badge>
          </div>
          {/* Mobile session selector */}
          <div className="lg:hidden flex items-center gap-2">
            <Select value={sessionId} onValueChange={loadSession}>
              <SelectTrigger className="w-36 text-xs">
                <SelectValue placeholder="选择会话" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.title} ({s.messageCount})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={newSession}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
          <CardHeader className="border-b py-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8"><AvatarFallback className="bg-green-100 text-green-800"><Leaf className="h-4 w-4" /></AvatarFallback></Avatar>
              <div>
                <span className="text-sm font-medium">本草助手</span>
                <p className="text-xs text-muted-foreground">中药学导师</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-12">
                    直接提问中药学相关问题，本草助手为你解答。
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div key={msg.id || i} className={`group flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`relative max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user" ? "bg-blue-100 dark:bg-blue-900" : "bg-muted"
                    }`}>
                      {msg.role === "user" ? (
                        <div className="flex items-center gap-1 mb-0.5">
                          <User className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-muted-foreground">{userName}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mb-0.5">
                          <Leaf className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-muted-foreground">本草助手</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {/* Delete button - visible on hover */}
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-500 transition-colors border border-red-200"
                        title="删除此消息"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t flex gap-2 flex-shrink-0">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="输入中药学问题..."
                className="min-h-[40px] max-h-[120px] resize-none text-sm"
                rows={1}
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon" className="flex-shrink-0 bg-green-600 hover:bg-green-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
