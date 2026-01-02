'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Filter } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<string>('')
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [search, setSearch] = useState<string>('')

  const { data, isLoading, error } = trpc.audit.list.useQuery({
    action: actionFilter || undefined,
    resourceType: resourceTypeFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit: 50,
  })

  const { data: actions } = trpc.audit.getActions.useQuery()
  const { data: resourceTypes } = trpc.audit.getResourceTypes.useQuery()

  const getActionColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-success/10 text-success-foreground'
    if (action.includes('UPDATED')) return 'bg-blue-100 text-blue-800'
    if (action.includes('DELETED') || action.includes('TERMINATED')) return 'bg-red-100 text-red-800'
    if (action.includes('SIGNED')) return 'bg-purple-100 text-purple-800'
    return 'bg-muted text-foreground'
  }

  const clearFilters = () => {
    setActionFilter('')
    setResourceTypeFilter('')
    setStartDate('')
    setEndDate('')
    setSearch('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Audit Log"
        description="View all system activity and changes"
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="action">Action</Label>
              <Select value={actionFilter || 'all'} onValueChange={(v) => setActionFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions?.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="resourceType">Resource Type</Label>
              <Select value={resourceTypeFilter || 'all'} onValueChange={(v) => setResourceTypeFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {resourceTypes?.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity Log</CardTitle>
            <div className="text-sm text-muted-foreground">
              {data?.total || 0} total entries
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Error loading audit log: {error.message}
            </div>
          ) : data?.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit log entries found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Timestamp</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actor</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Action</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Resource</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted">
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-sm">
                              {log.actor?.name || log.actorEmail || 'System'}
                            </p>
                            {log.actor?.email && (
                              <p className="text-xs text-muted-foreground">{log.actor.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getActionColor(log.action)}>
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium">{log.resourceType}</p>
                            {log.resourceId && (
                              <p className="text-xs text-muted-foreground font-mono">{log.resourceId.slice(0, 8)}...</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {log.metadata && typeof log.metadata === 'object' ? (
                            <details className="cursor-pointer">
                              <summary className="text-sm text-foreground/80 hover:text-foreground">
                                View details
                              </summary>
                              <pre className="mt-2 text-xs bg-muted/50 p-2 rounded overflow-auto max-w-md">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {data.pages} ({data.total} total entries)
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
