import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const { email, password } = credentials as { email: string; password: string }

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        // For simplicity during dev, accept any password if no hash stored
        if (user.passwordHash) {
          const valid = await compare(password, user.passwordHash)
          if (!valid) return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } })
        if (dbUser) {
          ;(session.user as Record<string, unknown>).id = dbUser.id
          ;(session.user as Record<string, unknown>).level = dbUser.level
          ;(session.user as Record<string, unknown>).exp = dbUser.exp
          ;(session.user as Record<string, unknown>).points = dbUser.points
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})
