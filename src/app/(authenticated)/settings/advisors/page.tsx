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
import { Plus, MoreHorizontal, Pencil, Trash2, UserCheck, Mail, Building2, Phone } from 'lucide-react'
import { toast } from 'sonner'

interface Advisor {
  id: string
  fullName: string
  email: string
  title: string | null
  company: string | null
  phone: string | null
  notes: string | null
  isActive: boolean
}

export default function AdvisorsPage() {
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.advisor.list.useQuery()

  const createAdvisor = trpc.advisor.create.useMutation({
    onSuccess: () => {
      utils.advisor.list.invalidate()
      setCreateDialogOpen(false)
      resetForm()
      toast.success('Advisor added successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add advisor')
    },
  })

  const updateAdvisor = trpc.advisor.update.useMutation({
    onSuccess: () => {
      utils.advisor.list.invalidate()
      setEditDialogOpen(false)
      resetForm()
      toast.success('Advisor updated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update advisor')
    },
  })

  const deleteAdvisor = trpc.advisor.delete.useMutation({
    onSuccess: () => {
      utils.advisor.list.invalidate()
      setDeleteDialogOpen(false)
      setAdvisorToDelete(null)
      toast.success('Advisor deleted')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete advisor')
    },
  })

  const toggleActive = trpc.advisor.toggleActive.useMutation({
    onSuccess: () => {
      utils.advisor.list.invalidate()
    },
  })

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [advisorToDelete, setAdvisorToDelete] = useState<{ id: string; fullName: string } | null>(null)

  const [formData, setFormData] = useState({
    id: '',
    fullName: '',
    email: '',
    title: '',
    company: '',
    phone: '',
    notes: '',
  })

  const resetForm = () => {
    setFormData({ id: '', fullName: '', email: '', title: '', company: '', phone: '', notes: '' })
  }

  const handleCreate = () => {
    if (!formData.fullName.trim() || !formData.email.trim()) return
    createAdvisor.mutate({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      title: formData.title.trim() || undefined,
      company: formData.company.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    })
  }

  const handleEdit = (advisor: Advisor) => {
    setFormData({
      id: advisor.id,
      fullName: advisor.fullName,
      email: advisor.email,
      title: advisor.title || '',
      company: advisor.company || '',
      phone: advisor.phone || '',
      notes: advisor.notes || '',
    })
    setEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!formData.fullName.trim() || !formData.email.trim()) return
    updateAdvisor.mutate({
      id: formData.id,
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      title: formData.title.trim() || null,
      company: formData.company.trim() || null,
      phone: formData.phone.trim() || null,
      notes: formData.notes.trim() || null,
    })
  }

  const handleDeleteClick = (advisor: Advisor) => {
    setAdvisorToDelete({ id: advisor.id, fullName: advisor.fullName })
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (advisorToDelete) {
      deleteAdvisor.mutate({ id: advisorToDelete.id })
    }
  }

  const advisors = data?.advisors || []

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Advisors"
        description="Manage external advisors who can be assigned as interviewers. Advisors are not employees but can participate in interviews."
      />

      {/* Actions Row */}
      <div className="flex items-center justify-end">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Advisor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Advisor</DialogTitle>
              <DialogDescription>
                Add an external advisor who can be assigned as an interviewer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title / Role</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Technical Advisor"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Their company name"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about this advisor..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createAdvisor.isPending || !formData.fullName.trim() || !formData.email.trim()}
              >
                {createAdvisor.isPending ? 'Adding...' : 'Add Advisor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Advisors List */}
      <Card>
        <CardHeader>
          <CardTitle>External Advisors</CardTitle>
          <CardDescription>
            Advisors can be assigned as interviewers for candidates. Note: Smart scheduling is not available for advisors as we cannot access their calendars.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : advisors.length > 0 ? (
            <div className="space-y-3">
              {advisors.map((advisor) => (
                <div
                  key={advisor.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {advisor.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{advisor.fullName}</h3>
                        {!advisor.isActive && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {advisor.email}
                        </span>
                        {advisor.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {advisor.company}
                          </span>
                        )}
                        {advisor.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {advisor.phone}
                          </span>
                        )}
                      </div>
                      {advisor.title && (
                        <p className="text-xs text-muted-foreground mt-1">{advisor.title}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleEdit(advisor)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => toggleActive.mutate({ id: advisor.id })}>
                          <UserCheck className="h-4 w-4 mr-2" />
                          {advisor.isActive ? 'Mark Inactive' : 'Mark Active'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onSelect={() => handleDeleteClick(advisor)}
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
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No advisors yet</h3>
              <p className="text-muted-foreground mb-4">
                Add external advisors who can participate in candidate interviews.
              </p>
              <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Advisor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Advisor</DialogTitle>
            <DialogDescription>
              Update advisor details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Full Name *</Label>
                <Input
                  id="edit-fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title / Role</Label>
                <Input
                  id="edit-title"
                  placeholder="e.g. Technical Advisor"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-company">Company</Label>
                <Input
                  id="edit-company"
                  placeholder="Their company name"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Any additional notes about this advisor..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateAdvisor.isPending || !formData.fullName.trim() || !formData.email.trim()}
            >
              {updateAdvisor.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advisor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{advisorToDelete?.fullName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteAdvisor.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
