import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { name, email, passwordHash } = await req.json()
    if (!email || !passwordHash) return NextResponse.json({ error: "邮箱和密码必填" }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 })

    const user = await prisma.user.create({
      data: { name: name || "本草学子", email, passwordHash },
    })
    return NextResponse.json({ id: user.id, email: user.email })
  } catch (e) {
    console.error("[Register]", e)
    return NextResponse.json({ error: "注册失败" }, { status: 500 })
  }
}
