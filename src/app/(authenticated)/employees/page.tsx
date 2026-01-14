'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, Users } from 'lucide-react'
import { employeeStatusLabels, employeeStatusColors, formatDate, getInitials } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { PageActions } from '@/components/layout/page-actions'

export default function EmployeesPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE')
  const [departmentFilter, setDepartmentFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data, isLoading, refetch } = trpc.employee.list.useQuery({
    search: search || undefined,
    status: statusFilter || undefined,
    department: departmentFilter || undefined,
    page,
    limit: 20,
  })

  const { data: teams } = trpc.team.listForSelect.useQuery()
  const createEmployee = trpc.employee.create.useMutation({
    onSuccess: () => {
      setCreateDialogOpen(false)
      refetch()
      reset()
    },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      fullName: '',
      personalEmail: '',
      jobTitle: '',
      department: '',
      location: '',
    },
  })

  const departmentValue = watch('department')

  const onSubmit = (data: { fullName: string; personalEmail: string; jobTitle?: string; department?: string; location?: string }) => {
    createEmployee.mutate(data)
  }

  return (
    <div className="space-y-4">
      <PageActions>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Create a new employee record. You can add more details later.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    {...register('fullName', { required: 'Name is required' })}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="personalEmail">Personal Email *</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    {...register('personalEmail', { required: 'Email is required' })}
                  />
                  {errors.personalEmail && (
                    <p className="text-sm text-destructive">{errors.personalEmail.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input id="jobTitle" {...register('jobTitle')} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Team / Department</Label>
                  <Select value={departmentValue || 'none'} onValueChange={(value) => setValue('department', value === 'none' ? '' : value)}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {(teams || []).map((team) => (
                        <SelectItem key={team.id} value={team.name}>
                          {team.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" {...register('location')} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEmployee.isPending}>
                  {createEmployee.isPending ? 'Creating...' : 'Create Employee'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageActions>

      {/* Filters */}
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
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {data?.total || 0} Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : data?.employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No employees found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Job Title</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Department</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b hover:bg-muted cursor-pointer"
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(`/employees/${employee.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          router.push(`/employees/${employee.id}`)
                        }
                      }}
                    >
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
                      <td className="py-3 px-4">
                        <Badge className={employeeStatusColors[employee.status]}>
                          {employeeStatusLabels[employee.status]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {employee.startDate ? formatDate(employee.startDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
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
        </CardContent>
      </Card>
    </div>
  )
}
