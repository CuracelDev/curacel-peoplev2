'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  Save,
  Download,
  Zap,
  Box,
  Clock,
  Heart,
  Code,
  Users,
  Star,
  Copy,
  RefreshCw,
  Check,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const categoryConfig: Record<string, {
  name: string
  description: string
  icon: typeof Box
  color: string
  badgeColor: string
}> = {
  situational: {
    name: 'Situational',
    description: '"What would you do if..."',
    icon: Box,
    color: 'bg-indigo-50 text-indigo-600',
    badgeColor: 'bg-indigo-100 text-indigo-700',
  },
  behavioral: {
    name: 'Behavioral',
    description: '"Tell me about a time..."',
    icon: Clock,
    color: 'bg-success/10 text-success',
    badgeColor: 'bg-success/10 text-success',
  },
  motivational: {
    name: 'Motivational',
    description: '"Why do you want..."',
    icon: Heart,
    color: 'bg-amber-50 text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
  technical: {
    name: 'Technical',
    description: 'Role-specific questions',
    icon: Code,
    color: 'bg-pink-50 text-pink-600',
    badgeColor: 'bg-pink-100 text-pink-700',
  },
  culture: {
    name: 'Culture/Values',
    description: 'PRESS alignment',
    icon: Users,
    color: 'bg-cyan-50 text-cyan-600',
    badgeColor: 'bg-cyan-100 text-cyan-700',
  },
}

const categoryOrder = ['situational', 'behavioral', 'motivational', 'technical', 'culture']

type CategoryKey = keyof typeof categoryConfig

export default function QuestionsPage() {
  const [selectedJob, setSelectedJob] = useState<string>('')
  const [selectedInterviewType, setSelectedInterviewType] = useState<string>('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'situational',
    'behavioral',
    'technical',
  ])
  const [searchQuery, setSearchQuery] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<{
    id: string
    text: string
    followUp: string
    category: string
    tags: string[]
  } | null>(null)

  // New question form state
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    followUp: '',
    category: 'behavioral' as CategoryKey,
    tags: '',
  })

  // Fetch data
  const { data: jobs } = trpc.job.list.useQuery({ status: 'ACTIVE' })
  const { data: interviewTypes } = trpc.interviewType.list.useQuery()
  const { data: categoriesData } = trpc.question.getCategories.useQuery()

  // Determine category filter
  const categoryFilter = selectedCategories.length === 1
    ? (selectedCategories[0] as 'situational' | 'behavioral' | 'technical' | 'motivational' | 'culture')
    : undefined

  // Fetch questions with filters
  const {
    data: questionsData,
    isLoading: questionsLoading,
    refetch: refetchQuestions,
  } = trpc.question.list.useQuery({
    category: categoryFilter,
    jobId: selectedJob || undefined,
    interviewTypeId: selectedInterviewType || undefined,
    search: searchQuery || undefined,
    onlyFavorites: showFavoritesOnly || undefined,
    limit: 100,
  })

  // Mutations
  const utils = trpc.useUtils()

  const createMutation = trpc.question.create.useMutation({
    onSuccess: () => {
      utils.question.list.invalidate()
      utils.question.getCategories.invalidate()
      toast.success('Question added to bank')
      setCreateDialogOpen(false)
      setNewQuestion({ text: '', followUp: '', category: 'behavioral', tags: '' })
    },
    onError: (err) => {
      toast.error('Failed to create question', { description: err.message })
    },
  })

  const updateMutation = trpc.question.update.useMutation({
    onSuccess: () => {
      utils.question.list.invalidate()
      toast.success('Question updated')
      setEditingQuestion(null)
    },
    onError: (err) => {
      toast.error('Failed to update question', { description: err.message })
    },
  })

  const toggleFavoriteMutation = trpc.question.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.question.list.invalidate()
    },
  })

  const deleteMutation = trpc.question.delete.useMutation({
    onSuccess: () => {
      utils.question.list.invalidate()
      utils.question.getCategories.invalidate()
      toast.success('Question removed')
    },
    onError: (err) => {
      toast.error('Failed to delete question', { description: err.message })
    },
  })

  const seedDefaultsMutation = trpc.question.seedDefaults.useMutation({
    onSuccess: (result) => {
      utils.question.list.invalidate()
      utils.question.getCategories.invalidate()
      toast.success(result.message, { description: `${result.count} questions` })
    },
    onError: (err) => {
      toast.error('Failed to seed defaults', { description: err.message })
    },
  })

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleCreateQuestion = () => {
    if (!newQuestion.text.trim()) return

    createMutation.mutate({
      text: newQuestion.text.trim(),
      followUp: newQuestion.followUp.trim() || undefined,
      category: newQuestion.category as 'situational' | 'behavioral' | 'technical' | 'motivational' | 'culture',
      tags: newQuestion.tags.split(',').map((t) => t.trim()).filter(Boolean),
      jobId: selectedJob || undefined,
      interviewTypeId: selectedInterviewType || undefined,
    })
  }

  const handleUpdateQuestion = () => {
    if (!editingQuestion || !editingQuestion.text.trim()) return

    updateMutation.mutate({
      id: editingQuestion.id,
      text: editingQuestion.text.trim(),
      followUp: editingQuestion.followUp.trim() || undefined,
      category: editingQuestion.category as 'situational' | 'behavioral' | 'technical' | 'motivational' | 'culture',
      tags: editingQuestion.tags,
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // Group questions by category
  const questionsByCategory = questionsData?.questions.reduce((acc, q) => {
    if (!selectedCategories.includes(q.category)) return acc
    if (!acc[q.category]) acc[q.category] = []
    acc[q.category].push(q)
    return acc
  }, {} as Record<string, typeof questionsData.questions>) ?? {}

  const totalQuestions = questionsData?.total ?? 0
  const isEmpty = totalQuestions === 0 && !questionsLoading

  return (
    <div className="p-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button
            variant={showFavoritesOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={cn('h-4 w-4 mr-2', showFavoritesOnly && 'fill-current')} />
            Favorites
          </Button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-6">
        {/* Sidebar - Filters */}
        <div className="space-y-5">
          <Card className="sticky top-20">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Filters</h3>

              {/* Job Selection */}
              <div className="mb-4">
                <Label className="mb-2 block">Job Position</Label>
                <Select value={selectedJob || 'all'} onValueChange={(v) => setSelectedJob(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All jobs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All jobs</SelectItem>
                    {jobs?.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interview Type */}
              <div className="mb-4">
                <Label className="mb-2 block">Interview Type</Label>
                <Select value={selectedInterviewType || 'all'} onValueChange={(v) => setSelectedInterviewType(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {interviewTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Categories */}
              <div className="mb-5">
                <Label className="mb-2 block">Question Categories</Label>
                <div className="space-y-2">
                  {categoryOrder.map((catId) => {
                    const category = categoryConfig[catId]
                    const count = categoriesData?.find((c) => c.value === catId)?.count ?? 0
                    const Icon = category.icon
                    return (
                      <button
                        key={catId}
                        onClick={() => toggleCategory(catId)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 border rounded-lg transition-all text-left',
                          selectedCategories.includes(catId)
                            ? 'border-indigo-500 bg-indigo-50/50'
                            : 'border-border hover:border-border'
                        )}
                      >
                        <div
                          className={cn(
                            'w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
                            selectedCategories.includes(catId)
                              ? 'bg-indigo-600 text-white'
                              : 'border-2 border-border'
                          )}
                        >
                          {selectedCategories.includes(catId) && <Check className="h-3 w-3" />}
                        </div>
                        <div className={cn('w-8 h-8 rounded flex items-center justify-center', category.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{category.name}</div>
                          <div className="text-xs text-muted-foreground">{category.description}</div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {count}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                onClick={() => refetchQuestions()}
                disabled={questionsLoading}
              >
                {questionsLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {questionsLoading ? 'Loading...' : 'Refresh Questions'}
              </Button>

              {/* Stats */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                  Question Bank Stats
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Questions</span>
                    <span className="font-medium">{totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Showing</span>
                    <span className="font-medium">{questionsData?.questions.length ?? 0}</span>
                  </div>
                </div>
              </div>

              {isEmpty && (
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => seedDefaultsMutation.mutate()}
                  disabled={seedDefaultsMutation.isPending}
                >
                  {seedDefaultsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Seed Default Questions
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Questions */}
        <div className="space-y-5">
          {questionsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!questionsLoading && isEmpty && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-muted-foreground mb-4">No questions in the bank yet.</div>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Question
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => seedDefaultsMutation.mutate()}
                    disabled={seedDefaultsMutation.isPending}
                  >
                    Seed Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!questionsLoading &&
            categoryOrder.map((catId) => {
              const questions = questionsByCategory[catId]
              if (!questions?.length) return null
              const category = categoryConfig[catId]
              const Icon = category.icon

              return (
                <Card key={catId}>
                  <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
                    <div className="flex items-center gap-2">
                      <Badge className={category.badgeColor}>
                        <Icon className="h-3 w-3 mr-1" />
                        {category.name}
                      </Badge>
                      <span className="font-semibold text-sm">{questions.length} questions</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewQuestion((prev) => ({ ...prev, category: catId as CategoryKey }))
                        setCreateDialogOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 space-y-3">
                    {questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="flex gap-4 p-4 border border-border rounded-xl hover:border-border hover:shadow-sm transition-all"
                      >
                        <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center font-semibold text-sm text-foreground/80 flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-[15px] text-foreground mb-2 leading-relaxed">
                            {question.text}
                          </p>
                          {question.followUp && (
                            <p className="text-sm text-muted-foreground italic mb-2">
                              {question.followUp}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {question.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {question.job && (
                              <Badge variant="outline" className="text-xs">
                                {question.job.title}
                              </Badge>
                            )}
                            {question.interviewType && (
                              <Badge variant="outline" className="text-xs">
                                {question.interviewType.name}
                              </Badge>
                            )}
                            {question.usageCount > 0 && (
                              <Badge variant="secondary" className="text-xs text-muted-foreground">
                                Used {question.usageCount}x
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => toggleFavoriteMutation.mutate({ id: question.id })}
                            className={cn(
                              'w-8 h-8 rounded border flex items-center justify-center transition-all',
                              question.isFavorite
                                ? 'bg-amber-50 border-amber-300 text-amber-500'
                                : 'border-border text-muted-foreground hover:bg-muted'
                            )}
                          >
                            <Star className={cn('h-4 w-4', question.isFavorite && 'fill-current')} />
                          </button>
                          <button
                            onClick={() => copyToClipboard(question.text)}
                            className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setEditingQuestion({
                                id: question.id,
                                text: question.text,
                                followUp: question.followUp ?? '',
                                category: question.category,
                                tags: question.tags,
                              })
                            }
                            className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this question?')) {
                                deleteMutation.mutate({ id: question.id })
                              }
                            }}
                            className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </div>

      {/* Create Question Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Question to Bank</DialogTitle>
            <DialogDescription>
              Create a new interview question that can be reused across interviews.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={newQuestion.category}
                onValueChange={(v) => setNewQuestion((prev) => ({ ...prev, category: v as CategoryKey }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOrder.map((catId) => (
                    <SelectItem key={catId} value={catId}>
                      {categoryConfig[catId].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="text">Question *</Label>
              <Textarea
                id="text"
                placeholder="Enter the interview question..."
                value={newQuestion.text}
                onChange={(e) => setNewQuestion((prev) => ({ ...prev, text: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="followUp">Follow-up Question (optional)</Label>
              <Input
                id="followUp"
                placeholder="What would you do differently?"
                value={newQuestion.followUp}
                onChange={(e) => setNewQuestion((prev) => ({ ...prev, followUp: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="Leadership, Problem Solving, Communication"
                value={newQuestion.tags}
                onChange={(e) => setNewQuestion((prev) => ({ ...prev, tags: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateQuestion}
              disabled={!newQuestion.text.trim() || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select
                  value={editingQuestion.category}
                  onValueChange={(v) =>
                    setEditingQuestion((prev) => prev && { ...prev, category: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOrder.map((catId) => (
                      <SelectItem key={catId} value={catId}>
                        {categoryConfig[catId].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-text">Question *</Label>
                <Textarea
                  id="edit-text"
                  value={editingQuestion.text}
                  onChange={(e) =>
                    setEditingQuestion((prev) => prev && { ...prev, text: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-followUp">Follow-up Question</Label>
                <Input
                  id="edit-followUp"
                  value={editingQuestion.followUp}
                  onChange={(e) =>
                    setEditingQuestion((prev) => prev && { ...prev, followUp: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {editingQuestion.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() =>
                          setEditingQuestion((prev) =>
                            prev && { ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }
                          )
                        }
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    placeholder="Add tag..."
                    className="w-32 h-6 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value.trim()
                        if (value) {
                          setEditingQuestion((prev) =>
                            prev && { ...prev, tags: [...prev.tags, value] }
                          )
                          ;(e.target as HTMLInputElement).value = ''
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateQuestion}
              disabled={!editingQuestion?.text.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
