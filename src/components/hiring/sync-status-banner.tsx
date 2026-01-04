'use client'

import { RefreshCw, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface SyncStatusBannerProps {
  syncStatus: {
    hasSync: boolean
    lastSyncAt: Date | null
    syncStatus: string | null
    emailsFound: number
    emailsNew: number
    emailsFailed?: number
    categorizationStatus: string | null
    categorizedCount: number
    errorMessage?: string | null
  }
  onSync: () => void
  isLoading?: boolean
}

export function SyncStatusBanner({ syncStatus, onSync, isLoading }: SyncStatusBannerProps) {
  const {
    hasSync,
    lastSyncAt,
    syncStatus: status,
    emailsFound,
    emailsNew,
    emailsFailed,
    categorizationStatus,
    categorizedCount,
    errorMessage,
  } = syncStatus

  const isSyncing = status === 'IN_PROGRESS' || isLoading
  const isCategorizing = categorizationStatus === 'IN_PROGRESS'
  const hasFailed = status === 'FAILED'

  if (!hasSync) {
    return (
      <Card className="p-4 border-blue-200 bg-blue-50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">No email history synced yet</h3>
              <p className="text-sm text-blue-700 mt-1">
                Sync all emails between Curacel and this candidate from Gmail to see the complete communication history.
              </p>
            </div>
          </div>
          <Button
            onClick={onSync}
            disabled={isLoading}
            size="sm"
            className="flex-shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Sync Emails
              </>
            )}
          </Button>
        </div>
      </Card>
    )
  }

  if (hasFailed) {
    return (
      <Card className="p-4 border-red-200 bg-red-50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-900">Sync failed</h3>
              <p className="text-sm text-red-700 mt-1">
                {errorMessage || 'An error occurred while syncing emails. Please try again.'}
              </p>
              {lastSyncAt && (
                <p className="text-xs text-red-600 mt-1">
                  Last attempt: {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={onSync}
            disabled={isLoading}
            size="sm"
            variant="destructive"
            className="flex-shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry Sync
              </>
            )}
          </Button>
        </div>
      </Card>
    )
  }

  if (isSyncing || isCategorizing) {
    return (
      <Card className="p-4 border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          <Loader2 className="h-5 w-5 text-amber-600 mt-0.5 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-amber-900">
              {isSyncing ? 'Syncing emails from Gmail...' : 'Categorizing emails with AI...'}
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {isSyncing
                ? 'This may take a few moments. The page will update automatically when complete.'
                : `Categorized ${categorizedCount} emails so far. This process runs in the background.`}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-green-200 bg-green-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-green-900">Emails synced</h3>
            <div className="text-sm text-green-700 mt-1 space-y-0.5">
              <p>
                Found {emailsFound} email{emailsFound !== 1 ? 's' : ''} during hiring period
                {emailsNew > 0 && ` (${emailsNew} new)`}
                {emailsFailed && emailsFailed > 0 && ` (${emailsFailed} failed to sync)`}
              </p>
              {categorizationStatus === 'COMPLETED' && (
                <p>AI categorized {categorizedCount} email{categorizedCount !== 1 ? 's' : ''}</p>
              )}
              {lastSyncAt && (
                <p className="text-xs text-green-600">
                  Last synced {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={onSync}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="flex-shrink-0 border-green-300 hover:bg-green-100"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Re-sync
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
