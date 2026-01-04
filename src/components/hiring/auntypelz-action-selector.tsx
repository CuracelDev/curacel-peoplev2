'use client'

import { useState, useMemo } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Search, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuntyPelzActionSelectorProps {
  value: string[] // Array of action IDs
  onChange: (value: string[]) => void
}

export function AuntyPelzActionSelector({ value, onChange }: AuntyPelzActionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch active AI custom tools in the "hiring" category
  const { data: allActions, isLoading } = trpc.aiCustomTools.list.useQuery({
    category: 'hiring',
    isActive: true,
  })

  // Filter actions based on search query
  const filteredActions = useMemo(() => {
    if (!allActions) return []
    if (!searchQuery.trim()) return allActions

    const query = searchQuery.toLowerCase()
    return allActions.filter(
      (action) =>
        action.displayName.toLowerCase().includes(query) ||
        action.description.toLowerCase().includes(query) ||
        action.category.toLowerCase().includes(query)
    )
  }, [allActions, searchQuery])

  const toggleAction = (actionId: string) => {
    if (value.includes(actionId)) {
      onChange(value.filter((id) => id !== actionId))
    } else {
      onChange([...value, actionId])
    }
  }

  const removeAction = (actionId: string) => {
    onChange(value.filter((id) => id !== actionId))
  }

  // Get selected action details for display
  const selectedActions = useMemo(() => {
    if (!allActions) return []
    return allActions.filter((action) => value.includes(action.id))
  }, [allActions, value])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading actions...
      </div>
    )
  }

  if (!allActions || allActions.length === 0) {
    return (
      <div className="p-8 text-center">
        <Zap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          No automated actions available yet.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Actions can be created in the AuntyPelz settings.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select automated actions that AuntyPelz should perform for candidates applying to this job.
      </p>

      {/* Selected Actions */}
      {selectedActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedActions.map((action) => (
            <Badge
              key={action.id}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => removeAction(action.id)}
            >
              <Zap className="h-3 w-3" />
              {action.displayName}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search actions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Actions List */}
      <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
        {filteredActions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No actions match your search.
          </div>
        ) : (
          filteredActions.map((action) => {
            const isSelected = value.includes(action.id)
            return (
              <label
                key={action.id}
                className={cn(
                  'flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                  isSelected && 'bg-indigo-50/50'
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleAction(action.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{action.displayName}</span>
                    {action.isBuiltIn && (
                      <Badge variant="outline" className="text-xs">
                        Built-in
                      </Badge>
                    )}
                    {action.requiresConfirmation && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                        Requires approval
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </label>
            )
          })
        )}
      </div>

      {selectedActions.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <span>{selectedActions.length} action{selectedActions.length !== 1 ? 's' : ''} selected</span>
        </div>
      )}
    </div>
  )
}
