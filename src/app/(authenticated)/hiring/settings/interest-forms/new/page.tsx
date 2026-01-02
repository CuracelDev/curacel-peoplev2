'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, GripVertical, X, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc-client'

type Question = {
  label: string
  type: string
  placeholder?: string
  helpText?: string
  isRequired: boolean
  options?: string
}

const questionTypes = [
  { value: 'TEXT', label: 'Short Text', description: 'Single line text input' },
  { value: 'TEXTAREA', label: 'Long Text', description: 'Multi-line text area' },
  { value: 'EMAIL', label: 'Email', description: 'Email address input' },
  { value: 'PHONE', label: 'Phone', description: 'Phone number input' },
  { value: 'URL', label: 'URL', description: 'Website link input' },
  { value: 'SELECT', label: 'Dropdown', description: 'Single selection dropdown' },
  { value: 'MULTISELECT', label: 'Multi-Select', description: 'Multiple selection dropdown' },
  { value: 'RADIO', label: 'Radio Buttons', description: 'Single choice radio buttons' },
  { value: 'CHECKBOX', label: 'Checkbox', description: 'Multiple choice checkboxes' },
  { value: 'DATE', label: 'Date', description: 'Date picker' },
  { value: 'SCALE', label: 'Rating Scale', description: 'Numeric rating scale' },
  { value: 'FILE', label: 'File Upload', description: 'Document or file upload' },
]

export default function NewInterestFormPage() {
  const router = useRouter()

  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [formQuestions, setFormQuestions] = useState<Question[]>([])

  const createFormMutation = trpc.interestForm.create.useMutation({
    onSuccess: () => {
      toast.success('Interest form created successfully')
      router.push('/hiring/settings/interest-forms')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create form')
    },
  })

  const addQuestion = () => {
    setFormQuestions([
      ...formQuestions,
      { label: '', type: 'TEXT', isRequired: false },
    ])
  }

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setFormQuestions(
      formQuestions.map((q, i) => (i === index ? { ...q, ...updates } : q))
    )
  }

  const removeQuestion = (index: number) => {
    setFormQuestions(formQuestions.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!formName) {
      toast.error('Please provide a form name')
      return
    }

    createFormMutation.mutate({
      name: formName,
      description: formDescription || undefined,
      isDefault: formIsDefault,
      questions: formQuestions.filter(q => q.label).map((q) => ({
        label: q.label,
        type: q.type as 'TEXT' | 'EMAIL' | 'PHONE' | 'URL' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT' | 'RADIO' | 'CHECKBOX' | 'DATE' | 'FILE' | 'SCALE',
        placeholder: q.placeholder || undefined,
        helpText: q.helpText || undefined,
        isRequired: q.isRequired,
        options: q.options || undefined,
      })),
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/hiring/settings/interest-forms">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Create Interest Form</h1>
          <p className="text-muted-foreground">Build a custom application form for candidates</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/hiring/settings/interest-forms">Cancel</Link>
        </Button>
        <Button
          onClick={handleSave}
          disabled={!formName || createFormMutation.isPending}
        >
          {createFormMutation.isPending ? 'Creating...' : 'Create Form'}
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-emerald-600" />
            Basic Information
          </CardTitle>
          <CardDescription>Provide details about this form</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Form Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Engineering Application Form"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Switch checked={formIsDefault} onCheckedChange={setFormIsDefault} />
            <div>
              <Label className="font-medium">Set as default form</Label>
              <p className="text-sm text-muted-foreground">This form will be used for all new job postings by default</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Questions</CardTitle>
              <CardDescription>Build your form by adding questions candidates will answer</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formQuestions.map((q, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <div className="flex items-center justify-center w-8 h-8 rounded bg-indigo-100 text-indigo-600 text-sm font-medium">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Question Text *</Label>
                      <Input
                        value={q.label}
                        onChange={(e) => updateQuestion(index, { label: e.target.value })}
                        placeholder="Enter your question"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Field Type</Label>
                      <Select value={q.type} onValueChange={(v) => updateQuestion(index, { type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {questionTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <div>
                                <div>{t.label}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Placeholder Text</Label>
                      <Input
                        value={q.placeholder || ''}
                        onChange={(e) => updateQuestion(index, { placeholder: e.target.value })}
                        placeholder="Placeholder text (optional)"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch
                        checked={q.isRequired}
                        onCheckedChange={(v) => updateQuestion(index, { isRequired: v })}
                      />
                      <Label className="text-sm">Required</Label>
                    </div>
                  </div>
                  {['SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX'].includes(q.type) && (
                    <div className="space-y-2">
                      <Label className="text-xs">Options (comma-separated)</Label>
                      <Input
                        value={q.options || ''}
                        onChange={(e) => updateQuestion(index, { options: e.target.value })}
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQuestion(index)}
                  className="text-muted-foreground hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {formQuestions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                <FileQuestion className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">No questions yet</p>
                <p className="text-sm mt-1">Click &quot;Add Question&quot; to start building your form.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Summary */}
      {formQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Form Summary</CardTitle>
            <CardDescription>Overview of your form configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{formQuestions.length}</div>
                <div className="text-sm text-muted-foreground">Total Questions</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{formQuestions.filter(q => q.isRequired).length}</div>
                <div className="text-sm text-muted-foreground">Required</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-success">{formQuestions.filter(q => !q.isRequired).length}</div>
                <div className="text-sm text-muted-foreground">Optional</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
