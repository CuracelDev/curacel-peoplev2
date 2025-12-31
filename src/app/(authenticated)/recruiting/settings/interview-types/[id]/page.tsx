'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Video, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc-client'
import { cn } from '@/lib/utils'

const questionCategories = [
  { value: 'situational', label: 'Situational', description: 'How candidates would handle hypothetical scenarios' },
  { value: 'behavioral', label: 'Behavioral', description: 'Past experiences and actions' },
  { value: 'technical', label: 'Technical', description: 'Technical skills and knowledge' },
  { value: 'motivational', label: 'Motivational', description: 'Career goals and motivations' },
  { value: 'culture', label: 'Culture Fit', description: 'Values and team compatibility' },
]

const durationOptions = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
  { value: 90, label: '90 minutes' },
  { value: 120, label: '120 minutes' },
]

export default function EditInterviewTypePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [defaultDuration, setDefaultDuration] = useState(60)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  const typeQuery = trpc.interviewType.get.useQuery({ id }, { enabled: !!id })

  const updateTypeMutation = trpc.interviewType.update.useMutation({
    onSuccess: () => {
      toast.success('Interview type updated successfully')
      router.push('/recruiting/settings/interview-types')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update interview type')
    },
  })

  // Load type data
  useEffect(() => {
    if (typeQuery.data && !isLoaded) {
      const type = typeQuery.data
      setName(type.name)
      setSlug(type.slug)
      setDescription(type.description || '')
      setDefaultDuration(type.defaultDuration)
      setSelectedCategories(type.questionCategories || [])
      setIsLoaded(true)
    }
  }, [typeQuery.data, isLoaded])

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category))
    } else {
      setSelectedCategories([...selectedCategories, category])
    }
  }

  const handleSave = () => {
    if (!name) {
      toast.error('Please provide a name')
      return
    }

    updateTypeMutation.mutate({
      id,
      name,
      description: description || undefined,
      defaultDuration,
      questionCategories: selectedCategories,
      allowedRoles: [],
    })
  }

  if (typeQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (typeQuery.error) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Failed to load interview type</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/recruiting/settings/interview-types">Back to Interview Types</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/recruiting/settings/interview-types">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Edit Interview Type</h1>
          <p className="text-muted-foreground">Update interview type configuration</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/recruiting/settings/interview-types">Cancel</Link>
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name || updateTypeMutation.isPending}
        >
          {updateTypeMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-indigo-600" />
            Basic Information
          </CardTitle>
          <CardDescription>Provide details about this interview type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., People Chat, Team Chat, Technical"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={slug}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Slug cannot be changed after creation</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this interview type and what it evaluates"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Duration */}
      <Card>
        <CardHeader>
          <CardTitle>Default Duration</CardTitle>
          <CardDescription>How long this type of interview typically takes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {durationOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDefaultDuration(option.value)}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all text-center',
                  defaultDuration === option.value
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-border hover:border-indigo-300'
                )}
              >
                <div className={cn(
                  'text-xl font-bold',
                  defaultDuration === option.value ? 'text-indigo-600' : 'text-foreground'
                )}>
                  {option.value}
                </div>
                <div className="text-xs text-muted-foreground">minutes</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Question Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Question Categories</CardTitle>
          <CardDescription>Select the types of questions used in this interview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {questionCategories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
                  selectedCategories.includes(cat.value)
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-border hover:border-indigo-300'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5',
                  selectedCategories.includes(cat.value)
                    ? 'bg-indigo-600 text-white'
                    : 'border-2 border-muted-foreground/30'
                )}>
                  {selectedCategories.includes(cat.value) && (
                    <Check className="h-3 w-3" />
                  )}
                </div>
                <div>
                  <div className={cn(
                    'font-medium',
                    selectedCategories.includes(cat.value) ? 'text-indigo-600' : 'text-foreground'
                  )}>
                    {cat.label}
                  </div>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </div>
              </button>
            ))}
          </div>
          {selectedCategories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2">Selected:</span>
              {selectedCategories.map((cat) => (
                <Badge key={cat} variant="secondary">
                  {questionCategories.find(c => c.value === cat)?.label}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
