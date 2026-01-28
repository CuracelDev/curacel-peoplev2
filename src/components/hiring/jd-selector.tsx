'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc-client'
import { FileText, Plus, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface JDSelectorProps {
  value: string
  onChange: (value: string) => void
  onTitleChange?: (title: string) => void
  onDepartmentChange?: (department: string) => void
}

export function JDSelector({
  value,
  onChange,
  onTitleChange,
  onDepartmentChange,
}: JDSelectorProps) {
  const [mode, setMode] = useState<'select' | 'create' | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { data: jobDescriptions, refetch } = trpc.jobDescription.listForSelect.useQuery()

  // Fetch full JD details when one is selected
  const { data: fullJD } = trpc.jobDescription.get.useQuery(
    { id: value },
    { enabled: !!value }
  )

  // Refetch when window regains focus (e.g., coming back from new tab)
  useEffect(() => {
    const handleFocus = () => {
      refetch()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetch])

  const selectedJD = (jobDescriptions || []).find(jd => jd.id === value)

  const handleSelect = (jdId: string) => {
    const jd = jobDescriptions?.find(j => j.id === jdId)
    onChange(jdId)
    if (jd) {
      onTitleChange?.(jd.name)
      onDepartmentChange?.(jd.department || '')
    }
  }

  const handleCreateNew = () => {
    // Open JD creation in new tab
    window.open('/hiring/settings/jd-templates/new', '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Option buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant={mode === 'select' ? 'default' : 'outline'}
          onClick={() => setMode(mode === 'select' ? null : 'select')}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Select Existing
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCreateNew}
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Existing JD selection */}
      {mode === 'select' && (
        <div className="space-y-3">
          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {(jobDescriptions || []).map((jd) => (
              <button
                key={jd.id}
                type="button"
                onClick={() => {
                  handleSelect(jd.id)
                  setMode(null)
                }}
                className={cn(
                  'p-3 border rounded-lg text-left transition-all',
                  value === jd.id
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-border hover:border-indigo-300'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{jd.name}</div>
                    {jd.department && (
                      <Badge variant="secondary" className="text-xs mt-2">
                        {jd.department}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {(!jobDescriptions || jobDescriptions.length === 0) && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No job descriptions found.{' '}
              <Link href="/hiring/settings/jd-templates/new" className="text-indigo-600 hover:underline">
                Create your first one
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Selected JD display - Collapsible */}
      {selectedJD && (
        <div className="border border-indigo-500 bg-indigo-50/50 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full p-3 flex items-center justify-between hover:bg-indigo-100/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{selectedJD.name}</div>
                {selectedJD.department && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {selectedJD.department}
                  </Badge>
                )}
              </div>
            </div>
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </button>

          {!isCollapsed && (
            <div className="p-4 border-t bg-white max-h-96 overflow-y-auto">
              {fullJD ? (
                <div
                  className="prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: fullJD.content }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Loading content...</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info message when no JD selected */}
      {!selectedJD && mode !== 'select' && (
        <div className="p-4 bg-muted/50 rounded-lg border flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Select from your JD library or{' '}
            <Link href="/hiring/settings/jd-templates" className="text-indigo-600 hover:underline">
              create a new one
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
