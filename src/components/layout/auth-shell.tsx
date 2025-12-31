'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'
import { PageActionsProvider, PageActionsSlot } from '@/components/layout/page-actions'

export function AuthShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const isAIAgentView = pathname === '/ai-agent'
  const isCollapsed = isAIAgentView ? true : collapsed

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close mobile sidebar on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <PageActionsProvider>
      <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={isCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content */}
        <div className={cn(
          'transition-all duration-200',
          'lg:ml-56',
          isCollapsed && 'lg:ml-16'
        )}>
          <Header
            collapsed={isCollapsed}
            onToggle={() => {
              if (isAIAgentView) return
              setCollapsed((prev) => !prev)
            }}
            onMobileMenuClick={() => setMobileOpen(true)}
          />
          <main className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <Breadcrumb className="mb-0" />
              <PageActionsSlot />
            </div>
            {children}
          </main>
        </div>
      </div>
    </PageActionsProvider>
  )
}
