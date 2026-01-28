'use client'

import { TRPCProvider } from '@/lib/trpc-client'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TRPCProvider>
      <div className="min-h-screen bg-muted/50">
        {children}
      </div>
    </TRPCProvider>
  )
}
