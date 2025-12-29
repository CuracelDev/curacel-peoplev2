'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  ClipboardList,
  Search,
} from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { trpc } from '@/lib/trpc-client'

interface CriteriaFormData {
  name: string
  weight: number
  description: string
}

export default function HiringRubricsPage() {
  const utils = trpc.useUtils()
  const { data: rubrics, isLoading } = trpc.hiringRubric.list.useQuery()

  const createMutation = trpc.hiringRubric.create.useMutation({
    onSuccess: () => {
      utils.hiringRubric.list.invalidate()
      setCreateDialogOpen(false)
      resetForm()
    },
  })

  const updateMutation = trpc.hiringRubric.update.useMutation({
    onSuccess: () => {
      utils.hiringRubric.list.invalidate()
      setEditDialogOpen(false)
      resetForm()
      setEditingRubricId(null)
    },
  })

  const deleteMutation = trpc.hiringRubric.delete.useMutation({
    onSuccess: () => {
      utils.hiringRubric.list.invalidate()
      setDeleteDialogOpen(false)
      setRubricToDelete(null)
    },
  })

  const duplicateMutation = trpc.hiringRubric.duplicate.useMutation({
    onSuccess: () => {
      utils.hiringRubric.list.invalidate()
    },
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rubricToDelete, setRubricToDelete] = useState<{ id: string; name: string } | null>(null)
  const [editingRubricId, setEditingRubricId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    criteria: [{ name: '', weight: 25, description: '' }] as CriteriaFormData[],
  })

  const filteredRubrics = (rubrics || []).filter(rubric =>
    rubric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rubric.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      criteria: [{ name: '', weight: 25, description: '' }],
    })
  }

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      criteria: formData.criteria
        .filter(c => c.name.trim())
        .map(c => ({
          name: c.name,
          description: c.description || undefined,
          weight: c.weight,
        })),
    })
  }

  const handleEdit = (rubric: typeof filteredRubrics[0]) => {
    setEditingRubricId(rubric.id)
    setFormData({
      name: rubric.name,
      description: rubric.description || '',
      criteria: rubric.criteria.map(c => ({
        name: c.name,
        weight: c.weight,
        description: c.description || '',
      })),
    })
    setEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!editingRubricId) return
    updateMutation.mutate({
      id: editingRubricId,
      name: formData.name,
      description: formData.description || undefined,
      criteria: formData.criteria
        .filter(c => c.name.trim())
        .map(c => ({
          name: c.name,
          description: c.description || undefined,
          weight: c.weight,
        })),
    })
  }

  const handleDuplicate = (id: string) => {
    duplicateMutation.mutate({ id })
  }

  const handleDelete = () => {
    if (!rubricToDelete) return
    deleteMutation.mutate({ id: rubricToDelete.id })
  }

  const addCriteria = () => {
    setFormData({
      ...formData,
      criteria: [...formData.criteria, { name: '', weight: 25, description: '' }],
    })
  }

  const removeCriteria = (index: number) => {
    setFormData({
      ...formData,
      criteria: formData.criteria.filter((_, i) => i !== index),
    })
  }

  const updateCriteria = (index: number, field: keyof CriteriaFormData, value: string | number) => {
    const newCriteria = [...formData.criteria]
    newCriteria[index] = { ...newCriteria[index], [field]: value }
    setFormData({ ...formData, criteria: newCriteria })
  }

  const totalWeight = formData.criteria.reduce((sum, c) => sum + (c.weight || 0), 0)

  const RubricForm = () => (
    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
      <div className="space-y-2">
        <Label htmlFor="name">Rubric Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Engineering Technical Assessment"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of when to use this rubric..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Evaluation Criteria</Label>
          <Badge variant={totalWeight === 100 ? 'default' : 'destructive'}>
            Total: {totalWeight}%
          </Badge>
        </div>
        {formData.criteria.map((criterion, index) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Criterion name"
                value={criterion.name}
                onChange={(e) => updateCriteria(index, 'name', e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="Weight %"
                value={criterion.weight}
                onChange={(e) => updateCriteria(index, 'weight', parseInt(e.target.value) || 0)}
                className="w-24"
              />
              {formData.criteria.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCriteria(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input
              placeholder="Description of what to evaluate"
              value={criterion.description}
              onChange={(e) => updateCriteria(index, 'description', e.target.value)}
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addCriteria} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Criterion
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings/job-settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <SettingsPageHeader
          title="Hiring Rubrics"
          description="Create and manage evaluation rubrics for consistent candidate assessment"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search rubrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rubric
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Hiring Rubric</DialogTitle>
              <DialogDescription>
                Define evaluation criteria and weights for candidate assessment.
              </DialogDescription>
            </DialogHeader>
            <RubricForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.name.trim() || totalWeight !== 100 || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Rubric'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rubrics List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Rubrics</CardTitle>
          <CardDescription>
            Select a rubric when creating jobs to standardize candidate evaluation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading rubrics...</div>
          ) : filteredRubrics.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rubric Name</TableHead>
                  <TableHead>Criteria</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRubrics.map((rubric) => (
                  <TableRow key={rubric.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rubric.name}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {rubric.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {rubric.criteria.slice(0, 3).map((c) => (
                          <Badge key={c.id} variant="secondary" className="text-xs">
                            {c.name} ({c.weight}%)
                          </Badge>
                        ))}
                        {rubric.criteria.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{rubric.criteria.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">v{rubric.version}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(rubric.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleEdit(rubric)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleDuplicate(rubric.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onSelect={() => {
                              setRubricToDelete({ id: rubric.id, name: rubric.name })
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rubrics yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first hiring rubric to standardize candidate evaluation.
              </p>
              <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Rubric
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Hiring Rubric</DialogTitle>
            <DialogDescription>
              Update evaluation criteria. This will create a new version.
            </DialogDescription>
          </DialogHeader>
          <RubricForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name.trim() || totalWeight !== 100 || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rubric</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{rubricToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
