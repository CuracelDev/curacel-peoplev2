'use client'

import { trpc } from '@/lib/trpc-client'

export type HiringFlow = {
  id: string
  name: string
  description: string | null
  stages: string[]
  isDefault: boolean
  isActive: boolean
  jobsCount?: number
  outdatedJobs?: number
  latestVersion?: number
}

/**
 * Hook for managing hiring flows via tRPC
 * This replaces the previous localStorage-based implementation
 */
export const useHiringFlows = () => {
  const flowsQuery = trpc.hiringFlow.list.useQuery()
  const updateMutation = trpc.hiringFlow.update.useMutation()
  const createMutation = trpc.hiringFlow.create.useMutation()
  const deleteMutation = trpc.hiringFlow.delete.useMutation()
  const setDefaultMutation = trpc.hiringFlow.setDefault.useMutation()
  const utils = trpc.useUtils()

  const flows: HiringFlow[] = (flowsQuery.data ?? []).map((flow) => ({
    id: flow.id,
    name: flow.name,
    description: flow.description,
    stages: flow.stages as string[],
    isDefault: flow.isDefault,
    isActive: flow.isActive,
    jobsCount: flow.totalJobs,
    outdatedJobs: flow.outdatedJobs,
    latestVersion: flow.latestVersion,
  }))

  const updateFlow = async (
    id: string,
    updates: { name?: string; description?: string; stages?: string[] },
    stageMapping?: Record<string, string>
  ) => {
    await updateMutation.mutateAsync({ id, ...updates, stageMapping })
    utils.hiringFlow.list.invalidate()
  }

  const createFlow = async (data: {
    name: string
    description?: string
    stages: string[]
    isDefault?: boolean
  }) => {
    const result = await createMutation.mutateAsync(data)
    utils.hiringFlow.list.invalidate()
    return result
  }

  const deleteFlow = async (id: string) => {
    await deleteMutation.mutateAsync({ id })
    utils.hiringFlow.list.invalidate()
  }

  const setDefaultFlow = async (id: string) => {
    await setDefaultMutation.mutateAsync({ id })
    utils.hiringFlow.list.invalidate()
  }

  const resetFlows = () => {
    // No-op for database-backed flows - use seed script instead
    console.warn('resetFlows is deprecated for database-backed flows. Use seed script instead.')
  }

  const saveFlows = () => {
    // No-op - flows are auto-saved via mutations
  }

  return {
    flows,
    isLoading: flowsQuery.isLoading,
    isError: flowsQuery.isError,
    error: flowsQuery.error,
    updateFlow,
    createFlow,
    deleteFlow,
    setDefaultFlow,
    resetFlows,
    saveFlows,
    // Legacy compatibility
    setFlows: () => {
      console.warn('setFlows is deprecated. Use updateFlow, createFlow, or deleteFlow instead.')
    },
  }
}

/**
 * Get default hiring flows - now fetches from database
 * For server-side usage, use the hiringFlow.list tRPC procedure instead
 */
export const getDefaultHiringFlows = () => {
  console.warn(
    'getDefaultHiringFlows is deprecated. Use the hiringFlow.list tRPC procedure instead.'
  )
  return []
}
