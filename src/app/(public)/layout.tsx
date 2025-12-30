import { TRPCProvider } from '@/lib/trpc-client'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TRPCProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </TRPCProvider>
  )
}
