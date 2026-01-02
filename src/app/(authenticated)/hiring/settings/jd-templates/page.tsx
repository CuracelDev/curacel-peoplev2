'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Briefcase,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Code,
  Palette,
  Users,
  TrendingUp,
  Megaphone,
  Settings,
  Eye,
  EyeOff,
  Search,
  GitBranch,
  Loader2,
} from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'

const DEPARTMENTS = [
  { value: 'Engineering', icon: Code, color: 'text-blue-500 bg-blue-50' },
  { value: 'Design', icon: Palette, color: 'text-purple-500 bg-purple-50' },
  { value: 'Marketing', icon: Megaphone, color: 'text-pink-500 bg-pink-50' },
  { value: 'Sales', icon: TrendingUp, color: 'text-success bg-success/10' },
  { value: 'Operations', icon: Settings, color: 'text-amber-500 bg-amber-50' },
  { value: 'People', icon: Users, color: 'text-indigo-500 bg-indigo-50' },
  { value: 'Finance', icon: Briefcase, color: 'text-emerald-500 bg-emerald-50' },
]

function getDepartmentInfo(department: string | null, jobTitle?: string) {
  const searchText = department || jobTitle || ''
  if (!searchText) return { icon: Briefcase, color: 'text-muted-foreground bg-muted/50' }

  // Try exact match first on department
  if (department) {
    const exactMatch = DEPARTMENTS.find(d => d.value === department)
    if (exactMatch) return exactMatch
  }

  // Try case-insensitive partial match
  const normalized = searchText.toLowerCase()
  const partialMatch = DEPARTMENTS.find(d =>
    normalized.includes(d.value.toLowerCase()) ||
    d.value.toLowerCase().includes(normalized)
  )
  if (partialMatch) return partialMatch

  // Keyword-based matching for common role/team patterns
  if (normalized.includes('engineer') || normalized.includes('developer') || normalized.includes('devops') || normalized.includes('backend') || normalized.includes('frontend') || normalized.includes('technical')) {
    return DEPARTMENTS.find(d => d.value === 'Engineering')!
  }
  if (normalized.includes('design') || normalized.includes('ux') || normalized.includes('ui') || normalized.includes('product design')) {
    return DEPARTMENTS.find(d => d.value === 'Design')!
  }
  if (normalized.includes('market') || normalized.includes('growth') || normalized.includes('content') || normalized.includes('brand')) {
    return DEPARTMENTS.find(d => d.value === 'Marketing')!
  }
  if (normalized.includes('sales') || normalized.includes('business development') || normalized.includes('account') || normalized.includes('revenue')) {
    return DEPARTMENTS.find(d => d.value === 'Sales')!
  }
  if (normalized.includes('people') || normalized.includes('hr') || normalized.includes('human resources') || normalized.includes('talent') || normalized.includes('recruiting')) {
    return DEPARTMENTS.find(d => d.value === 'People')!
  }
  if (normalized.includes('operations') || normalized.includes('ops')) {
    return DEPARTMENTS.find(d => d.value === 'Operations')!
  }
  if (normalized.includes('finance') || normalized.includes('accounting') || normalized.includes('financial')) {
    return DEPARTMENTS.find(d => d.value === 'Finance')!
  }

  return { icon: Briefcase, color: 'text-muted-foreground bg-muted/50' }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export default function JDsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [jdToDelete, setJdToDelete] = useState<{ id: string; name: string } | null>(null)

  // Fetch JDs from database
  const { data: jds, isLoading, refetch } = trpc.jobDescription.list.useQuery()

  // Delete mutation
  const deleteMutation = trpc.jobDescription.delete.useMutation({
    onSuccess: () => {
      refetch()
      setDeleteDialogOpen(false)
      setJdToDelete(null)
    },
  })

  // Duplicate mutation
  const duplicateMutation = trpc.jobDescription.duplicate.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  // Filter JDs
  const filteredJDs = (jds || []).filter(jd => {
    const matchesSearch = jd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (jd.department?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      stripHtml(jd.content).toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDepartment = departmentFilter === 'all' || jd.department === departmentFilter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'published' && jd.isActive) ||
      (statusFilter === 'draft' && !jd.isActive)
    return matchesSearch && matchesDepartment && matchesStatus
  })

  const handleDeleteClick = (jd: { id: string; name: string }) => {
    setJdToDelete(jd)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (jdToDelete) {
      deleteMutation.mutate({ id: jdToDelete.id })
    }
  }

  const handleDuplicate = (jd: { id: string }) => {
    duplicateMutation.mutate({ id: jd.id })
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Job Descriptions"
        description="Manage job descriptions for your hiring pipeline. Create new JDs or new versions of existing ones."
        actions={
          <Button asChild>
            <Link href="/hiring/settings/jd-templates/new">
              <Plus className="h-4 w-4 mr-2" />
              Create JD
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search JDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map((dept) => (
              <SelectItem key={dept.value} value={dept.value}>
                {dept.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* JD List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredJDs.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[350px]">Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJDs.map((jd) => {
                const deptInfo = getDepartmentInfo(jd.department, jd.name)
                const DeptIcon = deptInfo.icon

                return (
                  <TableRow key={jd.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", deptInfo.color)}>
                          <DeptIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <Link
                            href={`/hiring/settings/jd-templates/${jd.id}`}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {jd.name}
                          </Link>
                          <p className="text-sm text-muted-foreground line-clamp-1 max-w-[300px]">
                            {stripHtml(jd.content).substring(0, 100)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{jd.department || 'Not specified'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">v{jd.version}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {jd.isActive ? (
                        <Badge className="bg-success/10 text-success hover:bg-success/10">
                          <Eye className="h-3 w-3 mr-1" />
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Draft
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(jd.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/hiring/settings/jd-templates/${jd.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/hiring/settings/jd-templates/new?from=${jd.id}`}>
                              <GitBranch className="h-4 w-4 mr-2" />
                              Create New Version
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleDuplicate(jd)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => handleDeleteClick(jd)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
          <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No job descriptions found</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {searchQuery || departmentFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first JD template'}
          </p>
          {!searchQuery && departmentFilter === 'all' && statusFilter === 'all' && (
            <Button asChild>
              <Link href="/hiring/settings/jd-templates/new">
                <Plus className="h-4 w-4 mr-2" />
                Create JD
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Description</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{jdToDelete?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
