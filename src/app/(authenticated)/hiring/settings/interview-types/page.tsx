'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Video, Trash2, Pencil, Search, MoreHorizontal, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc-client'
import { toast } from 'sonner'

export default function InterviewTypesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [typeToDelete, setTypeToDelete] = useState<{
    id: string
    name: string
    interviewCount: number
  } | null>(null)

  const interviewTypesQuery = trpc.interviewType.list.useQuery()
  const deleteTypeMutation = trpc.interviewType.delete.useMutation({
    onSuccess: () => {
      toast.success('Interview type deleted')
      interviewTypesQuery.refetch()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete interview type')
    },
  })
  const updateTypeMutation = trpc.interviewType.update.useMutation({
    onSuccess: () => {
      toast.success('Interview type deactivated')
      interviewTypesQuery.refetch()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update interview type')
    },
  })

  const types = interviewTypesQuery.data || []

  // Filter types
  const filteredTypes = types.filter((type) => {
    const matchesSearch = !searchQuery ||
      type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (type.description && type.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      type.slug.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const openDeleteDialog = (type: typeof types[number]) => {
    setTypeToDelete({
      id: type.id,
      name: type.name,
      interviewCount: type._count?.interviews || 0,
    })
    setDeleteInput('')
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!typeToDelete) return
    if (deleteInput.trim() !== 'DELETE') {
      toast.error('Type DELETE to confirm')
      return
    }

    if (typeToDelete.interviewCount > 0) {
      updateTypeMutation.mutate({ id: typeToDelete.id, isActive: false })
    } else {
      deleteTypeMutation.mutate({ id: typeToDelete.id })
    }
    setDeleteDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hiring/settings/interview">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Interview Types</h1>
          <p className="text-sm text-foreground/80">
            Configure interview types with default durations and question categories.
          </p>
        </div>
        <Link href="/hiring/settings/interview-types/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Type
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader className="p-5 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">All Types</h3>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search interview types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {interviewTypesQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
              <p className="font-medium">No interview types configured</p>
              <p className="text-sm mt-1">Create interview types to categorize your interviews.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Video className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {type.defaultDuration} min • {type.questionCategories?.length || 0} categories
                        {type.description && ` • ${type.description}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{type.slug}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/recruiting/settings/interview-types/${type.id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            openDeleteDialog(type)
                          }}
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
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete interview type</DialogTitle>
            <DialogDescription>
              {typeToDelete?.interviewCount
                ? `This type is used by ${typeToDelete.interviewCount} interview(s) and cannot be deleted. Typing DELETE will deactivate it and remove it from new selections.`
                : 'This action permanently deletes the interview type.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="delete-confirm"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteTypeMutation.isPending || updateTypeMutation.isPending}
            >
              {typeToDelete?.interviewCount ? 'Deactivate' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
