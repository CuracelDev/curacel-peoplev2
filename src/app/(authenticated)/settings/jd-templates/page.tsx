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
  History,
  ChevronRight,
} from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'

interface JD {
  id: string
  name: string
  department: string
  description: string
  flowType: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  version: number
  parentId?: string // Reference to the parent JD if this is a version
  requirements?: string
  responsibilities?: string
}

// Mock JD data with versioning
const mockJDs: JD[] = [
  {
    id: '1',
    name: 'Senior Backend Engineer',
    department: 'Engineering',
    description: 'Design, build, and maintain efficient, reusable, and reliable backend services.',
    flowType: 'ENGINEERING',
    isActive: true,
    createdAt: '2025-01-15',
    updatedAt: '2025-01-20',
    version: 3,
    requirements: '- 5+ years backend experience\n- Proficient in Node.js or Python\n- Experience with databases',
    responsibilities: '- Design and implement APIs\n- Optimize application performance\n- Collaborate with frontend team',
  },
  {
    id: '1-v2',
    name: 'Senior Backend Engineer',
    department: 'Engineering',
    description: 'Design and maintain backend services with focus on scalability.',
    flowType: 'ENGINEERING',
    isActive: false,
    createdAt: '2025-01-10',
    updatedAt: '2025-01-10',
    version: 2,
    parentId: '1',
  },
  {
    id: '1-v1',
    name: 'Senior Backend Engineer',
    department: 'Engineering',
    description: 'Build backend services.',
    flowType: 'ENGINEERING',
    isActive: false,
    createdAt: '2025-01-05',
    updatedAt: '2025-01-05',
    version: 1,
    parentId: '1',
  },
  {
    id: '2',
    name: 'Product Designer',
    department: 'Design',
    description: 'Create user-centered designs by understanding business requirements and user feedback.',
    flowType: 'STANDARD',
    isActive: true,
    createdAt: '2025-01-10',
    updatedAt: '2025-01-10',
    version: 1,
  },
  {
    id: '3',
    name: 'Growth Lead',
    department: 'Marketing',
    description: 'Drive user acquisition and retention through data-driven growth strategies.',
    flowType: 'SALES',
    isActive: true,
    createdAt: '2025-01-08',
    updatedAt: '2025-01-08',
    version: 1,
  },
  {
    id: '4',
    name: 'Executive Operations Manager',
    department: 'Operations',
    description: 'Partner with the CEO to manage strategic initiatives and operational excellence.',
    flowType: 'EXECUTIVE',
    isActive: true,
    createdAt: '2025-01-05',
    updatedAt: '2025-01-05',
    version: 2,
  },
  {
    id: '5',
    name: 'Frontend Developer',
    department: 'Engineering',
    description: 'Build responsive and performant web applications using modern frameworks.',
    flowType: 'ENGINEERING',
    isActive: false,
    createdAt: '2024-12-20',
    updatedAt: '2024-12-20',
    version: 1,
  },
]

const DEPARTMENTS = [
  { value: 'Engineering', icon: Code, color: 'text-blue-500 bg-blue-50' },
  { value: 'Design', icon: Palette, color: 'text-purple-500 bg-purple-50' },
  { value: 'Marketing', icon: Megaphone, color: 'text-pink-500 bg-pink-50' },
  { value: 'Sales', icon: TrendingUp, color: 'text-green-500 bg-green-50' },
  { value: 'Operations', icon: Settings, color: 'text-amber-500 bg-amber-50' },
  { value: 'People', icon: Users, color: 'text-indigo-500 bg-indigo-50' },
  { value: 'Finance', icon: Briefcase, color: 'text-emerald-500 bg-emerald-50' },
]

function getDepartmentInfo(department: string) {
  return DEPARTMENTS.find(d => d.value === department) || { icon: Briefcase, color: 'text-muted-foreground bg-muted/50' }
}

export default function JDsPage() {
  const { data: teams } = trpc.team.listForSelect.useQuery()
  const [jds, setJds] = useState<JD[]>(mockJDs)
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [jdToDelete, setJdToDelete] = useState<JD | null>(null)
  const [expandedJds, setExpandedJds] = useState<Set<string>>(new Set())

  // Get only the latest versions (JDs without parentId)
  const latestJDs = jds.filter(jd => !jd.parentId)

  // Filter JDs
  const filteredJDs = latestJDs.filter(jd => {
    const matchesSearch = jd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jd.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jd.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDepartment = departmentFilter === 'all' || jd.department === departmentFilter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'published' && jd.isActive) ||
      (statusFilter === 'draft' && !jd.isActive)
    return matchesSearch && matchesDepartment && matchesStatus
  })

  // Get version history for a JD
  const getVersionHistory = (jdId: string) => {
    return jds.filter(jd => jd.parentId === jdId).sort((a, b) => b.version - a.version)
  }

  const handleDeleteClick = (jd: JD) => {
    setJdToDelete(jd)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (jdToDelete) {
      // Delete the JD and all its versions
      setJds(jds.filter(jd => jd.id !== jdToDelete.id && jd.parentId !== jdToDelete.id))
      setDeleteDialogOpen(false)
      setJdToDelete(null)
    }
  }

  const handleDuplicate = (jd: JD) => {
    const duplicate: JD = {
      ...jd,
      id: Date.now().toString(),
      name: `${jd.name} (Copy)`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      isActive: false,
      version: 1,
      parentId: undefined,
    }
    setJds([duplicate, ...jds])
  }

  const handleToggleStatus = (jd: JD) => {
    setJds(jds.map(j =>
      j.id === jd.id ? { ...j, isActive: !j.isActive } : j
    ))
  }

  const toggleExpanded = (jdId: string) => {
    const newExpanded = new Set(expandedJds)
    if (newExpanded.has(jdId)) {
      newExpanded.delete(jdId)
    } else {
      newExpanded.add(jdId)
    }
    setExpandedJds(newExpanded)
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Job Descriptions"
        description="Manage job descriptions for your hiring pipeline. Create new JDs or new versions of existing ones."
        actions={
          <Button asChild>
            <Link href="/settings/jd-templates/new">
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
      {filteredJDs.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Hiring Flow</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJDs.map((jd) => {
                const deptInfo = getDepartmentInfo(jd.department)
                const DeptIcon = deptInfo.icon
                const versionHistory = getVersionHistory(jd.id)
                const hasVersions = versionHistory.length > 0
                const isExpanded = expandedJds.has(jd.id)

                return (
                  <>
                    <TableRow key={jd.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {hasVersions && (
                            <button
                              onClick={() => toggleExpanded(jd.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              <ChevronRight
                                className={cn(
                                  "h-4 w-4 text-muted-foreground transition-transform",
                                  isExpanded && "rotate-90"
                                )}
                              />
                            </button>
                          )}
                          {!hasVersions && <div className="w-6" />}
                          <div className={cn("p-2 rounded-lg", deptInfo.color)}>
                            <DeptIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <Link
                              href={`/settings/jd-templates/${jd.id}`}
                              className="font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {jd.name}
                            </Link>
                            <p className="text-sm text-muted-foreground line-clamp-1 max-w-[250px]">
                              {jd.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{jd.department}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {jd.flowType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">v{jd.version}</span>
                          {hasVersions && (
                            <span className="text-xs text-muted-foreground">
                              ({versionHistory.length} older)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {jd.isActive ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
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
                        {jd.updatedAt}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/settings/jd-templates/${jd.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/settings/jd-templates/new?from=${jd.id}`}>
                                <GitBranch className="h-4 w-4 mr-2" />
                                Create New Version
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDuplicate(jd)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleToggleStatus(jd)}>
                              {jd.isActive ? (
                                <>
                                  <EyeOff className="h-4 w-4 mr-2" />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Publish
                                </>
                              )}
                            </DropdownMenuItem>
                            {hasVersions && (
                              <DropdownMenuItem onSelect={() => toggleExpanded(jd.id)}>
                                <History className="h-4 w-4 mr-2" />
                                {isExpanded ? 'Hide' : 'Show'} Version History
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onSelect={() => handleDeleteClick(jd)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {/* Version History Rows */}
                    {isExpanded && versionHistory.map((version) => (
                      <TableRow key={version.id} className="bg-muted/50/50">
                        <TableCell>
                          <div className="flex items-center gap-3 pl-12">
                            <div className="w-0.5 h-8 bg-muted -ml-3" />
                            <Link
                              href={`/settings/jd-templates/${version.id}`}
                              className="text-sm text-foreground/80 hover:text-primary hover:underline"
                            >
                              {version.name}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{version.department}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{version.flowType}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <History className="h-3.5 w-3.5" />
                            <span className="text-sm">v{version.version}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-muted-foreground">
                            Archived
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {version.updatedAt}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/settings/jd-templates/${version.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/settings/jd-templates/new?from=${version.id}`}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Restore as New
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchQuery || departmentFilter !== 'all' || statusFilter !== 'all'
              ? 'No JDs match your filters'
              : 'No job descriptions yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || departmentFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first job description.'}
          </p>
          {!searchQuery && departmentFilter === 'all' && statusFilter === 'all' && (
            <Button asChild>
              <Link href="/settings/jd-templates/new">
                <Plus className="h-4 w-4 mr-2" />
                Create JD
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Stats */}
      {latestJDs.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span>{latestJDs.length} job description{latestJDs.length !== 1 ? 's' : ''}</span>
          <span>{latestJDs.filter(jd => jd.isActive).length} published</span>
          <span>{latestJDs.filter(jd => !jd.isActive).length} draft{latestJDs.filter(jd => !jd.isActive).length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Description</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{jdToDelete?.name}&quot;?
              {jdToDelete && getVersionHistory(jdToDelete.id).length > 0 && (
                <span className="block mt-2 text-amber-600">
                  This will also delete {getVersionHistory(jdToDelete.id).length} older version(s).
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
