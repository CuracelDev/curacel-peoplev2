'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Target,
  Search,
} from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { trpc } from '@/lib/trpc-client'

const DEFAULT_CATEGORIES = [
  'Technical',
  'Leadership',
  'Communication',
  'Problem Solving',
  'Collaboration',
  'Business',
  'Personal',
]

export default function CompetenciesPage() {
  const utils = trpc.useUtils()
  const { data: competencies, isLoading } = trpc.competency.list.useQuery()
  const { data: existingCategories } = trpc.competency.categories.useQuery()

  const createMutation = trpc.competency.create.useMutation({
    onSuccess: () => {
      utils.competency.list.invalidate()
      utils.competency.categories.invalidate()
      setCreateDialogOpen(false)
      resetForm()
    },
  })

  const updateMutation = trpc.competency.update.useMutation({
    onSuccess: () => {
      utils.competency.list.invalidate()
      utils.competency.categories.invalidate()
      setEditDialogOpen(false)
      resetForm()
      setEditingCompetencyId(null)
    },
  })

  const deleteMutation = trpc.competency.delete.useMutation({
    onSuccess: () => {
      utils.competency.list.invalidate()
      utils.competency.categories.invalidate()
      setDeleteDialogOpen(false)
      setCompetencyToDelete(null)
    },
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [competencyToDelete, setCompetencyToDelete] = useState<{ id: string; name: string } | null>(null)
  const [editingCompetencyId, setEditingCompetencyId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Technical',
  })

  // Merge default categories with any existing ones from the database
  const allCategories = useMemo(() => {
    const categories = new Set([...DEFAULT_CATEGORIES, ...(existingCategories || [])])
    return Array.from(categories).sort()
  }, [existingCategories])

  const filteredCompetencies = useMemo(() => {
    return (competencies || []).filter(comp => {
      const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comp.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || comp.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [competencies, searchQuery, categoryFilter])

  // Group by category
  const groupedCompetencies = useMemo(() => {
    return filteredCompetencies.reduce((acc, comp) => {
      if (!acc[comp.category]) acc[comp.category] = []
      acc[comp.category].push(comp)
      return acc
    }, {} as Record<string, typeof filteredCompetencies>)
  }, [filteredCompetencies])

  const resetForm = () => {
    setFormData({ name: '', description: '', category: 'Technical' })
  }

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
    })
  }

  const handleEdit = (comp: typeof filteredCompetencies[0]) => {
    setEditingCompetencyId(comp.id)
    setFormData({
      name: comp.name,
      description: comp.description || '',
      category: comp.category,
    })
    setEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!editingCompetencyId) return
    updateMutation.mutate({
      id: editingCompetencyId,
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
    })
  }

  const handleDelete = () => {
    if (!competencyToDelete) return
    deleteMutation.mutate({ id: competencyToDelete.id })
  }

  const CompetencyForm = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Competency Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Problem Solving"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {allCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what this competency entails..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
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
          title="Role Competencies"
          description="Define competencies that can be selected when creating job positions"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search competencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Competency
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Competency</DialogTitle>
              <DialogDescription>
                Create a new competency that can be used in job positions.
              </DialogDescription>
            </DialogHeader>
            <CompetencyForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.name.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Adding...' : 'Add Competency'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Competencies by Category */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">Loading competencies...</div>
          </CardContent>
        </Card>
      ) : Object.keys(groupedCompetencies).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedCompetencies).map(([category, comps]) => (
            <Card key={category}>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">{category}</CardTitle>
                <CardDescription>{comps.length} competencies</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {comps.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                          <span className="font-medium">{comp.name}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEdit(comp)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onSelect={() => {
                                setCompetencyToDelete({ id: comp.id, name: comp.name })
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {comp.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No competencies found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filter.'
                  : 'Create your first competency to get started.'}
              </p>
              {!searchQuery && categoryFilter === 'all' && (
                <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Competency
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Competency</DialogTitle>
            <DialogDescription>
              Update the competency details.
            </DialogDescription>
          </DialogHeader>
          <CompetencyForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name.trim() || updateMutation.isPending}
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
            <AlertDialogTitle>Delete Competency</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{competencyToDelete?.name}&quot;? This action cannot be undone.
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
