import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/layout/auth-shell'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  return <AuthShell>{children}</AuthShell>
}
