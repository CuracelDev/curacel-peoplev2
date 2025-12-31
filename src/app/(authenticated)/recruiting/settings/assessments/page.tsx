'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Code,
  Brain,
  Briefcase,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Target,
  Search,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type AssessmentType = 'COMPETENCY_TEST' | 'CODING_TEST' | 'PERSONALITY_TEST' | 'WORK_TRIAL' | 'CUSTOM'

const typeConfig: Record<AssessmentType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  COMPETENCY_TEST: { label: 'Competency Test', icon: Target, color: 'bg-purple-100 text-purple-800' },
  CODING_TEST: { label: 'Coding Test', icon: Code, color: 'bg-blue-100 text-blue-800' },
  PERSONALITY_TEST: { label: 'Personality Test', icon: Brain, color: 'bg-pink-100 text-pink-800' },
  WORK_TRIAL: { label: 'Work Trial', icon: Briefcase, color: 'bg-green-100 text-green-800' },
  CUSTOM: { label: 'Custom', icon: FileText, color: 'bg-gray-100 text-gray-800' },
}

const assessmentTypes: { key: AssessmentType; label: string }[] = [
  { key: 'COMPETENCY_TEST', label: 'Competency Test' },
  { key: 'CODING_TEST', label: 'Coding Test' },
  { key: 'PERSONALITY_TEST', label: 'Personality Test' },
  { key: 'WORK_TRIAL', label: 'Work Trial' },
  { key: 'CUSTOM', label: 'Custom' },
]

export default function AssessmentSettingsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Fetch ALL templates
  const { data: templates, isLoading, refetch } = trpc.assessment.listTemplates.useQuery({})

  // Filter templates locally
  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch = !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || template.type === typeFilter
    return matchesSearch && matchesType
  })

  // Mutations
  const deleteTemplate = trpc.assessment.deleteTemplate.useMutation({
    onSuccess: () => {
      refetch()
      toast.success('Assessment deleted')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete assessment')
    },
  })

  return (
    <div className="space-y-6">
      {/* Assessments Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Assessments</CardTitle>
            <CardDescription>
              Configure assessments for candidate evaluations
            </CardDescription>
          </div>
          <Link href="/recruiting/settings/assessments/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Assessment
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assessments..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {assessmentTypes.map((type) => (
                  <SelectItem key={type.key} value={type.key}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredTemplates?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No assessments found</p>
              <p className="text-sm">
                {searchQuery || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first assessment to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Passing Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => {
                  const config = typeConfig[template.type as AssessmentType] || typeConfig.CUSTOM
                  const TypeIcon = config.icon
                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {template.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('flex items-center gap-1 w-fit', config.color)}>
                          <TypeIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {template.teamId ? 'Team Specific' : 'Global'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.durationMinutes ? `${template.durationMinutes} min` : '-'}
                      </TableCell>
                      <TableCell>
                        {template.passingScore ? `${template.passingScore}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={template.isActive ? 'bg-green-100 text-green-800' : 'bg-muted text-foreground/80'}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </Badge>
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
                              <Link href={`/recruiting/settings/assessments/${template.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => deleteTemplate.mutate({ id: template.id })}
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
