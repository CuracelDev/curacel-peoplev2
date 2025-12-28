'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { cn } from '@/lib/utils'

export function AuthShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const isAIAgentView = pathname === '/ai-agent'
  const isCollapsed = isAIAgentView ? true : collapsed

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={isCollapsed} />
      <div className={cn('transition-all duration-200', isCollapsed ? 'ml-16' : 'ml-64')}>
        <Header
          collapsed={isCollapsed}
          onToggle={() => {
            if (isAIAgentView) return
            setCollapsed((prev) => !prev)
          }}
        />
        <main className="px-4 py-4">{children}</main>
      </div>
    </div>
  )
}
