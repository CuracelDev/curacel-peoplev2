'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Search, ChevronDown, Trash2, UserCog, Users, RefreshCw, Calendar } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { employeeStatusLabels, employeeStatusColors, getInitials } from '@/lib/utils'

type EmployeeStatus = 'CANDIDATE' | 'OFFER_SENT' | 'OFFER_SIGNED' | 'HIRED_PENDING_START' | 'ACTIVE' | 'OFFBOARDING' | 'EXITED'

export default function BulkActionsPage() {
  const utils = trpc.useUtils()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('')
  const [startDateFrom, setStartDateFrom] = useState<string>('')
  const [startDateTo, setStartDateTo] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<EmployeeStatus | null>(null)
  const [managerDialogOpen, setManagerDialogOpen] = useState(false)
  const [pendingManagerId, setPendingManagerId] = useState<string | null>(null)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [pendingTeam, setPendingTeam] = useState<string | null>(null)

  const { data, isLoading, refetch } = trpc.employee.list.useQuery({
    search: search || undefined,
    status: statusFilter || undefined,
    department: departmentFilter || undefined,
    startDateFrom: startDateFrom || undefined,
    startDateTo: startDateTo || undefined,
    page,
    limit: pageSize,
  })

  const { data: teams } = trpc.team.listForSelect.useQuery()
  const { data: managers } = trpc.employee.getManagers.useQuery()

  const bulkUpdate = trpc.employee.bulkUpdate.useMutation({
    onSuccess: () => {
      refetch()
      utils.employee.list.invalidate()
      setSelectedIds(new Set())
      setStatusDialogOpen(false)
      setManagerDialogOpen(false)
      setTeamDialogOpen(false)
    },
  })

  const bulkDelete = trpc.employee.bulkDelete.useMutation({
    onSuccess: () => {
      refetch()
      utils.employee.list.invalidate()
      setSelectedIds(new Set())
      setDeleteDialogOpen(false)
    },
  })

  const employees = data?.employees || []
  const allSelected = employees.length > 0 && employees.every(e => selectedIds.has(e.id))
  const someSelected = employees.some(e => selectedIds.has(e.id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(employees.map(e => e.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleStatusChange = (status: EmployeeStatus) => {
    setPendingStatus(status)
    setStatusDialogOpen(true)
  }

  const confirmStatusChange = () => {
    if (pendingStatus && selectedIds.size > 0) {
      bulkUpdate.mutate({
        employeeIds: Array.from(selectedIds),
        updates: { status: pendingStatus },
      })
    }
  }

  const handleManagerAssign = (managerId: string | null) => {
    setPendingManagerId(managerId)
    setManagerDialogOpen(true)
  }

  const confirmManagerAssign = () => {
    if (selectedIds.size > 0) {
      bulkUpdate.mutate({
        employeeIds: Array.from(selectedIds),
        updates: { managerId: pendingManagerId },
      })
    }
  }

  const handleTeamAssign = (team: string | null) => {
    setPendingTeam(team)
    setTeamDialogOpen(true)
  }

  const confirmTeamAssign = () => {
    if (selectedIds.size > 0) {
      bulkUpdate.mutate({
        employeeIds: Array.from(selectedIds),
        updates: { department: pendingTeam },
      })
    }
  }

  const confirmDelete = () => {
    if (selectedIds.size > 0) {
      bulkDelete.mutate({ employeeIds: Array.from(selectedIds) })
    }
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Bulk Actions"
        description="Select multiple employees and perform bulk operations like status changes, team assignments, and more."
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(employeeStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter || 'all'} onValueChange={(v) => setDepartmentFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {(teams || []).map((team) => (
                  <SelectItem key={team.id} value={team.name}>
                    {team.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-4 mt-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Start Date From</Label>
              <Input
                type="date"
                value={startDateFrom}
                onChange={(e) => setStartDateFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Start Date To</Label>
              <Input
                type="date"
                value={startDateTo}
                onChange={(e) => setStartDateTo(e.target.value)}
                className="w-[160px]"
              />
            </div>
            {(startDateFrom || startDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStartDateFrom(''); setStartDateTo('') }}
              >
                Clear dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {data?.total || 0} Employees
            </CardTitle>
            <CardDescription>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select employees to perform bulk actions'}
            </CardDescription>
          </div>
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  Actions ({selectedIds.size})
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Change Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {Object.entries(employeeStatusLabels).map(([value, label]) => (
                      <DropdownMenuItem
                        key={value}
                        onSelect={() => handleStatusChange(value as EmployeeStatus)}
                      >
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <UserCog className="mr-2 h-4 w-4" />
                    Assign Manager
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => handleManagerAssign(null)}>
                      Remove Manager
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {(managers || []).map((manager) => (
                      <DropdownMenuItem
                        key={manager.id}
                        onSelect={() => handleManagerAssign(manager.id)}
                      >
                        {manager.fullName}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Users className="mr-2 h-4 w-4" />
                    Assign Team
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => handleTeamAssign(null)}>
                      Remove Team
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {(teams || []).map((team) => (
                      <DropdownMenuItem
                        key={team.id}
                        onSelect={() => handleTeamAssign(team.name)}
                      >
                        {team.displayName}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onSelect={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No employees found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                        {...(someSelected && !allSelected ? { 'data-state': 'indeterminate' } : {})}
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Job Title</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Department</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Manager</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className={`border-b hover:bg-muted/50 ${selectedIds.has(employee.id) ? 'bg-muted/30' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <Checkbox
                          checked={selectedIds.has(employee.id)}
                          onCheckedChange={() => toggleSelect(employee.id)}
                          aria-label={`Select ${employee.fullName}`}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={employee.profileImageUrl || ''} alt={employee.fullName} />
                            <AvatarFallback className="text-xs">
                              {getInitials(employee.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.fullName}</p>
                            <p className="text-sm text-muted-foreground">{employee.personalEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{employee.jobTitle || '-'}</td>
                      <td className="py-3 px-4">{employee.department || '-'}</td>
                      <td className="py-3 px-4">{employee.manager?.fullName || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge className={employeeStatusColors[employee.status]}>
                          {employeeStatusLabels[employee.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.total)} of {data.total}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Employees</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected employees and all their associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDelete.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status</AlertDialogTitle>
            <AlertDialogDescription>
              Change the status of {selectedIds.size} employee{selectedIds.size > 1 ? 's' : ''} to{' '}
              <strong>{pendingStatus ? employeeStatusLabels[pendingStatus] : ''}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              {bulkUpdate.isPending ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Manager</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingManagerId === null ? (
                <>Remove the manager from {selectedIds.size} employee{selectedIds.size > 1 ? 's' : ''}?</>
              ) : (
                <>
                  Assign{' '}
                  <strong>{managers?.find(m => m.id === pendingManagerId)?.fullName}</strong> as
                  manager to {selectedIds.size} employee{selectedIds.size > 1 ? 's' : ''}?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmManagerAssign}>
              {bulkUpdate.isPending ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Team</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTeam === null ? (
                <>Remove the team from {selectedIds.size} employee{selectedIds.size > 1 ? 's' : ''}?</>
              ) : (
                <>
                  Assign {selectedIds.size} employee{selectedIds.size > 1 ? 's' : ''} to{' '}
                  <strong>{teams?.find(t => t.name === pendingTeam)?.displayName || pendingTeam}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTeamAssign}>
              {bulkUpdate.isPending ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
