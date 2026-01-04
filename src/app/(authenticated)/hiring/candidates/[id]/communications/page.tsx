'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ChevronLeft, Filter, Download, Loader2 } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CommunicationsTimeline } from '@/components/hiring/communications-timeline'
import { SyncStatusBanner } from '@/components/hiring/sync-status-banner'
import { trpc } from '@/lib/trpc-client'
import { EmailCategory } from '@prisma/client'
import { toast } from 'sonner'

export default function CandidateCommunicationsPage() {
  const params = useParams()
  const router = useRouter()
  const candidateId = params.id as string

  const [categoryFilter, setCategoryFilter] = useState<EmailCategory | 'ALL'>('ALL')
  const [hiringPeriodOnly, setHiringPeriodOnly] = useState(false)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch candidate profile
  const { data: profileData, isLoading: profileLoading } = trpc.job.getCandidateProfile.useQuery(
    { candidateId },
    { enabled: !!candidateId }
  )

  // Fetch emails
  const { data: emailsData, isLoading: emailsLoading, refetch: refetchEmails } = trpc.candidateCommunications.getAllEmails.useQuery(
    {
      candidateId,
      category: categoryFilter === 'ALL' ? undefined : categoryFilter,
      hiringPeriodOnly,
      sortBy: 'date',
      sortOrder,
    },
    { enabled: !!candidateId }
  )

  // Fetch sync status
  const { data: syncStatus, isLoading: syncLoading, refetch: refetchSync } = trpc.candidateCommunications.getSyncStatus.useQuery(
    { candidateId },
    { enabled: !!candidateId, refetchInterval: 5000 } // Poll every 5 seconds
  )

  // Fetch hiring period
  const { data: hiringPeriod } = trpc.candidateCommunications.getHiringPeriod.useQuery(
    { candidateId },
    { enabled: !!candidateId }
  )

  // Fetch category stats
  const { data: categoryStats } = trpc.candidateCommunications.getCategoryStats.useQuery(
    { candidateId },
    { enabled: !!candidateId }
  )

  // Sync mutation
  const syncMutation = trpc.candidateCommunications.syncFromGmail.useMutation({
    onSuccess: () => {
      toast.success('Email sync started in background. This may take a few moments.')
      refetchSync()
      // Refetch emails after a delay to allow sync to complete
      setTimeout(() => {
        refetchEmails()
      }, 3000)
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`)
    },
  })

  // Recategorize mutation
  const recategorizeMutation = trpc.candidateCommunications.recategorizeEmail.useMutation({
    onSuccess: () => {
      toast.success('Email recategorized successfully')
      refetchEmails()
    },
    onError: (error) => {
      toast.error(`Failed to recategorize: ${error.message}`)
    },
  })

  // Auto-refresh when categorization completes
  useEffect(() => {
    if (syncStatus?.categorizationStatus === 'COMPLETED' && emailsData) {
      refetchEmails()
    }
  }, [syncStatus?.categorizationStatus])

  const handleSync = () => {
    syncMutation.mutate({ candidateId })
  }

  const handleCategoryClick = (emailId: string, currentCategory: EmailCategory | null) => {
    // TODO: Show a dropdown to select new category
    // For now, just show a toast
    toast.info('Click to recategorize email (feature coming soon)')
  }

  if (profileLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profileData?.candidate) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Candidate not found</p>
      </div>
    )
  }

  const candidate = profileData.candidate

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Breadcrumb />

      <Link
        href={`/hiring/candidates/${candidateId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Profile
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Email Communications</h1>
        <p className="text-muted-foreground">
          Complete email history with {candidate.name}
          {hiringPeriod && ` from ${new Date(hiringPeriod.from).toLocaleDateString()} to ${new Date(hiringPeriod.to).toLocaleDateString()}`}
        </p>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <SyncStatusBanner
          syncStatus={syncStatus}
          onSync={handleSync}
          isLoading={syncMutation.isPending}
        />
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as EmailCategory | 'ALL')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="APPLICATION">Application</SelectItem>
                  <SelectItem value="INTERVIEW_SCHEDULING">Interview Scheduling</SelectItem>
                  <SelectItem value="INTERVIEW_FOLLOWUP">Interview Follow-up</SelectItem>
                  <SelectItem value="ASSESSMENT">Assessment</SelectItem>
                  <SelectItem value="OFFER">Offer</SelectItem>
                  <SelectItem value="ONBOARDING">Onboarding</SelectItem>
                  <SelectItem value="GENERAL_FOLLOWUP">Follow-up</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hiring-period"
                  checked={hiringPeriodOnly}
                  onCheckedChange={setHiringPeriodOnly}
                />
                <Label htmlFor="hiring-period" className="cursor-pointer">
                  Hiring period only
                </Label>
              </div>
            </div>
          </div>

          {/* Stats */}
          {categoryStats && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Emails</p>
                  <p className="text-lg font-semibold">{categoryStats.totalEmails}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hiring Period</p>
                  <p className="text-lg font-semibold">{categoryStats.hiringPeriodEmails}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Categorized</p>
                  <p className="text-lg font-semibold">{categoryStats.categorizedCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uncategorized</p>
                  <p className="text-lg font-semibold">{categoryStats.uncategorizedCount}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {emailsLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Loading emails...</p>
          </CardContent>
        </Card>
      ) : emailsData && hiringPeriod ? (
        <CommunicationsTimeline
          emails={emailsData.emails}
          grouped={emailsData.grouped}
          hiringPeriod={hiringPeriod}
          onCategoryClick={handleCategoryClick}
        />
      ) : null}
    </div>
  )
}
