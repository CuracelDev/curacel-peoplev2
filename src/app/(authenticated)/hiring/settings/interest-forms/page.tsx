'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, FileQuestion, Trash2, Pencil, Search, MoreHorizontal, Check, ChevronDown, ChevronUp } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'

const questionTypeLabels: Record<string, string> = {
  TEXT: 'Short Text',
  TEXTAREA: 'Long Text',
  EMAIL: 'Email',
  PHONE: 'Phone',
  URL: 'URL',
  SELECT: 'Dropdown',
  MULTISELECT: 'Multi-Select',
  RADIO: 'Radio Buttons',
  CHECKBOX: 'Checkbox',
  DATE: 'Date',
  SCALE: 'Rating Scale',
  FILE: 'File Upload',
}

export default function InterestFormsPage() {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const interestFormsQuery = trpc.interestForm.list.useQuery()
  const deleteFormMutation = trpc.interestForm.delete.useMutation({
    onSuccess: () => {
      interestFormsQuery.refetch()
      setSelectedFormId(null)
    },
  })

  const normalizeQuestionOptions = (options: unknown) => {
    if (!options) return ''
    if (typeof options === 'string') return options
    if (!Array.isArray(options)) return ''
    return options
      .map((option) => {
        if (typeof option === 'string') return option
        if (option && typeof option === 'object') {
          const { label, value } = option as { label?: unknown; value?: unknown }
          if (typeof label === 'string') return label
          if (typeof value === 'string' || typeof value === 'number') return String(value)
        }
        return ''
      })
      .filter(Boolean)
      .join(', ')
  }

  const forms = interestFormsQuery.data || []

  // Filter forms
  const filteredForms = forms.filter((form) => {
    const matchesSearch = !searchQuery ||
      form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (form.description && form.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  const selectedForm = forms.find((f) => f.id === selectedFormId)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-5 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">Interest Forms</h2>
              <p className="text-sm text-muted-foreground">
                Create and manage application forms for candidates to express interest in positions.
              </p>
            </div>
            <Link href="/hiring/settings/interest-forms/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Form
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
                placeholder="Search forms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {interestFormsQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileQuestion className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
              <p>No interest forms yet. Create your first form to collect candidate applications.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filteredForms.map((form) => (
                  <div
                    key={form.id}
                    className={cn(
                      'flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all',
                      selectedFormId === form.id
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-border hover:border-border'
                    )}
                    onClick={() => setSelectedFormId(selectedFormId === form.id ? null : form.id)}
                  >
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                      <FileQuestion className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{form.name}</span>
                        {form.isDefault && (
                          <Badge variant="secondary" className="bg-success/10 text-success-foreground">
                            <Check className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {form.questions?.length || 0} questions
                        {form.description && ` • ${form.description}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/recruiting/settings/interest-forms/${form.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Delete this form?')) {
                                deleteFormMutation.mutate({ id: form.id })
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {selectedFormId === form.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Questions Preview */}
              {selectedForm && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="font-semibold mb-4">Questions: {selectedForm.name}</h3>
                  <div className="space-y-3">
                    {selectedForm.questions.map((question, index) => (
                      <div
                        key={question.id || index}
                        className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded bg-indigo-100 text-indigo-600 text-sm font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{question.question}</span>
                            {question.required && (
                              <Badge variant="outline" className="text-red-600 border-red-200">Required</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {questionTypeLabels[question.type] || question.type}
                            {question.description && ` • ${question.description}`}
                          </div>
                          {normalizeQuestionOptions(question.options) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Options: {normalizeQuestionOptions(question.options)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedForm.questions.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        No questions yet. Edit the form to add questions.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
