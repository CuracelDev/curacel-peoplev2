'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  Plus,
  Search,
  Sparkles,
  Trash2,
  Loader2,
  X,
  Check,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface EditQuestionsTabProps {
  token: string
  myQuestions: Array<{
    id: string
    text: string
    category: string
    isRequired: boolean
    isCustom: boolean
  }>
  isLocked: boolean
  onQuestionsUpdated: () => void
}

const categoryOptions = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'situational', label: 'Situational' },
  { value: 'motivational', label: 'Motivational' },
  { value: 'culture', label: 'Culture' },
  { value: 'general', label: 'General' },
]

export function EditQuestionsTab({
  token,
  myQuestions,
  isLocked,
  onQuestionsUpdated,
}: EditQuestionsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')
  const [customCategory, setCustomCategory] = useState('general')
  const [aiPrompt, setAiPrompt] = useState('')
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{ text: string; category: string }>>([])

  // Get question bank
  const { data: questionBank, isLoading: loadingBank } = trpc.interview.getQuestionBankForToken.useQuery(
    { token, search: searchQuery, category: selectedCategory || undefined, limit: 20 },
    { enabled: !!token && !isLocked }
  )

  // Add question mutation
  const addQuestionMutation = trpc.interview.addInterviewerQuestion.useMutation({
    onSuccess: () => {
      toast.success('Question added')
      onQuestionsUpdated()
      setShowAddCustom(false)
      setCustomQuestion('')
    },
    onError: (error) => {
      toast.error('Failed to add question', { description: error.message })
    },
  })

  // Remove question mutation
  const removeQuestionMutation = trpc.interview.removeInterviewerQuestion.useMutation({
    onSuccess: () => {
      toast.success('Question removed')
      onQuestionsUpdated()
    },
    onError: (error) => {
      toast.error('Failed to remove question', { description: error.message })
    },
  })

  const handleAddFromBank = (questionId: string) => {
    addQuestionMutation.mutate({ token, questionId })
  }

  const handleAddCustom = () => {
    if (!customQuestion.trim()) {
      toast.error('Please enter a question')
      return
    }
    addQuestionMutation.mutate({
      token,
      customQuestion: {
        text: customQuestion,
        category: customCategory,
      },
    })
  }

  const handleRemoveQuestion = (assignedQuestionId: string) => {
    removeQuestionMutation.mutate({ token, assignedQuestionId })
  }

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what you want to assess')
      return
    }

    // For now, generate mock questions - this would call an AI API
    // In a real implementation, this would call the Claude API
    const mockQuestions = [
      { text: `Tell me about your experience with ${aiPrompt}`, category: 'behavioral' },
      { text: `How would you approach a challenge related to ${aiPrompt}?`, category: 'situational' },
      { text: `What's your process for learning new aspects of ${aiPrompt}?`, category: 'technical' },
    ]
    setGeneratedQuestions(mockQuestions)
    toast.success('Generated 3 questions')
  }

  const handleAddGeneratedQuestion = (question: { text: string; category: string }) => {
    addQuestionMutation.mutate({
      token,
      customQuestion: {
        text: question.text,
        category: question.category,
      },
    })
    setGeneratedQuestions(prev => prev.filter(q => q.text !== question.text))
  }

  if (isLocked) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Editing Period Ended</h3>
        <p className="text-muted-foreground">
          You can no longer edit questions after the feedback period has ended.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Questions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Your Current Questions ({myQuestions.length})</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddCustom(true)}
              disabled={showAddCustom}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Custom
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {myQuestions.length === 0 && !showAddCustom && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No questions assigned yet. Add from the question bank below or create a custom question.
            </p>
          )}

          {myQuestions.map((question) => (
            <div
              key={question.id}
              className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      question.category === 'technical' && 'border-pink-300 bg-pink-50 text-pink-700',
                      question.category === 'behavioral' && 'border-green-300 bg-green-50 text-green-700',
                      question.category === 'situational' && 'border-indigo-300 bg-indigo-50 text-indigo-700',
                      question.category === 'motivational' && 'border-amber-300 bg-amber-50 text-amber-700',
                      question.category === 'culture' && 'border-cyan-300 bg-cyan-50 text-cyan-700'
                    )}
                  >
                    {question.category}
                  </Badge>
                  {question.isCustom && (
                    <Badge variant="outline" className="text-xs">Custom</Badge>
                  )}
                </div>
                <p className="text-sm">{question.text}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleRemoveQuestion(question.id)}
                disabled={removeQuestionMutation.isPending}
              >
                {removeQuestionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}

          {/* Add Custom Question Form */}
          {showAddCustom && (
            <div className="p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Question</Label>
                  <Textarea
                    placeholder="Enter your custom question..."
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Category</Label>
                  <Select value={customCategory} onValueChange={setCustomCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddCustom}
                    disabled={addQuestionMutation.isPending}
                  >
                    {addQuestionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowAddCustom(false)
                      setCustomQuestion('')
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Bank */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add from Question Bank</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingBank ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : questionBank?.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No questions found. Try a different search or category.
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {questionBank?.questions.map((question) => {
                const isAlreadyAdded = myQuestions.some(q => q.text === question.text)
                return (
                  <div
                    key={question.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border',
                      isAlreadyAdded ? 'bg-muted/50 opacity-60' : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            question.category === 'technical' && 'border-pink-300 bg-pink-50 text-pink-700',
                            question.category === 'behavioral' && 'border-green-300 bg-green-50 text-green-700',
                            question.category === 'situational' && 'border-indigo-300 bg-indigo-50 text-indigo-700',
                            question.category === 'motivational' && 'border-amber-300 bg-amber-50 text-amber-700',
                            question.category === 'culture' && 'border-cyan-300 bg-cyan-50 text-cyan-700'
                          )}
                        >
                          {question.category}
                        </Badge>
                      </div>
                      <p className="text-sm">{question.text}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={isAlreadyAdded ? 'ghost' : 'outline'}
                      onClick={() => !isAlreadyAdded && handleAddFromBank(question.id)}
                      disabled={isAlreadyAdded || addQuestionMutation.isPending}
                    >
                      {isAlreadyAdded ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Question Generator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Generate with AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">What would you like to assess?</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="e.g., problem-solving skills, leadership experience, technical depth..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <Button onClick={handleGenerateAI} disabled={!aiPrompt.trim()}>
                <Sparkles className="h-4 w-4 mr-1" />
                Generate
              </Button>
            </div>
          </div>

          {generatedQuestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Generated Questions</Label>
              {generatedQuestions.map((question, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50"
                >
                  <div className="flex-1">
                    <Badge variant="outline" className="text-xs mb-1">
                      {question.category}
                    </Badge>
                    <p className="text-sm">{question.text}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddGeneratedQuestion(question)}
                    disabled={addQuestionMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
