'use client'

import { useState } from 'react'
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
import { Plus, MoreHorizontal, Pencil, Trash2, Users, RefreshCw } from 'lucide-react'

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

  const syncTeams = trpc.team.syncFromDepartments.useMutation({
    onSuccess: (data) => {
      utils.team.list.invalidate()
      if (data.synced > 0) {
        alert(`Synced ${data.synced} new team(s): ${data.teams.join(', ')}`)
      } else {
        alert('All departments are already synced as teams.')
      }
    },
  })

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<{ id: string; name: string } | null>(null)

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    color: '#3B82F6',
  })

  const resetForm = () => {
    setFormData({ id: '', name: '', description: '', color: '#3B82F6' })
  }

  const handleCreate = () => {
    if (!formData.name.trim()) return
    createTeam.mutate({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
    })
  }

  const handleEdit = (team: { id: string; name: string; description?: string | null; color?: string | null }) => {
    setFormData({
      id: team.id,
      name: team.name,
      description: team.description || '',
      color: team.color || '#3B82F6',
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
    })
  }

  const handleDeleteClick = (team: { id: string; name: string }) => {
    setTeamToDelete(team)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (teamToDelete) {
      deleteTeam.mutate({ id: teamToDelete.id })
    }
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Teams"
        description="Manage teams and departments. Teams are used for organizing employees across the application."
      />

      {/* Actions Row */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => syncTeams.mutate()}
          disabled={syncTeams.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncTeams.isPending ? 'animate-spin' : ''}`} />
          {syncTeams.isPending ? 'Syncing...' : 'Sync from Employees'}
        </Button>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Add a new team to organize your employees.
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
            Teams are synced with employee departments. Employees with matching department names will appear under each team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : teams && teams.length > 0 ? (
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: team.color || '#3B82F6' }}
                    >
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{team.name}</h3>
                      {team.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">{team.description}</p>
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
                        <DropdownMenuItem onClick={() => handleEdit(team)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteClick(team)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first team or sync from existing employee departments.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => syncTeams.mutate()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync from Employees
                </Button>
                <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team
                </Button>
              </div>
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
              Are you sure you want to delete &quot;{teamToDelete?.name}&quot;? This action cannot be undone.
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
