import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { getServerSession } from 'next-auth'
import { Providers } from '@/components/providers'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Curacel PeopleOS',
  description: 'Internal HR and People Operations Platform',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
