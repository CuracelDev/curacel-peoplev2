'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
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
  DropdownMenuSeparator,
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
import { Plus, MoreHorizontal, Pencil, Trash2, Users, ChevronRight, FolderPlus, Brain } from 'lucide-react'

const TEAM_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Yellow', value: '#EAB308' },
]

interface SubTeam {
  id: string
  name: string
  description: string | null
  color: string | null
  employeeCount: number
}

interface Team {
  id: string
  name: string
  description: string | null
  color: string | null
  parentId: string | null
  employeeCount: number
  subTeams: SubTeam[]
}

export default function TeamsPage() {
  const utils = trpc.useUtils()
  const { data: teams, isLoading } = trpc.team.list.useQuery()

  const createTeam = trpc.team.create.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate()
      setCreateDialogOpen(false)
      resetForm()
    },
  })

  const updateTeam = trpc.team.update.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate()
      setEditDialogOpen(false)
      resetForm()
    },
  })

  const deleteTeam = trpc.team.delete.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate()
      setDeleteDialogOpen(false)
      setTeamToDelete(null)
    },
  })

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<{ id: string; name: string } | null>(null)
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    color: '#3B82F6',
    parentId: '',
  })

  const resetForm = () => {
    setFormData({ id: '', name: '', description: '', color: '#3B82F6', parentId: '' })
  }

  const handleCreate = () => {
    if (!formData.name.trim()) return
    createTeam.mutate({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
      parentId: formData.parentId || undefined,
    })
  }

  const handleEdit = (team: { id: string; name: string; description?: string | null; color?: string | null; parentId?: string | null }) => {
    setFormData({
      id: team.id,
      name: team.name,
      description: team.description || '',
      color: team.color || '#3B82F6',
      parentId: team.parentId || '',
    })
    setEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!formData.name.trim()) return
    updateTeam.mutate({
      id: formData.id,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      color: formData.color,
      parentId: formData.parentId || null,
    })
  }

  const handleDeleteClick = (team: { id: string; name: string }) => {
    setTeamToDelete(team)
    setDeleteDialogOpen(true)
  }

  const handleAddSubTeam = (parentId: string) => {
    const parent = teams?.find((t) => t.id === parentId)
    setFormData({
      id: '',
      name: '',
      description: '',
      color: parent?.color || '#3B82F6',
      parentId: parentId,
    })
    setCreateDialogOpen(true)
  }

  const confirmDelete = () => {
    if (teamToDelete) {
      deleteTeam.mutate({ id: teamToDelete.id })
    }
  }

  const toggleExpanded = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) {
        next.delete(teamId)
      } else {
        next.add(teamId)
      }
      return next
    })
  }

  const renderTeamRow = (team: Team | SubTeam, isSubTeam = false, parentTeam?: Team) => {
    const hasSubTeams = !isSubTeam && 'subTeams' in team && team.subTeams.length > 0
    const isExpanded = expandedTeams.has(team.id)

    return (
      <div key={team.id}>
        <div
          className={`flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted transition-colors ${
            isSubTeam ? 'ml-8 bg-muted/50/50' : ''
          }`}
        >
          <div className="flex items-center gap-4">
            {hasSubTeams && (
              <button
                onClick={() => toggleExpanded(team.id)}
                className="p-1 hover:bg-muted rounded"
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
            )}
            {!hasSubTeams && !isSubTeam && <div className="w-6" />}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: team.color || '#3B82F6' }}
            >
              {team.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                {team.name}
                {isSubTeam && parentTeam && (
                  <span className="text-muted-foreground text-sm ml-2">
                    (under {parentTeam.name})
                  </span>
                )}
              </h3>
              {team.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">{team.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {team.employeeCount} {team.employeeCount === 1 ? 'member' : 'members'}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleEdit(team)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {!isSubTeam && (
                  <DropdownMenuItem onSelect={() => handleAddSubTeam(team.id)}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Add Sub-Team
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onSelect={() => handleDeleteClick(team)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Render sub-teams if expanded */}
        {hasSubTeams && isExpanded && (
          <div className="space-y-2 mt-2">
            {(team as Team).subTeams.map((subTeam) =>
              renderTeamRow(subTeam, true, team as Team)
            )}
          </div>
        )}
      </div>
    )
  }

  // Get parent team options (exclude current team if editing)
  const parentTeamOptions = teams?.filter((t) => t.id !== formData.id) || []

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Teams"
        description="Manage teams and departments. Teams are used for organizing employees across the application."
      />

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            <Link
              href="/hiring/settings/all?section=personality"
              className="flex items-center gap-4 p-6 hover:bg-muted transition-colors"
            >
              <div className="bg-indigo-100 p-3 rounded-lg flex-shrink-0">
                <Brain className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground mb-1">Personality Templates</h3>
                <p className="text-sm text-foreground/80">
                  Define ideal OCEAN personality profiles for department fit analysis.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </Link>
            <Link
              href="/hiring/settings/all?section=team"
              className="flex items-center gap-4 p-6 hover:bg-muted transition-colors"
            >
              <div className="bg-indigo-100 p-3 rounded-lg flex-shrink-0">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground mb-1">Team Profiles</h3>
                <p className="text-sm text-foreground/80">
                  Configure team-specific preferences and guidance.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Actions Row */}
      <div className="flex items-center justify-end">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {formData.parentId ? 'Create Sub-Team' : 'Create New Team'}
              </DialogTitle>
              <DialogDescription>
                {formData.parentId
                  ? 'Add a sub-team under an existing team.'
                  : 'Add a new team to organize your employees.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Engineering"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Team (optional)</Label>
                <Select
                  value={formData.parentId || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parentId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent team (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent (root team)</SelectItem>
                    {parentTeamOptions.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the team..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color.value
                          ? 'border-gray-900 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createTeam.isPending || !formData.name.trim()}>
                {createTeam.isPending ? 'Creating...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Teams List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Teams</CardTitle>
          <CardDescription>
            Manage your organization&apos;s teams and sub-teams. Employees are assigned to teams based on their department.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : teams && teams.length > 0 ? (
            <div className="space-y-3">
              {teams.map((team) => renderTeamRow(team as Team))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No teams yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first team to organize your employees.
              </p>
              <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Team
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Team Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g. Engineering"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parent">Parent Team (optional)</Label>
              <Select
                value={formData.parentId || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, parentId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (root team)</SelectItem>
                  {parentTeamOptions.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Brief description of the team..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color.value
                        ? 'border-gray-900 scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateTeam.isPending || !formData.name.trim()}>
              {updateTeam.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{teamToDelete?.name}&quot;? This will also delete all sub-teams.
              Employees in this team will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteTeam.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
