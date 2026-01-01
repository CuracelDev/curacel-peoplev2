'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Video, Trash2, Pencil, Search, MoreHorizontal, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc-client'

export default function InterviewTypesPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const interviewTypesQuery = trpc.interviewType.list.useQuery()
  const deleteTypeMutation = trpc.interviewType.delete.useMutation({
    onSuccess: () => interviewTypesQuery.refetch(),
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-5 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">Interview Types</h2>
              <p className="text-sm text-muted-foreground">
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
                            if (confirm('Are you sure you want to delete this interview type?')) {
                              deleteTypeMutation.mutate({ id: type.id })
                            }
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
    </div>
  )
}
