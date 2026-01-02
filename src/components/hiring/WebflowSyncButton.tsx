'use client'

import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, RefreshCw, ChevronDown, CheckCircle2, AlertCircle, Clock, Minus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface WebflowSyncButtonProps {
  jobId: string
  isPublic?: boolean
  isActive?: boolean
}

export function WebflowSyncButton({ jobId, isPublic = false, isActive = false }: WebflowSyncButtonProps) {
  const statusQuery = trpc.webflow.getStatus.useQuery()
  const syncStatusQuery = trpc.webflow.getJobSyncStatus.useQuery(
    { jobId },
    { enabled: statusQuery.data?.isConfigured ?? false }
  )

  const syncMutation = trpc.webflow.syncJob.useMutation({
    onSuccess: () => {
      syncStatusQuery.refetch()
    },
  })

  const unpublishMutation = trpc.webflow.unpublishJob.useMutation({
    onSuccess: () => {
      syncStatusQuery.refetch()
    },
  })

  const deleteMutation = trpc.webflow.deleteJob.useMutation({
    onSuccess: () => {
      syncStatusQuery.refetch()
    },
  })

  // Don't show if Webflow is not configured
  if (!statusQuery.data?.isConfigured) {
    return null
  }

  const syncStatus = syncStatusQuery.data
  const isSyncing = syncMutation.isPending || unpublishMutation.isPending || deleteMutation.isPending

  const getStatusBadge = () => {
    if (syncStatusQuery.isLoading) {
      return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Loading</Badge>
    }

    if (!syncStatus) {
      return null
    }

    switch (syncStatus.syncStatus) {
      case 'synced':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="gap-1 bg-success/10 text-success-foreground hover:bg-success/10">
                  <CheckCircle2 className="h-3 w-3" />
                  Synced
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Last synced {syncStatus.lastSyncAt ? formatDistanceToNow(new Date(syncStatus.lastSyncAt), { addSuffix: true }) : 'N/A'}</p>
                {syncStatus.publishedAt && (
                  <p className="text-xs text-muted-foreground">
                    Published {formatDistanceToNow(new Date(syncStatus.publishedAt), { addSuffix: true })}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      case 'pending':
        return (
          <Badge className="gap-1 bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="gap-1 bg-red-100 text-red-800 hover:bg-red-100">
                  <AlertCircle className="h-3 w-3" />
                  Failed
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{syncStatus.syncError || 'Unknown error'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Minus className="h-3 w-3" />
            Not Synced
          </Badge>
        )
    }
  }

  const canSync = isPublic && isActive
  const isSynced = syncStatus?.syncStatus === 'synced'

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge()}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isSyncing} className="gap-1">
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Webflow
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => syncMutation.mutate({ jobId, publish: true })}
            disabled={!canSync || isSyncing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync & Publish
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => syncMutation.mutate({ jobId, publish: false })}
            disabled={!canSync || isSyncing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync (Draft)
          </DropdownMenuItem>
          {isSynced && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => unpublishMutation.mutate({ jobId })}
                disabled={isSyncing}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Archive in Webflow
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (confirm('Remove this job from Webflow? This cannot be undone.')) {
                    deleteMutation.mutate({ jobId })
                  }
                }}
                disabled={isSyncing}
                className="text-red-600"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Delete from Webflow
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {!canSync && !isSynced && (
        <span className="text-xs text-muted-foreground">
          Job must be active and public to sync
        </span>
      )}
    </div>
  )
}
