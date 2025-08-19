import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@workspace/database'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Dummy hash for timing attack prevention
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('this-is-a-dummy-password', 10)

const CredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials)
        if (!parsed.success) return null
        
        const { email, password } = parsed.data

        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1)

          if (!user) {
            // Prevent timing attacks by doing dummy hash comparison
            await bcrypt.compare(password, DUMMY_PASSWORD_HASH)
            return null
          }

          const isValidPassword = await bcrypt.compare(password, user.password)
          if (!isValidPassword) {
            return null
          }

          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch {
          if (process.env.NODE_ENV === 'development') {
            // Keep logs generic and avoid PII
            console.error('Auth error')
          }
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Ensure sub is set; some flows may omit it
        token.sub = token.sub ?? String((user as any).id)
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.sub === 'string') {
          session.user.id = token.sub
        }
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
}