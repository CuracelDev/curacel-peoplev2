'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { EmailTab } from '@/components/hiring/email-tab'
import { trpc } from '@/lib/trpc-client'

export default function CandidateEmailsPage() {
  const params = useParams()
  const candidateId = params.id as string

  const { data: profileData, isLoading } = trpc.job.getCandidateProfile.useQuery(
    { candidateId },
    { enabled: !!candidateId }
  )

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
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
        <h1 className="text-3xl font-semibold tracking-tight">Email Communication</h1>
        <p className="text-muted-foreground">
          Manage email correspondence with {candidate.name}
        </p>
      </div>

      <EmailTab
        candidateId={candidate.id}
        candidateName={candidate.name}
        candidateEmail={candidate.email}
        jobId={candidate.job?.id}
        jobTitle={candidate.job?.title}
      />
    </div>
  )
}
