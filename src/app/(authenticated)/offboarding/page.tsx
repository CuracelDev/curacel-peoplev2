'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageActions } from '@/components/layout/page-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserMinus, CheckCircle2, Clock, AlertCircle, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function OffboardingPage() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [isImmediate, setIsImmediate] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [googleDeleteAccount, setGoogleDeleteAccount] = useState(false)
  const [googleTransferToEmail, setGoogleTransferToEmail] = useState('')
  const [googleTransferApps, setGoogleTransferApps] = useState<string[]>(['drive', 'calendar'])
  const [googleAliasToEmail, setGoogleAliasToEmail] = useState('')
  const [googleAliasSearch, setGoogleAliasSearch] = useState('')
  const [aliasDropdownOpen, setAliasDropdownOpen] = useState(false)
  const [transferDropdownOpen, setTransferDropdownOpen] = useState(false)
  const [transferSearch, setTransferSearch] = useState('')
  const [transferEnabled, setTransferEnabled] = useState(true)

  const { data, isLoading } = trpc.offboarding.list.useQuery({
    status: statusFilter || undefined,
    page,
    limit: 20,
  })

  const { data: activeEmployees } = trpc.employee.list.useQuery({
    status: 'ACTIVE',
    limit: 200,
  })
  const googleUsersQuery = trpc.integration.listGoogleWorkspaceUsers.useQuery()
  const { data: organization } = trpc.organization.get.useQuery()

  const startOffboarding = trpc.offboarding.start.useMutation({
    onSuccess: (workflow) => {
      setIsDialogOpen(false)
      window.location.href = `/offboarding/${workflow.id}`
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-success/10 text-success'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'FAILED': return 'bg-destructive/10 text-destructive-foreground'
      case 'CANCELLED': return 'bg-muted text-foreground'
      default: return 'bg-muted text-foreground'
    }
  }

  const getProgress = (tasks: { status: string }[]) => {
    if (tasks.length === 0) return 0
    const completed = tasks.filter(t => t.status === 'SUCCESS' || t.status === 'SKIPPED').length
    return Math.round((completed / tasks.length) * 100)
  }

  const googleUsers = googleUsersQuery.data?.users ?? []
  const selectedEmployee = activeEmployees?.employees.find((e) => e.id === employeeId)
  const filteredGoogleUsers = googleUsers
    .filter((user) => user.email !== selectedEmployee?.workEmail)
    .filter((user) => {
      const query = googleAliasSearch.trim().toLowerCase()
      if (!query) return true
      return user.email.toLowerCase().includes(query) || user.name.toLowerCase().includes(query)
    });
  const filteredTransferUsers = googleUsers
    .filter((user) => user.email !== selectedEmployee?.workEmail)
    .filter((user) => {
      const query = transferSearch.trim().toLowerCase()
      if (!query) return true
      return user.email.toLowerCase().includes(query) || user.name.toLowerCase().includes(query)
    });

  return (
    <div className="space-y-4">
      <PageActions>
        <Button
          onClick={() => {
            setEmployeeId('')
            setIsImmediate(false)
            setEndDate('')
            setReason('')
            setNotes('')
            setGoogleDeleteAccount(false)
            setGoogleTransferToEmail(organization?.googleWorkspaceTransferToEmail || 'admin@curacel.ai')
            setTransferSearch(organization?.googleWorkspaceTransferToEmail || 'admin@curacel.ai')
            setTransferEnabled(true)
            setGoogleTransferApps(['drive', 'calendar'])
            setGoogleAliasToEmail('')
            setIsDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Offboard employee
        </Button>
      </PageActions>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data?.workflows.filter(w => w.status === 'PENDING').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserMinus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data?.workflows.filter(w => w.status === 'IN_PROGRESS').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data?.workflows.filter(w => w.status === 'COMPLETED').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data?.workflows.filter(w => w.status === 'FAILED').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Offboarding Workflows
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : data?.workflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No offboarding workflows found
            </div>
          ) : (
            <div className="space-y-4">
              {data?.workflows.map((workflow) => {
                const progress = getProgress(workflow.tasks)
                return (
                  <Link key={workflow.id} href={`/offboarding/${workflow.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-muted transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <p className="font-medium truncate">{workflow.employee.fullName}</p>
                          <Badge className={getStatusColor(workflow.status)}>
                            {workflow.status.replace('_', ' ')}
                          </Badge>
                          {workflow.isImmediate && (
                            <Badge variant="destructive">Immediate</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {workflow.employee.jobTitle} • {workflow.employee.department}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last Day: {workflow.employee.endDate ? formatDate(workflow.employee.endDate) : 'TBD'}
                        </p>
                      </div>
                      <div className="w-full sm:w-48">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {workflow.tasks.filter(t => t.status === 'SUCCESS').length} of {workflow.tasks.length} tasks
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {data.pages}
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
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Start offboarding</DialogTitle>
            <DialogDescription>Select an employee and schedule their offboarding.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium">Employee</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeEmployees?.employees
                        .filter((e) => e.workEmail) // Only show employees with company email
                        .map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.fullName} ({e.workEmail})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium">Immediate offboarding</Label>
                    <p className="text-xs text-muted-foreground">Run automated tasks immediately.</p>
                  </div>
                  <Switch checked={isImmediate} onCheckedChange={setIsImmediate} />
                </div>

                {!isImmediate ? (
                  <div>
                    <Label htmlFor="endDate" className="text-sm font-medium">Last day (optional)</Label>
                    <DatePicker
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                ) : null}

                <div>
                  <Label htmlFor="reason" className="text-sm font-medium">Reason</Label>
                  <Input
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                    placeholder="Optional reason (e.g. resignation, termination)"
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                    placeholder="Optional internal notes"
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Google Workspace offboarding</Label>
                  <p className="text-xs text-muted-foreground">
                    Delete the account, transfer Drive ownership, and optionally map the email as an alias.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium">Delete Google account</Label>
                    <p className="text-xs text-muted-foreground">Deletes the user after transfer (instead of suspending).</p>
                  </div>
                  <Switch checked={googleDeleteAccount} onCheckedChange={setGoogleDeleteAccount} />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-sm font-medium">Data in other apps</Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${transferEnabled ? 'border-blue-600 text-blue-600' : 'border-border text-muted-foreground'}`}
                        onClick={() => setTransferEnabled(true)}
                      >
                        Transfer
                      </button>
                      <button
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${!transferEnabled ? 'border-blue-600 text-blue-600' : 'border-border text-muted-foreground'}`}
                        onClick={() => {
                          setTransferEnabled(false)
                          setGoogleTransferToEmail('')
                          setTransferSearch('')
                        }}
                      >
                        Don’t transfer data
                      </button>
                    </div>
                  </div>
                  {transferEnabled && (
                    <>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Select the user who should receive the offboarded employee’s data.
                      </p>
                      <div className="relative mt-3">
                        <Input
                          value={transferSearch}
                          onChange={(e) => {
                            setTransferSearch(e.target.value)
                            setTransferDropdownOpen(true)
                          }}
                          onFocus={() => setTransferDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setTransferDropdownOpen(false), 150)}
                          placeholder="Search for a user"
                        />
                        {transferDropdownOpen && (
                          <div className="absolute z-20 mt-2 w-full rounded-md border bg-card shadow-sm max-h-64 overflow-auto">
                            {googleUsersQuery.isLoading ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">Loading Google Workspace users...</div>
                            ) : googleUsersQuery.data?.error ? (
                              <div className="px-3 py-2 text-sm text-destructive">{googleUsersQuery.data.error}</div>
                            ) : filteredTransferUsers.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">No matching users</div>
                            ) : (
                              filteredTransferUsers.map((user) => (
                                <button
                                  key={user.email}
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => {
                                    setGoogleTransferToEmail(user.email)
                                    setTransferSearch(`${user.name} (${user.email})`)
                                    setTransferDropdownOpen(false)
                                  }}
                                >
                                  {user.name} ({user.email})
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      {!googleUsersQuery.isLoading && !googleUsersQuery.data?.error ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {filteredTransferUsers.length} user{filteredTransferUsers.length === 1 ? '' : 's'} found
                        </p>
                      ) : null}
                      <div className="mt-4 space-y-2">
                        <Label className="text-sm font-medium">Select data to transfer</Label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={googleTransferApps.includes('drive')}
                            onChange={(e) => {
                              setGoogleTransferApps((prev) =>
                                e.target.checked ? [...prev, 'drive'] : prev.filter((app) => app !== 'drive')
                              )
                            }}
                          />
                          Drive and Docs
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={googleTransferApps.includes('calendar')}
                            onChange={(e) => {
                              setGoogleTransferApps((prev) =>
                                e.target.checked ? [...prev, 'calendar'] : prev.filter((app) => app !== 'calendar')
                              )
                            }}
                          />
                          Calendar
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Map email as alias to</Label>
                  <div className="relative mt-2">
                    <Input
                      value={googleAliasSearch}
                      onChange={(e) => {
                        setGoogleAliasSearch(e.target.value)
                        setAliasDropdownOpen(true)
                      }}
                      onFocus={() => setAliasDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setAliasDropdownOpen(false), 150)}
                      placeholder="Search and select Google user"
                    />
                    {aliasDropdownOpen && (
                      <div className="absolute z-20 mt-2 w-full rounded-md border bg-card shadow-sm max-h-64 overflow-auto">
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setGoogleAliasToEmail('')
                            setGoogleAliasSearch('')
                            setAliasDropdownOpen(false)
                          }}
                        >
                          No alias mapping
                        </button>
                        {googleUsersQuery.isLoading ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">Loading Google Workspace users...</div>
                        ) : googleUsersQuery.data?.error ? (
                          <div className="px-3 py-2 text-sm text-destructive">{googleUsersQuery.data.error}</div>
                        ) : filteredGoogleUsers.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No matching users</div>
                        ) : (
                          filteredGoogleUsers.map((user) => (
                            <button
                              key={user.email}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setGoogleAliasToEmail(user.email)
                                setGoogleAliasSearch(`${user.name} (${user.email})`)
                                setAliasDropdownOpen(false)
                              }}
                            >
                              {user.name} ({user.email})
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {!googleUsersQuery.isLoading && !googleUsersQuery.data?.error ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {filteredGoogleUsers.length} user{filteredGoogleUsers.length === 1 ? '' : 's'} found
                    </p>
                  ) : null}
                  {!googleDeleteAccount && googleAliasToEmail ? (
                    <p className="text-xs text-warning mt-1">
                      Alias mapping requires deleting the Google account.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={startOffboarding.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                startOffboarding.mutate({
                  employeeId,
                  isImmediate,
                  endDate: !isImmediate && endDate ? endDate : undefined,
                  reason: reason.trim() || undefined,
                  notes: notes.trim() || undefined,
                  googleDeleteAccount,
                  googleTransferToEmail: transferEnabled ? googleTransferToEmail.trim() || undefined : undefined,
                  googleTransferApps: transferEnabled ? googleTransferApps : [],
                  googleAliasToEmail: googleAliasToEmail.trim() || undefined,
                })
              }
              disabled={!employeeId || startOffboarding.isPending}
            >
              {startOffboarding.isPending ? 'Starting…' : 'Start offboarding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
