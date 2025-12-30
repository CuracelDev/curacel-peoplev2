'use client'

import { useCallback, useEffect, useState } from 'react'

export type HiringFlow = {
  id: string
  name: string
  description: string
  stages: string[]
}

const STORAGE_KEY = 'curacel-hiring-flows'

const DEFAULT_HIRING_FLOWS: HiringFlow[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'General hiring flow for most roles',
    stages: ['Apply', 'HR Screen', 'Panel', 'Trial', 'Offer'],
  },
  {
    id: 'engineering',
    name: 'Engineering',
    description: 'Includes technical assessment',
    stages: ['Apply', 'HR', 'Kand.io', 'Technical', 'Panel'],
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Includes trial with POC goals',
    stages: ['Apply', 'HR Screen', 'Panel', 'POC Trial'],
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Multiple panels + references',
    stages: ['Apply', 'HR', 'Panels', 'References'],
  },
]

const cloneFlows = (flows: HiringFlow[]) =>
  flows.map((flow) => ({ ...flow, stages: [...flow.stages] }))

const isValidFlow = (value: HiringFlow) =>
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.description === 'string' &&
  Array.isArray(value.stages) &&
  value.stages.every((stage) => typeof stage === 'string')

const readStoredFlows = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as HiringFlow[]
    if (!Array.isArray(parsed) || !parsed.every(isValidFlow)) return null
    return parsed
  } catch {
    return null
  }
}

const writeStoredFlows = (flows: HiringFlow[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flows))
  window.dispatchEvent(new Event('hiring-flows-updated'))
}

export const getDefaultHiringFlows = () => cloneFlows(DEFAULT_HIRING_FLOWS)

export const useHiringFlows = () => {
  const [flows, setFlows] = useState<HiringFlow[]>(getDefaultHiringFlows())

  useEffect(() => {
    const stored = readStoredFlows()
    if (stored) setFlows(cloneFlows(stored))
  }, [])

  useEffect(() => {
    const handleSync = () => {
      const stored = readStoredFlows()
      if (stored) setFlows(cloneFlows(stored))
    }

    window.addEventListener('storage', handleSync)
    window.addEventListener('hiring-flows-updated', handleSync)
    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('hiring-flows-updated', handleSync)
    }
  }, [])

  const updateFlows = useCallback((next: HiringFlow[]) => {
    const cloned = cloneFlows(next)
    setFlows(cloned)
    writeStoredFlows(cloned)
  }, [])

  const resetFlows = useCallback(() => {
    updateFlows(getDefaultHiringFlows())
  }, [updateFlows])

  const saveFlows = useCallback(() => {
    // Already persisted on each update, but this provides an explicit save action
    writeStoredFlows(flows)
  }, [flows])

  return { flows, setFlows: updateFlows, resetFlows, saveFlows }
}
