import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@workspace/database'
import { eq } from 'drizzle-orm'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('Authorization attempt for:', credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials')
          return null
        }

        try {
          console.log('Querying database for user...')
          const userResult = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email))
            .limit(1)

          const user = userResult[0]
          console.log('User found:', !!user)
          
          if (!user) {
            console.log('No user found with email:', credentials.email)
            return null
          }

          console.log('Comparing passwords...')
          const isValidPassword = await bcrypt.compare(credentials.password, user.password)
          console.log('Password valid:', isValidPassword)
          
          if (!isValidPassword) {
            console.log('Invalid password for user:', credentials.email)
            return null
          }

          console.log('Authentication successful for:', user.email)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error('Auth error:', error)
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
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
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