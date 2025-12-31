'use client'

import { useEffect, useMemo, useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useHiringFlows } from '@/lib/recruiting/hiring-flows'

const categories = [
  {
    id: 'situational',
    name: 'Situational',
    description: '"What would you do if..."',
    icon: Box,
    color: 'bg-indigo-50 text-indigo-600',
    badgeColor: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'behavioral',
    name: 'Behavioral',
    description: '"Tell me about a time..."',
    icon: Clock,
    color: 'bg-green-50 text-green-600',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    id: 'motivational',
    name: 'Motivational',
    description: '"Why do you want..."',
    icon: Heart,
    color: 'bg-amber-50 text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Role-specific questions',
    icon: Code,
    color: 'bg-pink-50 text-pink-600',
    badgeColor: 'bg-pink-100 text-pink-700',
  },
  {
    id: 'culture',
    name: 'Culture/Values',
    description: 'PRESS alignment',
    icon: Users,
    color: 'bg-cyan-50 text-cyan-600',
    badgeColor: 'bg-cyan-100 text-cyan-700',
  },
]

const sampleQuestions = {
  situational: [
    {
      id: 1,
      text: "Imagine you're leading a critical migration of our claims processing system from a monolith to microservices, and halfway through, the team discovers a fundamental data consistency issue that wasn't caught in planning. How would you handle this situation?",
      followUp: 'How would you communicate this to stakeholders?',
      tags: ['Problem Solving', 'Leadership', 'Communication'],
      favorited: true,
    },
    {
      id: 2,
      text: 'You\'re tasked with reducing our API response time by 50% for a major insurance partner integration. The current architecture uses synchronous database calls. What approach would you take, and how would you validate your solution?',
      followUp: 'What metrics would you monitor post-deployment?',
      tags: ['System Design', 'Performance'],
      favorited: false,
    },
    {
      id: 3,
      text: 'Based on your experience at Paystack, how would you approach building a real-time fraud detection system for insurance claims? What architecture patterns would you consider?',
      followUp: 'How did your payment reconciliation work translate to this problem?',
      tags: ['Domain Experience', 'Personalized'],
      favorited: false,
    },
  ],
  behavioral: [
    {
      id: 1,
      text: 'Tell me about a time when you had to make a significant technical decision with incomplete information. What was your approach, and what was the outcome?',
      followUp: 'What would you do differently now?',
      tags: ['Must Validate', 'Decision Making'],
      favorited: true,
    },
    {
      id: 2,
      text: 'Describe a situation where you had to work in a smaller, fast-paced team compared to your previous roles. How did you adapt?',
      followUp: 'What challenges did you face with fewer resources?',
      tags: ['Must Validate', 'Startup Fit'],
      favorited: false,
    },
    {
      id: 3,
      text: 'You mentioned leading a team of 4 engineers on the Kafka project at Paystack. Tell me about a time when a team member was underperforming. How did you handle it?',
      followUp: 'What was the outcome for the individual and the project?',
      tags: ['Leadership', 'Personalized'],
      favorited: false,
    },
  ],
  technical: [
    {
      id: 1,
      text: 'You mentioned using the saga pattern with compensating transactions. Can you walk me through how you would implement this for a multi-step insurance claim approval workflow?',
      followUp: 'How would you handle partial failures?',
      tags: ['Distributed Systems', 'Deep Dive'],
      favorited: false,
    },
    {
      id: 2,
      text: 'How would you design an idempotency mechanism for a claims processing API that needs to handle duplicate submissions gracefully?',
      followUp: 'What storage strategy would you use for idempotency keys?',
      tags: ['API Design', 'Reliability'],
      favorited: false,
    },
  ],
}

export default function QuestionsPage() {
  const [selectedJob, setSelectedJob] = useState('backend')
  const [selectedCandidate, setSelectedCandidate] = useState('james')
  const [selectedStage, setSelectedStage] = useState('')
  const [selectedCategories, setSelectedCategories] = useState(['situational', 'behavioral', 'technical'])
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    'situational-1': true,
    'behavioral-1': true,
  })
  const { flows } = useHiringFlows()

  const stageOptions = useMemo(() => {
    const stageSet = new Set<string>()
    flows.forEach((flow) => {
      flow.stages.forEach((stage) => stageSet.add(stage))
    })
    return Array.from(stageSet)
  }, [flows])

  useEffect(() => {
    if (!stageOptions.length) return
    if (!stageOptions.includes(selectedStage)) {
      setSelectedStage(stageOptions[0])
    }
  }, [stageOptions, selectedStage])

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    )
  }

  const toggleFavorite = (categoryId: string, questionId: number) => {
    const key = `${categoryId}-${questionId}`
    setFavorites((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="p-6">
      {/* Action Bar */}
      <div className="flex justify-end gap-3 mb-6">
        <Button variant="outline">
          <Save className="h-4 w-4 mr-2" />
          Save to Bank
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-6">
        {/* Sidebar - Configuration */}
        <div className="space-y-5">
          <Card className="sticky top-20">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Generation Settings</h3>

              {/* Job Selection */}
              <div className="mb-4">
                <Label className="mb-2 block">Job Position</Label>
                <Select value={selectedJob} onValueChange={setSelectedJob}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backend">Senior Backend Engineer</SelectItem>
                    <SelectItem value="designer">Product Designer</SelectItem>
                    <SelectItem value="growth">Growth Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Candidate Selection */}
              <div className="mb-4">
                <Label className="mb-2 block">Candidate (Optional)</Label>
                <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="james">James Okafor</SelectItem>
                    <SelectItem value="sarah">Sarah Chen</SelectItem>
                    <SelectItem value="adaeze">Adaeze Nwosu</SelectItem>
                    <SelectItem value="generic">-- Generic (no candidate) --</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Interview Stage */}
              <div className="mb-4">
                <Label className="mb-2 block">Interview Stage</Label>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Categories */}
              <div className="mb-5">
                <Label className="mb-2 block">Question Categories</Label>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 border rounded-lg transition-all text-left',
                        selectedCategories.includes(category.id)
                          ? 'border-indigo-500 bg-indigo-50/50'
                          : 'border-border hover:border-border'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
                        selectedCategories.includes(category.id)
                          ? 'bg-indigo-600 text-white'
                          : 'border-2 border-border'
                      )}>
                        {selectedCategories.includes(category.id) && <Check className="h-3 w-3" />}
                      </div>
                      <div className={cn('w-8 h-8 rounded flex items-center justify-center', category.color)}>
                        <category.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{category.name}</div>
                        <div className="text-xs text-muted-foreground">{category.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                <Zap className="h-4 w-4 mr-2" />
                Generate Questions
              </Button>

              {/* Context Preview */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Context Used</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Job Description</span>
                    <span className="font-medium">Loaded</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Candidate CV</span>
                    <span className="font-medium">Loaded</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Previous Stages</span>
                    <span className="font-medium">4 analyzed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Must Validate</span>
                    <span className="font-medium">3 points</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Generated Questions */}
        <div className="space-y-5">
          {/* Situational Questions */}
          {selectedCategories.includes('situational') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
                <div className="flex items-center gap-2">
                  <Badge className={categories.find((c) => c.id === 'situational')?.badgeColor}>
                    Situational
                  </Badge>
                  <span className="font-semibold text-sm">5 questions</span>
                </div>
                <Button variant="ghost" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                {sampleQuestions.situational.map((question) => (
                  <div
                    key={question.id}
                    className="flex gap-4 p-4 border border-border rounded-xl hover:border-border hover:shadow-sm transition-all"
                  >
                    <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center font-semibold text-sm text-foreground/80 flex-shrink-0">
                      {question.id}
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] text-foreground mb-2 leading-relaxed">{question.text}</p>
                      <p className="text-sm text-muted-foreground italic">{question.followUp}</p>
                      <div className="flex gap-2 mt-2">
                        {question.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => toggleFavorite('situational', question.id)}
                        className={cn(
                          'w-8 h-8 rounded border flex items-center justify-center transition-all',
                          favorites[`situational-${question.id}`]
                            ? 'bg-amber-50 border-amber-300 text-amber-500'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <Star className={cn('h-4 w-4', favorites[`situational-${question.id}`] && 'fill-current')} />
                      </button>
                      <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Behavioral Questions */}
          {selectedCategories.includes('behavioral') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
                <div className="flex items-center gap-2">
                  <Badge className={categories.find((c) => c.id === 'behavioral')?.badgeColor}>
                    Behavioral
                  </Badge>
                  <span className="font-semibold text-sm">5 questions</span>
                </div>
                <Button variant="ghost" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                {sampleQuestions.behavioral.map((question) => (
                  <div
                    key={question.id}
                    className="flex gap-4 p-4 border border-border rounded-xl hover:border-border hover:shadow-sm transition-all"
                  >
                    <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center font-semibold text-sm text-foreground/80 flex-shrink-0">
                      {question.id}
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] text-foreground mb-2 leading-relaxed">{question.text}</p>
                      <p className="text-sm text-muted-foreground italic">{question.followUp}</p>
                      <div className="flex gap-2 mt-2">
                        {question.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => toggleFavorite('behavioral', question.id)}
                        className={cn(
                          'w-8 h-8 rounded border flex items-center justify-center transition-all',
                          favorites[`behavioral-${question.id}`]
                            ? 'bg-amber-50 border-amber-300 text-amber-500'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <Star className={cn('h-4 w-4', favorites[`behavioral-${question.id}`] && 'fill-current')} />
                      </button>
                      <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Technical Questions */}
          {selectedCategories.includes('technical') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
                <div className="flex items-center gap-2">
                  <Badge className={categories.find((c) => c.id === 'technical')?.badgeColor}>
                    Technical
                  </Badge>
                  <span className="font-semibold text-sm">5 questions</span>
                </div>
                <Button variant="ghost" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                {sampleQuestions.technical.map((question) => (
                  <div
                    key={question.id}
                    className="flex gap-4 p-4 border border-border rounded-xl hover:border-border hover:shadow-sm transition-all"
                  >
                    <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center font-semibold text-sm text-foreground/80 flex-shrink-0">
                      {question.id}
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] text-foreground mb-2 leading-relaxed">{question.text}</p>
                      <p className="text-sm text-muted-foreground italic">{question.followUp}</p>
                      <div className="flex gap-2 mt-2">
                        {question.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => toggleFavorite('technical', question.id)}
                        className={cn(
                          'w-8 h-8 rounded border flex items-center justify-center transition-all',
                          favorites[`technical-${question.id}`]
                            ? 'bg-amber-50 border-amber-300 text-amber-500'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <Star className={cn('h-4 w-4', favorites[`technical-${question.id}`] && 'fill-current')} />
                      </button>
                      <button className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
