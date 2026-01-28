'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type PageActionsContextValue = {
  actions: React.ReactNode | null
  setActions: (actions: React.ReactNode | null) => void
}

const PageActionsContext = createContext<PageActionsContextValue | null>(null)

export function PageActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<React.ReactNode | null>(null)

  return (
    <PageActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </PageActionsContext.Provider>
  )
}

export function PageActionsSlot({ className }: { className?: string }) {
  const context = useContext(PageActionsContext)
  if (!context?.actions) return null

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {context.actions}
    </div>
  )
}

export function PageActions({ children }: { children: React.ReactNode }) {
  const context = useContext(PageActionsContext)
  if (!context) {
    throw new Error('PageActions must be used within PageActionsProvider.')
  }

  useEffect(() => {
    context.setActions(children)
    return () => context.setActions(null)
  }, [children, context])

  return null
}
