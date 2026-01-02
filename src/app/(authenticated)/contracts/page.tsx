'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageActions } from '@/components/layout/page-actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { contractStatusLabels, formatDate, getInitials } from '@/lib/utils'

export default function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = trpc.offer.list.useQuery({
    status: statusFilter || undefined,
    page,
    limit: 20,
  })

  // Helper to get contract sent date text
  const getContractDateText = (offer: NonNullable<typeof data>['offers'][0]) => {
    if (offer.esignSentAt) {
      return `contract sent on ${formatDate(offer.esignSentAt)}`
    }
    return `contract created on ${formatDate(offer.createdAt)}`
  }

  // Helper to get job title from variables
  const getJobTitle = (offer: NonNullable<typeof data>['offers'][0]) => {
    const variables = offer.variables as Record<string, string> | null
    return variables?.role || variables?.job_title || offer.template.name
  }

  // Helper to get start date from variables
  const getStartDate = (offer: NonNullable<typeof data>['offers'][0]) => {
    const variables = offer.variables as Record<string, string> | null
    if (variables?.start_date) {
      return `Start date: ${formatDate(new Date(variables.start_date))}`
    }
    return null
  }

  // Get status badge styling - using app theme colors
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'SIGNED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case 'SENT':
        return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'VIEWED':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border border-red-200'
      case 'EXPIRED':
        return 'bg-warning/10 text-warning border border-warning/20'
      default:
        return 'bg-muted/50 text-foreground border border-border'
    }
  }

  return (
    <div className="space-y-4">
      <PageActions>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              Filter by status
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter('')}>
              All Statuses
            </DropdownMenuItem>
            {Object.entries(contractStatusLabels).map(([value, label]) => (
              <DropdownMenuItem key={value} onClick={() => setStatusFilter(value)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Link href="/contracts/new">
          <Button>
            New employment contract
          </Button>
        </Link>
      </PageActions>

      {/* Contracts List */}
      <div className="bg-card rounded-lg border">

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : data?.offers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No contracts found</p>
            <Link href="/contracts/new">
              <Button variant="outline">
                Create your first contract
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {data?.offers.map((offer) => (
              <Link
                key={offer.id}
                href={`/contracts/${offer.id}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      {getInitials(offer.candidateName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{offer.candidateName}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{getContractDateText(offer)}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(offer.status)}`}>
                        {contractStatusLabels[offer.status]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right pl-13 sm:pl-0">
                  <p className="font-medium text-foreground">{getJobTitle(offer)}</p>
                  {getStartDate(offer) && (
                    <p className="text-sm text-muted-foreground">{getStartDate(offer)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
