'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="p-3 sm:p-6">
      {/* Back Button */}
      <div className="mb-6">
        <Link href={`/hiring/candidates/${candidateId}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
        </Link>
      </div>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Email Communication</h1>
        <p className="text-muted-foreground">
          Manage email correspondence with {candidate.name}
        </p>
      </div>

      {/* Email Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Emails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmailTab
            candidateId={candidate.id}
            candidateName={candidate.name}
            candidateEmail={candidate.email}
            jobId={candidate.job?.id}
            jobTitle={candidate.job?.title}
          />
        </CardContent>
      </Card>
    </div>
  )
}
