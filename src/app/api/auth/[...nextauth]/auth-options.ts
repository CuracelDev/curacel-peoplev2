import { PrismaAdapter } from '@auth/prisma-adapter'
import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/password'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@company.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        const email = credentials.email.trim().toLowerCase()
        const password = credentials.password || ''

        const devPasswordless = process.env.DEV_PASSWORDLESS_LOGIN === 'true'
        const devAutoCreateSuperAdmin = process.env.DEV_AUTO_CREATE_SUPER_ADMIN === 'true'

        // Find user in database
        let user = await prisma.user.findUnique({ where: { email } })

        // Optional local bootstrap (development only)
        if (!user && devAutoCreateSuperAdmin) {
          user = await prisma.user.create({
            data: {
              email,
              name: email.split('@')[0],
              role: 'SUPER_ADMIN',
              passwordHash: password ? await hashPassword(password) : null,
              passwordSetAt: password ? new Date() : null,
            },
          })
        }

        if (!user) return null

        if (user.passwordHash) {
          if (!password) return null
          const ok = await verifyPassword({ password, passwordHash: user.passwordHash })
          if (!ok) return null
        } else {
          // No password set for this user
          if (!devPasswordless) return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.email) {
        const user = await prisma.user.findUnique({
          where: { email: token.email as string },
          include: { employee: true },
        })

        if (user) {
          session.user.id = user.id
          session.user.role = user.role
          session.user.employeeId = user.employeeId
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
