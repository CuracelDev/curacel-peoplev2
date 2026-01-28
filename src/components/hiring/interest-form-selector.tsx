'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc-client'
import { FileText, Plus, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface InterestFormSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function InterestFormSelector({
  value,
  onChange,
}: InterestFormSelectorProps) {
  const [mode, setMode] = useState<'select' | 'create' | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { data: interestForms, refetch } = trpc.interestForm.listForSelect.useQuery()

  // Fetch full form details when one is selected
  const { data: fullForm } = trpc.interestForm.get.useQuery(
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

  const selectedForm = (interestForms || []).find(form => form.id === value)

  const handleSelect = (formId: string) => {
    onChange(formId)
    setMode(null)
  }

  const handleCreateNew = () => {
    // Open Interest Form creation in new tab
    window.open('/hiring/settings/interest-forms/new', '_blank')
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

      {/* Existing form selection */}
      {mode === 'select' && (
        <div className="space-y-3">
          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {(interestForms || []).map((form) => (
              <button
                key={form.id}
                type="button"
                onClick={() => handleSelect(form.id)}
                className={cn(
                  'p-3 border rounded-lg text-left transition-all',
                  value === form.id
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-border hover:border-indigo-300'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{form.name}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {(!interestForms || interestForms.length === 0) && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No interest forms found.{' '}
              <Link href="/hiring/settings/interest-forms/new" className="text-indigo-600 hover:underline">
                Create your first one
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Selected form display - Collapsible */}
      {selectedForm && (
        <div className="border border-indigo-500 bg-indigo-50/50 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full p-3 flex items-center justify-between hover:bg-indigo-100/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{selectedForm.name}</div>
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
              {fullForm ? (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Form Questions ({fullForm.questions.length})
                  </div>
                  {fullForm.questions.map((question, index) => (
                    <div key={question.id} className="pb-3 border-b last:border-0">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-muted-foreground mt-0.5">
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">
                            {question.question}
                            {question.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Type: {question.type}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading questions...</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info message when no form selected */}
      {!selectedForm && mode !== 'select' && (
        <div className="p-4 bg-muted/50 rounded-lg border flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Select an interest form or{' '}
            <Link href="/hiring/settings/interest-forms" className="text-indigo-600 hover:underline">
              create a new one
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
