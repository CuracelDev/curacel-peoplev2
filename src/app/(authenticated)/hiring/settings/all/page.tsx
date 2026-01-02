'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Save,
  Star,
  Users,
  Plus,
  Eye,
  Trash2,
  RotateCcw,
  FileQuestion,
  ClipboardCheck,
  GripVertical,
  Link2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Edit2,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Webhook,
  UserCircle2,
  Globe,
  Copy,
  ExternalLink,
  RefreshCw,
  Building2,
  Layers,
  Video,
  Loader2,
  Brain,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import { trpc } from '@/lib/trpc-client'
import { normalizeCandidateScoreWeights, type CandidateScoreComponent } from '@/lib/hiring/score-config'

const stageOptions = [
  { value: 'HR_SCREEN', label: 'HR Screen' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'PANEL', label: 'Panel' },
  { value: 'CASE_STUDY', label: 'Case Study' },
  { value: 'CULTURE_FIT', label: 'Culture Fit' },
  { value: 'FINAL', label: 'Final' },
  { value: 'OTHER', label: 'Other' },
]

const questionTypes = [
  { value: 'TEXT', label: 'Short Text' },
  { value: 'TEXTAREA', label: 'Long Text' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'URL', label: 'URL' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'MULTISELECT', label: 'Multi-Select' },
  { value: 'RADIO', label: 'Radio Buttons' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'DATE', label: 'Date' },
  { value: 'SCALE', label: 'Rating Scale' },
]

const scoreScaleLabels: Record<number, string> = {
  1: 'Poor - No evidence',
  2: 'Below Average - Limited evidence',
  3: 'Average - Meets expectations',
  4: 'Above Average - Exceeds expectations',
  5: 'Excellent - Strong evidence',
}

type Question = {
  id?: string
  label: string
  type: string
  placeholder?: string
  helpText?: string
  isRequired: boolean
  options?: string
}

type Criteria = {
  id?: string
  name: string
  description?: string
  weight: number
}

const sectionMap: Record<string, string> = {
  // Pipeline & Interviews
  interview: 'interview',
  flows: 'interview',
  interviewTypes: 'interviewTypes',
  rubrics: 'rubrics',
  // Forms & Questions
  interestForms: 'interestForms',
  forms: 'interestForms',
  questions: 'questions',
  // Evaluation Criteria
  competencies: 'competencies',
  decisionSupport: 'decision-support',
  'decision-support': 'decision-support',
  personality: 'personality',
  team: 'team',
  scoring: 'scoring',
  // Integrations
  webhooks: 'webhooks',
  recruiters: 'recruiters',
  sources: 'sources',
  // Public
  careers: 'careers',
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState('competencies')
  const [selectedDepartment, setSelectedDepartment] = useState('engineering')
  const [oceanProfile, setOceanProfile] = useState({
    openness: 75,
    conscientiousness: 85,
    extraversion: 50,
    agreeableness: 70,
    neuroticism: 30,
  })
  const [scoreComponents, setScoreComponents] = useState<CandidateScoreComponent[]>([])
  // Hiring flow state - now using tRPC instead of localStorage
  const hiringFlowsQuery = trpc.hiringFlow.list.useQuery()
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null)
  const [editedFlow, setEditedFlow] = useState<{
    name: string
    description: string
    stages: string[]
  } | null>(null)
  const [flowSaved, setFlowSaved] = useState(false)
  const [showFlowMappingDialog, setShowFlowMappingDialog] = useState(false)
  const [stageMapping, setStageMapping] = useState<Record<string, string | null>>({})
  const [originalStages, setOriginalStages] = useState<string[]>([])

  const updateFlowMutation = trpc.hiringFlow.update.useMutation({
    onSuccess: () => {
      hiringFlowsQuery.refetch()
      setFlowSaved(true)
      setEditedFlow(null)
      setShowFlowMappingDialog(false)
      setTimeout(() => setFlowSaved(false), 2000)
    },
  })

  const createFlowMutation = trpc.hiringFlow.create.useMutation({
    onSuccess: (data) => {
      hiringFlowsQuery.refetch()
      setActiveFlowId(data.id)
    },
  })

  // Interest form state
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingFormId, setEditingFormId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formQuestions, setFormQuestions] = useState<Question[]>([])

  // Rubric state
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null)
  const [rubricDialogOpen, setRubricDialogOpen] = useState(false)
  const [editingRubricId, setEditingRubricId] = useState<string | null>(null)
  const [rubricName, setRubricName] = useState('')
  const [rubricDescription, setRubricDescription] = useState('')
  const [rubricStage, setRubricStage] = useState('HR_SCREEN')
  const [rubricCriteria, setRubricCriteria] = useState<Criteria[]>([])
  const [expandedCriteria, setExpandedCriteria] = useState<string | null>(null)

  // Recruiter state
  const [recruiterDialogOpen, setRecruiterDialogOpen] = useState(false)
  const [recruiterName, setRecruiterName] = useState('')
  const [recruiterEmail, setRecruiterEmail] = useState('')
  const [recruiterOrg, setRecruiterOrg] = useState('')

  // API queries
  const interestFormsQuery = trpc.interestForm.list.useQuery()
  const rubricTemplatesQuery = trpc.interviewStage.listTemplates.useQuery()
  const competenciesQuery = trpc.competency.list.useQuery()

  // New recruiting settings queries
  const recruitingSettingsQuery = trpc.hiringSettings.get.useQuery()
  const recruitersQuery = trpc.recruiter.list.useQuery()
  const jobWebhooksQuery = trpc.hiringSettings.getJobWebhooks.useQuery()
  const sourceChannelsQuery = trpc.hiringSettings.getSourceChannels.useQuery()
  const publicJobsQuery = trpc.hiringSettings.getPublicJobs.useQuery()

  const resetRecruiterForm = () => {
    setRecruiterName('')
    setRecruiterEmail('')
    setRecruiterOrg('')
  }

  const handleRecruiterDialogChange = (open: boolean) => {
    setRecruiterDialogOpen(open)
    if (!open) {
      resetRecruiterForm()
    }
  }

  // API mutations
  const createFormMutation = trpc.interestForm.create.useMutation({
    onSuccess: () => {
      interestFormsQuery.refetch()
      closeFormDialog()
    },
  })
  const updateFormMutation = trpc.interestForm.update.useMutation({
    onSuccess: () => {
      interestFormsQuery.refetch()
      closeFormDialog()
    },
  })
  const deleteFormMutation = trpc.interestForm.delete.useMutation({
    onSuccess: () => {
      interestFormsQuery.refetch()
      setSelectedFormId(null)
    },
  })

  const createRubricMutation = trpc.interviewStage.createTemplate.useMutation({
    onSuccess: () => {
      rubricTemplatesQuery.refetch()
      closeRubricDialog()
    },
  })
  const updateRubricMutation = trpc.interviewStage.updateTemplate.useMutation({
    onSuccess: () => {
      rubricTemplatesQuery.refetch()
      closeRubricDialog()
    },
  })
  const deleteRubricMutation = trpc.interviewStage.deleteTemplate.useMutation({
    onSuccess: () => {
      rubricTemplatesQuery.refetch()
      setSelectedRubricId(null)
    },
  })

  const createCompetencyMutation = trpc.competency.create.useMutation({
    onSuccess: () => competenciesQuery.refetch(),
  })

  // New recruiting settings mutations
  const updateSettingsMutation = trpc.hiringSettings.update.useMutation({
    onSuccess: () => {
      recruitingSettingsQuery.refetch()
    },
  })
  const testWebhookMutation = trpc.hiringSettings.testWebhook.useMutation()
  const createRecruiterMutation = trpc.recruiter.create.useMutation({
    onSuccess: () => {
      recruitersQuery.refetch()
      handleRecruiterDialogChange(false)
    },
  })
  const updateRecruiterMutation = trpc.recruiter.update.useMutation({
    onSuccess: () => recruitersQuery.refetch(),
  })
  const toggleJobPublicMutation = trpc.hiringSettings.toggleJobPublic.useMutation({
    onSuccess: () => publicJobsQuery.refetch(),
  })
  const addRecruiterToJobMutation = trpc.recruiter.addToJob.useMutation({
    onSuccess: () => recruitersQuery.refetch(),
  })

  // Decision Support queries and mutations
  const decisionSupportJobsQuery = trpc.hiringSettings.getDecisionSupportJobs.useQuery()
  const updateJobDecisionSupportMutation = trpc.hiringSettings.updateJobDecisionSupport.useMutation({
    onSuccess: () => decisionSupportJobsQuery.refetch(),
  })

  // Decision support local state (synced from server)
  const [decisionSupportEnabled, setDecisionSupportEnabled] = useState(true)
  const [personalityProfilesEnabled, setPersonalityProfilesEnabled] = useState(true)
  const [teamProfilesEnabled, setTeamProfilesEnabled] = useState(true)

  // Handle section query parameter from URL
  useEffect(() => {
    const section = searchParams.get('section')
    if (section && sectionMap[section]) {
      setActiveSection(sectionMap[section])
    }
  }, [searchParams])

  // Set active flow when data loads
  useEffect(() => {
    const flows = hiringFlowsQuery.data ?? []
    if (!flows.length) return
    if (!activeFlowId || !flows.some((flow) => flow.id === activeFlowId)) {
      setActiveFlowId(flows[0].id)
    }
  }, [hiringFlowsQuery.data, activeFlowId])

  useEffect(() => {
    if (!recruitingSettingsQuery.data?.candidateScoreWeights) return
    setScoreComponents(
      normalizeCandidateScoreWeights(
        recruitingSettingsQuery.data.candidateScoreWeights as CandidateScoreComponent[]
      )
    )
  }, [recruitingSettingsQuery.data?.candidateScoreWeights])

  // Sync decision support settings from server
  useEffect(() => {
    const data = recruitingSettingsQuery.data
    if (!data) return
    if (typeof data.decisionSupportEnabled === 'boolean') {
      setDecisionSupportEnabled(data.decisionSupportEnabled)
    }
    if (typeof data.personalityProfilesEnabled === 'boolean') {
      setPersonalityProfilesEnabled(data.personalityProfilesEnabled)
    }
    if (typeof data.teamProfilesEnabled === 'boolean') {
      setTeamProfilesEnabled(data.teamProfilesEnabled)
    }
  }, [recruitingSettingsQuery.data])

  // Initialize edited flow when active flow changes
  useEffect(() => {
    const activeFlow = (hiringFlowsQuery.data ?? []).find((f) => f.id === activeFlowId)
    if (activeFlow && !editedFlow) {
      setEditedFlow({
        name: activeFlow.name,
        description: activeFlow.description || '',
        stages: [...activeFlow.stages],
      })
      setOriginalStages([...activeFlow.stages])
    }
  }, [activeFlowId, hiringFlowsQuery.data, editedFlow])

  const flows = hiringFlowsQuery.data ?? []
  const activeFlow = flows.find((flow) => flow.id === activeFlowId)
  const totalScoreWeight = scoreComponents.reduce(
    (sum, item) => sum + (item.enabled ? item.weight : 0),
    0
  )
  const canCreateRecruiter = recruiterName.trim().length > 0 && recruiterEmail.trim().length > 0

  const updateEditedFlow = (updates: Partial<typeof editedFlow>) => {
    if (!editedFlow) return
    setEditedFlow({ ...editedFlow, ...updates })
  }

  const updateStage = (index: number, value: string) => {
    if (!editedFlow) return
    const nextStages = editedFlow.stages.map((stage, i) =>
      i === index ? value : stage
    )
    updateEditedFlow({ stages: nextStages })
  }

  const addStage = () => {
    if (!editedFlow) return
    updateEditedFlow({ stages: [...editedFlow.stages, 'New Stage'] })
  }

  const updateScoreComponent = (id: CandidateScoreComponent['id'], updates: Partial<CandidateScoreComponent>) => {
    setScoreComponents((prev) =>
      prev.map((component) => (component.id === id ? { ...component, ...updates } : component))
    )
  }

  const handleCreateRecruiter = () => {
    if (!canCreateRecruiter || createRecruiterMutation.isPending) return
    createRecruiterMutation.mutate({
      name: recruiterName.trim(),
      email: recruiterEmail.trim(),
      organizationName: recruiterOrg.trim() || undefined,
    })
  }

  const handleSaveScoreWeights = () => {
    updateSettingsMutation.mutate({
      candidateScoreWeights: scoreComponents,
    })
  }

  const handleDecisionSupportToggle = (key: 'decisionSupportEnabled' | 'personalityProfilesEnabled' | 'teamProfilesEnabled', value: boolean) => {
    if (key === 'decisionSupportEnabled') {
      setDecisionSupportEnabled(value)
      updateSettingsMutation.mutate({ decisionSupportEnabled: value })
    } else if (key === 'personalityProfilesEnabled') {
      setPersonalityProfilesEnabled(value)
      updateSettingsMutation.mutate({ personalityProfilesEnabled: value })
    } else {
      setTeamProfilesEnabled(value)
      updateSettingsMutation.mutate({ teamProfilesEnabled: value })
    }
  }

  const removeStage = (index: number) => {
    if (!editedFlow || editedFlow.stages.length <= 1) return
    const nextStages = editedFlow.stages.filter((_, i) => i !== index)
    updateEditedFlow({ stages: nextStages })
  }

  const moveStage = (index: number, direction: 'up' | 'down') => {
    if (!editedFlow) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= editedFlow.stages.length) return
    const nextStages = [...editedFlow.stages]
    const temp = nextStages[index]
    nextStages[index] = nextStages[newIndex]
    nextStages[newIndex] = temp
    updateEditedFlow({ stages: nextStages })
  }

  const handleSaveFlows = async () => {
    if (!activeFlowId || !editedFlow) return

    // Check if stages have changed
    const stagesChanged = JSON.stringify(editedFlow.stages) !== JSON.stringify(originalStages)
    const hasJobsToMigrate = activeFlow && activeFlow.totalJobs > 0 && stagesChanged

    if (hasJobsToMigrate) {
      // Show mapping dialog
      const removedStages = originalStages.filter((s) => !editedFlow.stages.includes(s))
      const initialMapping: Record<string, string | null> = {}
      for (const stage of originalStages) {
        initialMapping[stage] = editedFlow.stages.includes(stage) ? stage : null
      }
      setStageMapping(initialMapping)
      setShowFlowMappingDialog(true)
    } else {
      // No migration needed, save directly
      updateFlowMutation.mutate({
        id: activeFlowId,
        name: editedFlow.name,
        description: editedFlow.description || null,
        stages: editedFlow.stages,
      })
    }
  }

  const handleConfirmFlowUpdate = () => {
    if (!activeFlowId || !editedFlow) return
    updateFlowMutation.mutate({
      id: activeFlowId,
      name: editedFlow.name,
      description: editedFlow.description || null,
      stages: editedFlow.stages,
      stageMapping,
    })
  }

  const handleFlowChange = (flowId: string) => {
    setActiveFlowId(flowId)
    setEditedFlow(null) // Reset edited flow so it gets reloaded
  }

  const handleResetFlow = () => {
    if (!activeFlow) return
    setEditedFlow({
      name: activeFlow.name,
      description: activeFlow.description || '',
      stages: [...activeFlow.stages],
    })
  }

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
      .join('\n')
  }

  type InterestForm = NonNullable<typeof interestFormsQuery.data>[number]

  // Form dialog helpers
  const openFormDialog = (form?: InterestForm) => {
    if (form) {
      setEditingFormId(form.id)
      setFormName(form.name)
      setFormDescription(form.description || '')
      setFormQuestions(
        form.questions.map((q) => ({
          id: q.id,
          label: q.question,
          type: q.type,
          placeholder: '',
          helpText: q.description || '',
          isRequired: q.required,
          options: normalizeQuestionOptions(q.options),
        }))
      )
    } else {
      setEditingFormId(null)
      setFormName('')
      setFormDescription('')
      setFormQuestions([])
    }
    setFormDialogOpen(true)
  }

  const closeFormDialog = () => {
    setFormDialogOpen(false)
    setEditingFormId(null)
    setFormName('')
    setFormDescription('')
    setFormQuestions([])
  }

  const addQuestion = () => {
    setFormQuestions([
      ...formQuestions,
      { label: '', type: 'TEXT', isRequired: true },
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

  const saveForm = () => {
    const data = {
      name: formName,
      description: formDescription || undefined,
      questions: formQuestions.map((q) => ({
        label: q.label,
        type: q.type as 'TEXT' | 'EMAIL' | 'PHONE' | 'URL' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT' | 'RADIO' | 'CHECKBOX' | 'DATE' | 'FILE' | 'SCALE',
        placeholder: q.placeholder || undefined,
        helpText: q.helpText || undefined,
        isRequired: q.isRequired,
        options: q.options || undefined,
      })),
    }

    if (editingFormId) {
      updateFormMutation.mutate({ id: editingFormId, ...data })
    } else {
      createFormMutation.mutate(data)
    }
  }

  // Rubric dialog helpers
  type RubricTemplate = NonNullable<typeof rubricTemplatesQuery.data>[number]

  const openRubricDialog = (rubric?: RubricTemplate) => {
    if (rubric) {
      setEditingRubricId(rubric.id)
      setRubricName(rubric.name)
      setRubricDescription(rubric.description || '')
      setRubricStage(rubric.stage)
      setRubricCriteria(
        rubric.criteria.map((c: { id: string; name: string; description?: string | null; weight: number }) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          weight: c.weight,
        }))
      )
    } else {
      setEditingRubricId(null)
      setRubricName('')
      setRubricDescription('')
      setRubricStage('HR_SCREEN')
      setRubricCriteria([])
    }
    setRubricDialogOpen(true)
  }

  const closeRubricDialog = () => {
    setRubricDialogOpen(false)
    setEditingRubricId(null)
    setRubricName('')
    setRubricDescription('')
    setRubricStage('HR_SCREEN')
    setRubricCriteria([])
  }

  const addCriteria = () => {
    setRubricCriteria([
      ...rubricCriteria,
      { name: '', description: '', weight: 3 },
    ])
  }

  const updateCriteria = (index: number, updates: Partial<Criteria>) => {
    setRubricCriteria(
      rubricCriteria.map((c, i) => (i === index ? { ...c, ...updates } : c))
    )
  }

  const removeCriteria = (index: number) => {
    setRubricCriteria(rubricCriteria.filter((_, i) => i !== index))
  }

  const saveRubric = () => {
    const data = {
      name: rubricName,
      description: rubricDescription || undefined,
      stage: rubricStage as 'HR_SCREEN' | 'TECHNICAL' | 'PANEL' | 'CASE_STUDY' | 'CULTURE_FIT' | 'FINAL' | 'OTHER',
      criteria: rubricCriteria.map((c) => ({
        name: c.name,
        description: c.description || undefined,
        weight: c.weight,
      })),
    }

    if (editingRubricId) {
      updateRubricMutation.mutate({ id: editingRubricId, ...data })
    } else {
      createRubricMutation.mutate(data)
    }
  }

  const interestForms = interestFormsQuery.data || []
  const rubricTemplates = rubricTemplatesQuery.data || []
  const competencies = competenciesQuery.data || []

  const selectedForm = interestForms.find((f) => f.id === selectedFormId)
  const selectedRubric = rubricTemplates.find((r) => r.id === selectedRubricId)

  return (
    <div className="space-y-6">
      {/* Settings Content */}
      <div className="space-y-6">
          {/* Competency Framework */}
          {activeSection === 'competencies' && (
            <Card id="competencies">
              <CardHeader className="p-5 border-b">
                <h2 className="text-lg font-semibold">Competency Framework</h2>
                <p className="text-sm text-muted-foreground">Define the competencies expected of all hires. Role-specific competencies are set per job.</p>
              </CardHeader>
              <CardContent className="p-5">
                {competenciesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {competencies.map((competency) => (
                        <div key={competency.id} className="p-4 border border-border rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold">{competency.name}</div>
                            <Badge variant="secondary">{competency.category}</Badge>
                          </div>
                          <div className="text-sm text-foreground/80">{competency.description}</div>
                        </div>
                      ))}
                    </div>
                    {competencies.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">
                        No competencies defined yet. Add your first competency.
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        const name = prompt('Competency name:')
                        if (!name) return
                        const description = prompt('Description:')
                        const category = prompt('Category (e.g., Technical, Leadership):') || 'General'
                        createCompetencyMutation.mutate({ name, description: description || undefined, category })
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Competency
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* AuntyPelz Decision Support */}
          {activeSection === 'decision-support' && (
            <>
            <div className="flex items-center gap-4 mb-6">
              <Link href="/settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AuntyPelz Decision Support</h1>
                <p className="text-sm text-foreground/80">
                  Configure personality templates and team profile guidance for hiring insights.
                </p>
              </div>
            </div>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">Enable decision support</div>
                      <p className="text-sm text-muted-foreground">Master switch for personality and team profile insights.</p>
                    </div>
                    <Switch checked={decisionSupportEnabled} onCheckedChange={(value) => handleDecisionSupportToggle('decisionSupportEnabled', value)} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">Personality profiles</div>
                      <p className="text-sm text-muted-foreground">Use OCEAN/MBTI templates for fit analysis.</p>
                    </div>
                    <Switch checked={personalityProfilesEnabled} onCheckedChange={(value) => handleDecisionSupportToggle('personalityProfilesEnabled', value)} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">Team profiles</div>
                      <p className="text-sm text-muted-foreground">Include team-specific preferences in recommendations.</p>
                    </div>
                    <Switch checked={teamProfilesEnabled} onCheckedChange={(value) => handleDecisionSupportToggle('teamProfilesEnabled', value)} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Per-job overrides</div>
                  <div className="rounded-xl border border-border divide-y">
                    {(decisionSupportJobsQuery.data || []).map((job) => (
                      <div key={job.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{job.title}</div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>{job.department || 'Unassigned'}</span>
                            <Badge variant="secondary">{job.status}</Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Decision</span>
                            <Switch
                              checked={job.decisionSupportEnabled}
                              onCheckedChange={(value) => updateJobDecisionSupportMutation.mutate({ jobId: job.id, decisionSupportEnabled: value })}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Personality</span>
                            <Switch
                              checked={job.personalityProfilesEnabled}
                              onCheckedChange={(value) => updateJobDecisionSupportMutation.mutate({ jobId: job.id, personalityProfilesEnabled: value })}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Team</span>
                            <Switch
                              checked={job.teamProfilesEnabled}
                              onCheckedChange={(value) => updateJobDecisionSupportMutation.mutate({ jobId: job.id, teamProfilesEnabled: value })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {decisionSupportJobsQuery.data && decisionSupportJobsQuery.data.length === 0 && (
                      <div className="p-4 text-sm text-muted-foreground">No jobs available yet.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <Link
                    href="/hiring/settings/all?section=personality"
                    className="flex items-center gap-4 p-6 hover:bg-muted transition-colors"
                  >
                    <div className="bg-indigo-100 p-3 rounded-lg flex-shrink-0">
                      <Brain className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground mb-1">Personality Templates</h3>
                      <p className="text-sm text-foreground/80">
                        Define ideal OCEAN personality profiles for department fit analysis.
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </Link>
                  <Link
                    href="/hiring/settings/all?section=team"
                    className="flex items-center gap-4 p-6 hover:bg-muted transition-colors"
                  >
                    <div className="bg-indigo-100 p-3 rounded-lg flex-shrink-0">
                      <Users className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground mb-1">Team Profiles</h3>
                      <p className="text-sm text-foreground/80">
                        Configure team-specific preferences and guidance.
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </Link>
                  <Link
                    href="/hiring/settings/all?section=rubrics"
                    className="flex items-center gap-4 p-6 hover:bg-muted transition-colors"
                  >
                    <div className="bg-indigo-100 p-3 rounded-lg flex-shrink-0">
                      <ClipboardList className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground mb-1">Interview Rubrics</h3>
                      <p className="text-sm text-foreground/80">
                        Define scoring criteria for interview stages and panels.
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </Link>
                  <Link
                    href="/hiring/settings/all?section=scoring"
                    className="flex items-center gap-4 p-6 hover:bg-muted transition-colors"
                  >
                    <div className="bg-indigo-100 p-3 rounded-lg flex-shrink-0">
                      <Layers className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground mb-1">Candidate Scoring</h3>
                      <p className="text-sm text-foreground/80">
                        Weight inputs that drive overall candidate scores.
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </Link>
                </div>
              </CardContent>
            </Card>
            </>
          )}

          {/* Personality Templates */}
          {activeSection === 'personality' && (
            <Card id="personality">
              <CardHeader className="p-5 border-b">
                <h2 className="text-lg font-semibold">Personality Templates</h2>
                <p className="text-sm text-muted-foreground">Define ideal OCEAN personality profiles for different departments. Used for team fit analysis.</p>
              </CardHeader>
              <CardContent className="p-5">
                <div className="mb-4">
                  <Label className="mb-2 block">Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-6">
                  <Label className="mb-4 block">OCEAN Profile ({selectedDepartment})</Label>
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(oceanProfile).map(([key, value]) => (
                      <div key={key} className="text-center p-3 border border-border rounded-lg">
                        <div className="text-xs text-muted-foreground mb-2 capitalize">{key}</div>
                        <div className="text-lg font-semibold mb-2">{value}%</div>
                        <Slider
                          value={[value]}
                          max={100}
                          step={1}
                          onValueChange={([v]) => setOceanProfile((prev) => ({ ...prev, [key]: v }))}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <Label className="mb-2 block">Preferred MBTI Types</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">INTJ</Badge>
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">INTP</Badge>
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">ENTJ</Badge>
                    <Badge variant="secondary">ENTP</Badge>
                    <Badge variant="secondary">ISTJ</Badge>
                    <Badge variant="secondary">ISTP</Badge>
                  </div>
                </div>

                <Button className="mt-6">
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Team Profiles */}
          {activeSection === 'team' && (
            <Card id="team">
              <CardHeader className="p-5 border-b">
                <h2 className="text-lg font-semibold">Team Profiles</h2>
                <p className="text-sm text-muted-foreground">Configure team-specific settings and preferences.</p>
              </CardHeader>
              <CardContent className="p-5">
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                  <p>Team profiles are managed in the Teams settings.</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href="/settings/teams">
                      Go to Teams
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interview/Hiring Flow */}
          {activeSection === 'interview' && (
            <Card id="interview">
              <CardHeader className="p-5 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">Hiring Flow</h2>
                    <p className="text-sm text-muted-foreground">
                      Edit the interview flow for each role type. Changes apply across job setup, templates, and candidate stages.
                    </p>
                  </div>
                  <Button onClick={handleSaveFlows} disabled={updateFlowMutation.isPending} variant={flowSaved ? 'outline' : 'default'} className={flowSaved ? 'bg-success/10 text-success border-success/30' : ''}>
                    {flowSaved ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {updateFlowMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {hiringFlowsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                <div className="grid grid-cols-[220px_1fr] gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Role Flow</Label>
                      <Select value={activeFlowId ?? ''} onValueChange={handleFlowChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select flow" />
                        </SelectTrigger>
                        <SelectContent>
                          {flows.map((flow) => (
                            <SelectItem key={flow.id} value={flow.id}>
                              <div className="flex items-center gap-2">
                                <span>{flow.name}</span>
                                {flow.isDefault && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Flow stats */}
                    {activeFlow && (
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Jobs using this flow:</span>
                          <span className="font-medium">{activeFlow.totalJobs}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current version:</span>
                          <span className="font-medium">v{activeFlow.latestVersion}</span>
                        </div>
                        {activeFlow.outdatedJobs > 0 && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                            <span>⚠️</span>
                            <span>{activeFlow.outdatedJobs} job(s) on older version</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                      These stages power the flow preview in job creation and the flow selector in JD templates.
                    </div>
                    <Button variant="outline" size="sm" onClick={handleResetFlow}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Discard Changes
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Flow Name</Label>
                        <Input
                          value={editedFlow?.name ?? ''}
                          onChange={(e) => updateEditedFlow({ name: e.target.value })}
                          placeholder="e.g., Engineering"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={editedFlow?.description ?? ''}
                          onChange={(e) => updateEditedFlow({ description: e.target.value })}
                          placeholder="Short description for this flow"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Stages</Label>
                        <Button variant="outline" size="sm" onClick={addStage}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Stage
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(editedFlow?.stages ?? []).map((stage, index) => (
                          <div key={`${activeFlowId}-stage-${index}`} className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => moveStage(index, 'up')}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => moveStage(index, 'down')}
                                disabled={index === (editedFlow?.stages.length ?? 0) - 1}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-muted text-foreground/80 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                              {index + 1}
                            </div>
                            <Input
                              value={stage}
                              onChange={(e) => updateStage(index, e.target.value)}
                              placeholder="Stage name"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeStage(index)}
                              disabled={(editedFlow?.stages.length ?? 0) <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Preview</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(editedFlow?.stages ?? []).map((stage, idx) => (
                          <Badge key={`preview-${idx}-${stage}`} variant="secondary">
                            {stage}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stage Mapping Dialog */}
          <Dialog open={showFlowMappingDialog} onOpenChange={setShowFlowMappingDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Map Existing Stages</DialogTitle>
                <DialogDescription>
                  {activeFlow?.totalJobs} job(s) are using this flow. Map old stages to new stages to migrate candidates.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center text-sm font-medium text-muted-foreground">
                  <div>Old Stage</div>
                  <div></div>
                  <div>New Stage</div>
                </div>
                {originalStages.map((oldStage) => (
                  <div key={oldStage} className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                    <div className="px-3 py-2 bg-muted rounded-md text-sm">{oldStage}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={stageMapping[oldStage] ?? 'unmapped'}
                      onValueChange={(value) =>
                        setStageMapping((prev) => ({
                          ...prev,
                          [oldStage]: value === 'unmapped' ? null : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unmapped">
                          <span className="text-muted-foreground">Keep as legacy</span>
                        </SelectItem>
                        {(editedFlow?.stages ?? []).map((newStage) => (
                          <SelectItem key={newStage} value={newStage}>
                            {newStage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {editedFlow && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                    <strong>New stages added:</strong>{' '}
                    {editedFlow.stages
                      .filter((s) => !originalStages.includes(s))
                      .join(', ') || 'None'}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowFlowMappingDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmFlowUpdate} disabled={updateFlowMutation.isPending}>
                  {updateFlowMutation.isPending ? 'Saving...' : 'Save & Update Jobs'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Interest Forms */}
          {activeSection === 'interestForms' && (
            <Card id="interestForms">
              <CardHeader className="p-5 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">Interest Forms</h2>
                    <p className="text-sm text-muted-foreground">
                      Create and manage application forms that candidates fill out when applying. These forms can be linked to specific jobs.
                    </p>
                  </div>
                  <Button onClick={() => openFormDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Form
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {interestFormsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {interestForms.map((form) => (
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
                          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                            <FileQuestion className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{form.name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {form.questions.length} questions · Linked to {form._count.jobs} job{form._count.jobs !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openFormDialog(form); }}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Delete this form?')) {
                                  deleteFormMutation.mutate({ id: form.id })
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {interestForms.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">
                        <FileQuestion className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                        <p>No interest forms yet. Create your first form to start collecting candidate applications.</p>
                      </div>
                    )}

                    {/* Form Preview */}
                    {selectedForm && (
                      <div className="mt-6 border-t pt-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-semibold">Form Preview: {selectedForm.name}</h3>
                          <Button variant="outline" size="sm" onClick={() => openFormDialog(selectedForm)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Form
                          </Button>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto">
                          {selectedForm.questions.map((q, i) => (
                            <div key={q.id} className="flex items-start gap-3 bg-card p-3 rounded-lg border border-border">
                              <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-muted-foreground text-xs font-medium flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{q.question}</span>
                                  {q.required && <span className="text-red-500 text-xs">*</span>}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">{q.type}</div>
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

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Link2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-blue-900">Public Application Link</div>
                          <p className="text-sm text-blue-700 mt-1">
                            When you assign an interest form to a job, candidates can access it via the apply page.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Interview Rubrics */}
          {activeSection === 'rubrics' && (
            <Card id="rubrics">
              <CardHeader className="p-5 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">Interview Rubrics</h2>
                    <p className="text-sm text-muted-foreground">
                      Define scoring criteria for each interview stage. Evaluators use these to consistently score candidates.
                    </p>
                  </div>
                  <Button onClick={() => openRubricDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Rubric
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {rubricTemplatesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {rubricTemplates.map((rubric) => (
                        <div
                          key={rubric.id}
                          className={cn(
                            'flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all',
                            selectedRubricId === rubric.id
                              ? 'border-indigo-300 bg-indigo-50'
                              : 'border-border hover:border-border'
                          )}
                          onClick={() => setSelectedRubricId(selectedRubricId === rubric.id ? null : rubric.id)}
                        >
                          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                            <ClipboardCheck className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{rubric.name}</span>
                              <Badge variant="secondary">{rubric.stage.replace('_', ' ')}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {rubric.criteria.length} criteria
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openRubricDialog(rubric); }}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Delete this rubric?')) {
                                  deleteRubricMutation.mutate({ id: rubric.id })
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                            {selectedRubricId === rubric.id ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {rubricTemplates.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">
                        <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                        <p>No interview rubrics yet. Create your first rubric to standardize candidate evaluation.</p>
                      </div>
                    )}

                    {/* Rubric Criteria Preview */}
                    {selectedRubric && (
                      <div className="mt-6 border-t pt-6">
                        <h3 className="font-semibold mb-4">Scoring Criteria: {selectedRubric.name}</h3>
                        <div className="space-y-3">
                          {selectedRubric.criteria.map((criteria) => (
                            <div
                              key={criteria.id}
                              className="border border-border rounded-lg overflow-hidden"
                            >
                              <div
                                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted"
                                onClick={() => setExpandedCriteria(expandedCriteria === criteria.id ? null : criteria.id)}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{criteria.name}</span>
                                    <Badge variant="outline">Weight: {criteria.weight}</Badge>
                                  </div>
                                  {criteria.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{criteria.description}</p>
                                  )}
                                </div>
                                {expandedCriteria === criteria.id ? (
                                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              {expandedCriteria === criteria.id && (
                                <div className="bg-muted/50 p-4 border-t">
                                  <div className="text-sm font-medium mb-3">Scoring Scale</div>
                                  <div className="grid grid-cols-5 gap-2">
                                    {Object.entries(scoreScaleLabels).map(([score, label]) => (
                                      <div key={score} className="text-center p-2 bg-card rounded-lg border border-border">
                                        <div className={cn(
                                          'text-lg font-bold mb-1',
                                          parseInt(score) >= 4 ? 'text-success' :
                                          parseInt(score) >= 3 ? 'text-amber-600' : 'text-red-600'
                                        )}>
                                          {score}
                                        </div>
                                        <div className="text-xs text-muted-foreground leading-tight">{label}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {selectedRubric.criteria.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground">
                              No criteria yet. Edit the rubric to add scoring criteria.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-purple-900">How Rubrics Work</div>
                          <p className="text-sm text-purple-700 mt-1">
                            Each interviewer fills out a scorecard using the rubric criteria. Scores are aggregated across evaluators to provide a comprehensive view of the candidate.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Candidate Scoring */}
          {activeSection === 'scoring' && (
            <>
            <div className="flex items-center gap-4 mb-6">
              <Link href="/hiring/settings/interview">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">Candidate Scoring</h1>
                <p className="text-sm text-foreground/80">
                  Configure how the overall score is weighted across profile inputs. Missing data is excluded from the calculation.
                </p>
              </div>
              <Button onClick={handleSaveScoreWeights} disabled={updateSettingsMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Scoring'}
              </Button>
            </div>
            <Card id="scoring">
              <CardHeader className="p-5 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">Score Weights</h3>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>Enabled weight total: {totalScoreWeight}%</span>
                  <span>Weights are normalized when computing scores.</span>
                </div>
                <div className="space-y-4">
                  {scoreComponents.length > 0 ? (
                    scoreComponents.map((component) => (
                      <div key={component.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium">{component.label}</div>
                            <div className="text-xs text-muted-foreground">{component.description}</div>
                          </div>
                          <Switch
                            checked={component.enabled}
                            onCheckedChange={(value) => updateScoreComponent(component.id, { enabled: value })}
                          />
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                          <Slider
                            value={[component.weight]}
                            max={100}
                            step={1}
                            disabled={!component.enabled}
                            onValueChange={(value) => updateScoreComponent(component.id, { weight: value[0] })}
                            className="flex-1"
                          />
                          <div className="w-12 text-right text-sm font-medium">{component.weight}%</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Loading scoring settings...</div>
                  )}
                </div>
              </CardContent>
            </Card>
            </>
          )}

          {/* Interview Types Section */}
          {activeSection === 'interviewTypes' && (
            <InterviewTypesSection />
          )}

          {/* Question Bank Section */}
          {activeSection === 'questions' && (
            <QuestionBankSection />
          )}

          {/* Webhooks Section */}
          {activeSection === 'webhooks' && (
            <>
            <div className="flex items-center gap-4 mb-6">
              <Link href="/settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Webhook Integration</h1>
                <p className="text-sm text-foreground/80">
                  Configure webhooks to automatically push job data to external systems like n8n, Zapier, or your own APIs.
                </p>
              </div>
            </div>
            <Card id="webhooks">
              <CardHeader className="p-5 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">Global Webhook</h3>
                    <p className="text-sm text-muted-foreground">
                      This webhook receives events for all jobs.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                {/* Global Webhook */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input
                        placeholder="https://hooks.example.com/webhook"
                        defaultValue={recruitingSettingsQuery.data?.globalWebhookUrl || ''}
                        onChange={(e) => {
                          // Will save on blur or button click
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secret Key (optional)</Label>
                      <Input
                        placeholder="For HMAC signature verification"
                        type="password"
                        defaultValue={recruitingSettingsQuery.data?.globalWebhookSecret || ''}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (recruitingSettingsQuery.data?.globalWebhookUrl) {
                          testWebhookMutation.mutate({
                            webhookUrl: recruitingSettingsQuery.data.globalWebhookUrl,
                            webhookSecret: recruitingSettingsQuery.data.globalWebhookSecret || undefined,
                          })
                        }
                      }}
                      disabled={!recruitingSettingsQuery.data?.globalWebhookUrl || testWebhookMutation.isPending}
                    >
                      {testWebhookMutation.isPending ? 'Testing...' : 'Test Webhook'}
                    </Button>
                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </Button>
                  </div>
                </div>

                {/* Job-specific webhooks */}
                <div className="border-t pt-6 space-y-4">
                  <h3 className="font-medium">Job-Specific Webhooks</h3>
                  <p className="text-sm text-muted-foreground">Jobs with individual webhook configurations.</p>
                  {jobWebhooksQuery.isLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : (jobWebhooksQuery.data?.length || 0) === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Webhook className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
                      <p>No job-specific webhooks configured.</p>
                      <p className="text-sm">Configure webhooks on individual job pages.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {jobWebhooksQuery.data?.map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{job.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-md">{job.webhookUrl}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {job.lastWebhookAt && (
                              <span className="text-xs text-muted-foreground">
                                Last pushed: {new Date(job.lastWebhookAt).toLocaleDateString()}
                              </span>
                            )}
                            <Badge variant={job.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {job.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Webhook className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">Webhook Payload</div>
                      <p className="text-sm text-blue-700 mt-1">
                        Webhooks send JSON payloads with job details including title, description, requirements, salary, and public link.
                        Use the webhook secret to verify requests via HMAC signature in the X-Webhook-Signature header.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </>
          )}

          {/* External Recruiters Section */}
          {activeSection === 'recruiters' && (
            <>
            <div className="flex items-center gap-4 mb-6">
              <Link href="/settings/job-settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">External Recruiters</h1>
                <p className="text-sm text-foreground/80">
                  Manage external recruiters and their access to job postings. Recruiters get unique portal links.
                </p>
              </div>
              <Button onClick={() => handleRecruiterDialogChange(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Recruiter
              </Button>
            </div>
            <Card id="recruiters">
              <CardHeader className="p-5 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">All Recruiters</h3>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {recruitersQuery.isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (recruitersQuery.data?.length || 0) === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <UserCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                    <p>No external recruiters yet.</p>
                    <p className="text-sm">Add recruiters to give them portal access to submit candidates.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recruitersQuery.data?.map((recruiter) => (
                      <div key={recruiter.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-700 font-medium">
                                {recruiter.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {recruiter.name}
                                {!recruiter.isActive && (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {recruiter.email}
                                {recruiter.organizationName && ` • ${recruiter.organizationName}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm text-muted-foreground">
                              <div>{recruiter._count.candidates} candidates</div>
                              <div>{recruiter._count.jobAccess} job{recruiter._count.jobAccess !== 1 ? 's' : ''} assigned</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                updateRecruiterMutation.mutate({
                                  id: recruiter.id,
                                  isActive: !recruiter.isActive,
                                })
                              }}
                            >
                              {recruiter.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </div>
                        {recruiter.jobAccess.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs text-muted-foreground mb-2">Assigned Jobs</div>
                            <div className="flex flex-wrap gap-2">
                              {recruiter.jobAccess.map((access) => (
                                <Badge key={access.id} variant="outline" className="flex items-center gap-1">
                                  {access.job.title}
                                  <button
                                    className="ml-1 hover:text-red-500"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        `${window.location.origin}/recruiter/${access.accessToken}`
                                      )
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <UserCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-purple-900">Recruiter Portal</div>
                      <p className="text-sm text-purple-700 mt-1">
                        Each recruiter gets a unique portal link per job. They can view job details, submit candidates, and track their submissions.
                        Assign jobs to recruiters from the job edit page.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </>
          )}

          {/* Source Channels Section */}
          {activeSection === 'sources' && (
            <>
            <div className="flex items-center gap-4 mb-6">
              <Link href="/settings/job-settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Source Channels</h1>
                <p className="text-sm text-foreground/80">
                  Configure candidate source channels for tracking where candidates come from.
                </p>
              </div>
            </div>
            <Card id="sources">
              <CardHeader className="p-5 border-b">
                <h3 className="text-lg font-semibold">Channel Configuration</h3>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                {/* Inbound Channels */}
                <div className="space-y-3">
                  <h3 className="font-medium">Inbound Channels</h3>
                  <p className="text-sm text-muted-foreground">For candidates who apply directly.</p>
                  <div className="flex flex-wrap gap-2">
                    {sourceChannelsQuery.data?.inbound.map((channel) => (
                      <Badge key={channel} variant="secondary" className="py-1.5 px-3">
                        {channel === 'YC' ? 'Y Combinator' :
                         channel === 'PEOPLEOS' ? 'PeopleOS' :
                         channel === 'COMPANY_SITE' ? 'Company Website' :
                         channel}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Outbound Channels */}
                <div className="space-y-3 border-t pt-6">
                  <h3 className="font-medium">Outbound Channels</h3>
                  <p className="text-sm text-muted-foreground">For candidates sourced by your team.</p>
                  <div className="flex flex-wrap gap-2">
                    {sourceChannelsQuery.data?.outbound.map((channel) => (
                      <Badge key={channel} variant="outline" className="py-1.5 px-3">
                        {channel === 'LINKEDIN' ? 'LinkedIn' :
                         channel === 'JOB_BOARDS' ? 'Job Boards' :
                         channel === 'GITHUB' ? 'GitHub' :
                         channel === 'TWITTER' ? 'Twitter/X' :
                         channel}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Source Display Info */}
                <div className="border-t pt-6 space-y-3">
                  <h3 className="font-medium">How Sources Are Displayed</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-success/10 rounded-lg">
                      <Badge className="bg-success/10 text-success-foreground mb-2">INBOUND</Badge>
                      <p className="text-sm text-foreground/80">Shows channel name: &quot;YC&quot;, &quot;PeopleOS&quot;</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Badge className="bg-blue-100 text-blue-800 mb-2">OUTBOUND</Badge>
                      <p className="text-sm text-foreground/80">Shows channel + sourcer: &quot;LinkedIn - John D.&quot;</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Badge className="bg-purple-100 text-purple-800 mb-2">RECRUITER</Badge>
                      <p className="text-sm text-foreground/80">Shows recruiter: &quot;ABC Recruiting&quot;</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <Badge className="bg-orange-100 text-orange-800 mb-2">EXCELLER</Badge>
                      <p className="text-sm text-foreground/80">Shows employee: &quot;Exceller: Jane D.&quot;</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </>
          )}

          {/* Public Careers Section */}
          {activeSection === 'careers' && (
            <>
            <div className="flex items-center gap-4 mb-6">
              <Link href="/settings/job-settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Public Careers Page</h1>
                <p className="text-sm text-foreground/80">
                  Configure your public-facing careers page and manage which jobs are publicly visible.
                </p>
              </div>
            </div>
            <Card id="careers">
              <CardHeader className="p-5 border-b">
                <h3 className="text-lg font-semibold">Page Configuration</h3>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                {/* Company Branding */}
                <div className="space-y-4">
                  <h3 className="font-medium">Company Branding</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Logo URL</Label>
                      <Input
                        placeholder="https://example.com/logo.png"
                        defaultValue={recruitingSettingsQuery.data?.companyLogoUrl || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Description</Label>
                      <Textarea
                        placeholder="Brief company description for careers page"
                        defaultValue={recruitingSettingsQuery.data?.companyDescription || ''}
                        rows={3}
                      />
                    </div>
                  </div>
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Save Branding
                  </Button>
                </div>

                {/* Public Jobs */}
                <div className="border-t pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Public Job Listings</h3>
                      <p className="text-sm text-muted-foreground">Jobs that are visible on your public careers page.</p>
                    </div>
                  </div>

                  {publicJobsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : (publicJobsQuery.data?.length || 0) === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
                      <p>No public job listings yet.</p>
                      <p className="text-sm">Toggle jobs to public from the positions page.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {publicJobsQuery.data?.map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-success" />
                            <div>
                              <div className="font-medium">{job.title}</div>
                              <div className="text-sm text-muted-foreground">{job.department || 'No department'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const url = `${window.location.origin}/careers/${job.id}`
                                navigator.clipboard.writeText(url)
                              }}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy Link
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/careers/${job.id}?preview=true`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Switch
                              checked={job.isPublic}
                              onCheckedChange={(checked) => {
                                toggleJobPublicMutation.mutate({ jobId: job.id, isPublic: checked })
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-success-foreground">Public Application Links</div>
                      <p className="text-sm text-success mt-1">
                        Public jobs get a unique URL that candidates can use to view details and apply directly.
                        Share these links on your website, social media, or job boards.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </>
          )}
        </div>

      {/* Add Recruiter Dialog */}
      <Dialog open={recruiterDialogOpen} onOpenChange={handleRecruiterDialogChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Recruiter</DialogTitle>
            <DialogDescription>
              Create an external recruiter with a portal link to submit candidates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recruiter-name">Recruiter Name *</Label>
              <Input
                id="recruiter-name"
                value={recruiterName}
                onChange={(e) => setRecruiterName(e.target.value)}
                placeholder="e.g., Ada Lovelace"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recruiter-email">Recruiter Email *</Label>
              <Input
                id="recruiter-email"
                type="email"
                value={recruiterEmail}
                onChange={(e) => setRecruiterEmail(e.target.value)}
                placeholder="recruiter@agency.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recruiter-org">Organization Name</Label>
              <Input
                id="recruiter-org"
                value={recruiterOrg}
                onChange={(e) => setRecruiterOrg(e.target.value)}
                placeholder="Optional agency or firm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleRecruiterDialogChange(false)}
              disabled={createRecruiterMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRecruiter}
              disabled={!canCreateRecruiter || createRecruiterMutation.isPending}
            >
              {createRecruiterMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Recruiter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interest Form Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFormId ? 'Edit Interest Form' : 'Create Interest Form'}</DialogTitle>
            <DialogDescription>
              {editingFormId ? 'Update this form and its questions.' : 'Create a new application form for candidates.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Questions</Label>
                <Button variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>

              <div className="space-y-3">
                {formQuestions.map((q, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-muted text-muted-foreground text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={q.label}
                          onChange={(e) => updateQuestion(index, { label: e.target.value })}
                          placeholder="Question text"
                        />
                        <Select value={q.type} onValueChange={(v) => updateQuestion(index, { type: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {questionTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-4">
                        <Input
                          value={q.placeholder || ''}
                          onChange={(e) => updateQuestion(index, { placeholder: e.target.value })}
                          placeholder="Placeholder text (optional)"
                          className="flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={q.isRequired}
                            onCheckedChange={(v) => updateQuestion(index, { isRequired: v })}
                          />
                          <Label className="text-sm">Required</Label>
                        </div>
                      </div>
                      {['SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX'].includes(q.type) && (
                        <Input
                          value={q.options || ''}
                          onChange={(e) => updateQuestion(index, { options: e.target.value })}
                          placeholder="Options (comma-separated): Option 1, Option 2, Option 3"
                        />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {formQuestions.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
                    No questions yet. Click &quot;Add Question&quot; to start building your form.
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeFormDialog}>Cancel</Button>
            <Button
              onClick={saveForm}
              disabled={!formName || createFormMutation.isPending || updateFormMutation.isPending}
            >
              {createFormMutation.isPending || updateFormMutation.isPending ? 'Saving...' : editingFormId ? 'Update Form' : 'Create Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rubric Dialog */}
      <Dialog open={rubricDialogOpen} onOpenChange={setRubricDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRubricId ? 'Edit Interview Rubric' : 'Create Interview Rubric'}</DialogTitle>
            <DialogDescription>
              {editingRubricId ? 'Update this rubric and its criteria.' : 'Create a new rubric for scoring candidates.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rubric Name *</Label>
                <Input
                  value={rubricName}
                  onChange={(e) => setRubricName(e.target.value)}
                  placeholder="e.g., Technical Assessment"
                />
              </div>
              <div className="space-y-2">
                <Label>Interview Stage *</Label>
                <Select value={rubricStage} onValueChange={setRubricStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={rubricDescription}
                onChange={(e) => setRubricDescription(e.target.value)}
                placeholder="Optional description of what this rubric evaluates"
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Scoring Criteria</Label>
                <Button variant="outline" size="sm" onClick={addCriteria}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Criteria
                </Button>
              </div>

              <div className="space-y-3">
                {rubricCriteria.map((c, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 border border-border rounded-lg">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0 cursor-grab" />
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-[1fr_100px] gap-3">
                        <Input
                          value={c.name}
                          onChange={(e) => updateCriteria(index, { name: e.target.value })}
                          placeholder="Criteria name (e.g., Problem Solving)"
                        />
                        <div className="space-y-1">
                          <Label className="text-xs">Weight (1-5)</Label>
                          <Select
                            value={c.weight.toString()}
                            onValueChange={(v) => updateCriteria(index, { weight: parseInt(v) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map((w) => (
                                <SelectItem key={w} value={w.toString()}>{w}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Textarea
                        value={c.description || ''}
                        onChange={(e) => updateCriteria(index, { description: e.target.value })}
                        placeholder="Description of what to look for"
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriteria(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {rubricCriteria.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
                    No criteria yet. Click &quot;Add Criteria&quot; to define what evaluators should score.
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeRubricDialog}>Cancel</Button>
            <Button
              onClick={saveRubric}
              disabled={!rubricName || createRubricMutation.isPending || updateRubricMutation.isPending}
            >
              {createRubricMutation.isPending || updateRubricMutation.isPending ? 'Saving...' : editingRubricId ? 'Update Rubric' : 'Create Rubric'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Interview Types Section Component
function InterviewTypesSection() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<{
    id?: string
    name: string
    slug: string
    description: string
    defaultDuration: number
    questionCategories: string[]
    allowedRoles: string[]
  } | null>(null)

  const interviewTypesQuery = trpc.interviewType.list.useQuery()
  const createTypeMutation = trpc.interviewType.create.useMutation({
    onSuccess: () => {
      interviewTypesQuery.refetch()
      setDialogOpen(false)
      setEditingType(null)
    },
  })
  const updateTypeMutation = trpc.interviewType.update.useMutation({
    onSuccess: () => {
      interviewTypesQuery.refetch()
      setDialogOpen(false)
      setEditingType(null)
    },
  })
  const deleteTypeMutation = trpc.interviewType.delete.useMutation({
    onSuccess: () => interviewTypesQuery.refetch(),
  })

  const questionCategories = [
    { value: 'situational', label: 'Situational' },
    { value: 'behavioral', label: 'Behavioral' },
    { value: 'technical', label: 'Technical' },
    { value: 'motivational', label: 'Motivational' },
    { value: 'culture', label: 'Culture Fit' },
  ]

  const handleCreate = () => {
    setEditingType({
      name: '',
      slug: '',
      description: '',
      defaultDuration: 60,
      questionCategories: ['behavioral', 'situational'],
      allowedRoles: [],
    })
    setDialogOpen(true)
  }

  const handleEdit = (type: NonNullable<typeof interviewTypesQuery.data>[number]) => {
    setEditingType({
      id: type.id,
      name: type.name,
      slug: type.slug,
      description: type.description || '',
      defaultDuration: type.defaultDuration,
      questionCategories: type.questionCategories || [],
      allowedRoles: type.allowedRoles || [],
    })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!editingType) return

    if (editingType.id) {
      updateTypeMutation.mutate({
        id: editingType.id,
        name: editingType.name,
        description: editingType.description || undefined,
        defaultDuration: editingType.defaultDuration,
        questionCategories: editingType.questionCategories,
        allowedRoles: editingType.allowedRoles,
      })
    } else {
      createTypeMutation.mutate({
        name: editingType.name,
        slug: editingType.slug || editingType.name.toLowerCase().replace(/\s+/g, '-'),
        description: editingType.description || undefined,
        defaultDuration: editingType.defaultDuration,
        questionCategories: editingType.questionCategories,
        allowedRoles: editingType.allowedRoles,
      })
    }
  }

  const toggleCategory = (category: string) => {
    if (!editingType) return
    const cats = editingType.questionCategories
    if (cats.includes(category)) {
      setEditingType({ ...editingType, questionCategories: cats.filter(c => c !== category) })
    } else {
      setEditingType({ ...editingType, questionCategories: [...cats, category] })
    }
  }

  return (
    <Card id="interviewTypes">
      <CardHeader className="p-5 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold">Interview Types</h2>
            <p className="text-sm text-muted-foreground">
              Configure interview types with default durations and question categories.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Type
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {interviewTypesQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (interviewTypesQuery.data?.length || 0) === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
            <p className="font-medium">No interview types configured</p>
            <p className="text-sm mt-1">Create interview types to categorize your interviews.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interviewTypesQuery.data?.map((type) => (
              <div key={type.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Video className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-medium">{type.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {type.defaultDuration} min • {type.questionCategories?.length || 0} categories
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{type.slug}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(type)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this interview type?')) {
                        deleteTypeMutation.mutate({ id: type.id })
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingType?.id ? 'Edit Interview Type' : 'Create Interview Type'}</DialogTitle>
            <DialogDescription>
              Configure this interview type with a name, duration, and question categories.
            </DialogDescription>
          </DialogHeader>

          {editingType && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={editingType.name}
                  onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                  placeholder="e.g., People Chat, Team Chat, Technical"
                />
              </div>

              {!editingType.id && (
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={editingType.slug}
                    onChange={(e) => setEditingType({ ...editingType, slug: e.target.value })}
                    placeholder="e.g., people-chat"
                  />
                  <p className="text-xs text-muted-foreground">Auto-generated from name if left blank</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingType.description}
                  onChange={(e) => setEditingType({ ...editingType, description: e.target.value })}
                  placeholder="Brief description of this interview type"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Default Duration (minutes)</Label>
                <Select
                  value={editingType.defaultDuration.toString()}
                  onValueChange={(v) => setEditingType({ ...editingType, defaultDuration: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Question Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {questionCategories.map((cat) => (
                    <Badge
                      key={cat.value}
                      variant={editingType.questionCategories.includes(cat.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCategory(cat.value)}
                    >
                      {editingType.questionCategories.includes(cat.value) && (
                        <Check className="h-3 w-3 mr-1" />
                      )}
                      {cat.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Select question categories for this interview type</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!editingType?.name || createTypeMutation.isPending || updateTypeMutation.isPending}
            >
              {(createTypeMutation.isPending || updateTypeMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingType?.id ? 'Update Type' : 'Create Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// Question Bank Section Component
function QuestionBankSection() {
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
    category: 'behavioral' as 'situational' | 'behavioral' | 'technical' | 'motivational' | 'culture',
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
      setCreateDialogOpen(false)
      setNewQuestion({ text: '', followUp: '', category: 'behavioral', tags: '' })
    },
  })

  const updateMutation = trpc.question.update.useMutation({
    onSuccess: () => {
      utils.question.list.invalidate()
      setEditingQuestion(null)
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
    },
  })

  const seedDefaultsMutation = trpc.question.seedDefaults.useMutation({
    onSuccess: () => {
      utils.question.list.invalidate()
      utils.question.getCategories.invalidate()
    },
  })

  const categoryConfig: Record<string, {
    name: string
    description: string
    color: string
    badgeColor: string
  }> = {
    situational: {
      name: 'Situational',
      description: '"What would you do if..."',
      color: 'bg-indigo-50 text-indigo-600',
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    behavioral: {
      name: 'Behavioral',
      description: '"Tell me about a time..."',
      color: 'bg-success/10 text-success',
      badgeColor: 'bg-success/10 text-success',
    },
    motivational: {
      name: 'Motivational',
      description: '"Why do you want..."',
      color: 'bg-amber-50 text-amber-600',
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    technical: {
      name: 'Technical',
      description: 'Role-specific questions',
      color: 'bg-pink-50 text-pink-600',
      badgeColor: 'bg-pink-100 text-pink-700',
    },
    culture: {
      name: 'Culture/Values',
      description: 'PRESS alignment',
      color: 'bg-cyan-50 text-cyan-600',
      badgeColor: 'bg-cyan-100 text-cyan-700',
    },
  }

  const categoryOrder = ['situational', 'behavioral', 'motivational', 'technical', 'culture']

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
      category: newQuestion.category,
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
    <>
    <div className="flex items-center gap-4 mb-6">
      <Link href="/hiring/settings/interview">
        <Button variant="ghost" size="icon">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </Link>
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground">Question Bank</h1>
        <p className="text-sm text-foreground/80">
          Manage reusable interview questions. Questions are automatically suggested when scheduling interviews.
        </p>
      </div>
      <Button onClick={() => setCreateDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Question
      </Button>
    </div>
    <Card id="questions">
      <CardHeader className="p-5 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">All Questions</h3>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b">
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Select value={selectedJob || 'all'} onValueChange={(v) => setSelectedJob(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-48">
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
          <Select value={selectedInterviewType || 'all'} onValueChange={(v) => setSelectedInterviewType(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-48">
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
          <Button
            variant={showFavoritesOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={cn('h-4 w-4 mr-2', showFavoritesOnly && 'fill-current')} />
            Favorites
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categoryOrder.map((catId) => {
            const category = categoryConfig[catId]
            const count = categoriesData?.find((c) => c.value === catId)?.count ?? 0
            return (
              <Badge
                key={catId}
                variant={selectedCategories.includes(catId) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleCategory(catId)}
              >
                {selectedCategories.includes(catId) && <Check className="h-3 w-3 mr-1" />}
                {category.name} ({count})
              </Badge>
            )
          })}
        </div>

        {/* Content */}
        {questionsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <div className="text-center py-10 text-muted-foreground">
            <FileQuestion className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
            <p className="font-medium">No questions in the bank</p>
            <p className="text-sm mt-1 mb-4">Add interview questions that can be reused across interviews.</p>
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
                {seedDefaultsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Seed Defaults
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {categoryOrder.map((catId) => {
              const questions = questionsByCategory[catId]
              if (!questions?.length) return null
              const category = categoryConfig[catId]

              return (
                <div key={catId} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={category.badgeColor}>{category.name}</Badge>
                    <span className="text-sm text-muted-foreground">{questions.length} questions</span>
                  </div>
                  <div className="space-y-2">
                    {questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="flex gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center font-medium text-xs text-foreground/70 flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground mb-1">{question.text}</p>
                          {question.followUp && (
                            <p className="text-xs text-muted-foreground italic mb-1">{question.followUp}</p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {question.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => toggleFavoriteMutation.mutate({ id: question.id })}
                          >
                            <Star className={cn('h-4 w-4', question.isFavorite && 'fill-amber-400 text-amber-400')} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => copyToClipboard(question.text)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() =>
                              setEditingQuestion({
                                id: question.id,
                                text: question.text,
                                followUp: question.followUp ?? '',
                                category: question.category,
                                tags: question.tags,
                              })
                            }
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                            onClick={() => {
                              if (confirm('Delete this question?')) {
                                deleteMutation.mutate({ id: question.id })
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Create Question Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Question to Bank</DialogTitle>
            <DialogDescription>
              Create a reusable interview question.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={newQuestion.category}
                onValueChange={(v) => setNewQuestion((prev) => ({ ...prev, category: v as typeof newQuestion.category }))}
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
            <div className="space-y-2">
              <Label>Question *</Label>
              <Textarea
                placeholder="Enter the interview question..."
                value={newQuestion.text}
                onChange={(e) => setNewQuestion((prev) => ({ ...prev, text: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Question (optional)</Label>
              <Input
                placeholder="What would you do differently?"
                value={newQuestion.followUp}
                onChange={(e) => setNewQuestion((prev) => ({ ...prev, followUp: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                placeholder="Leadership, Problem Solving, Communication"
                value={newQuestion.tags}
                onChange={(e) => setNewQuestion((prev) => ({ ...prev, tags: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category *</Label>
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
              <div className="space-y-2">
                <Label>Question *</Label>
                <Textarea
                  value={editingQuestion.text}
                  onChange={(e) =>
                    setEditingQuestion((prev) => prev && { ...prev, text: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Follow-up Question</Label>
                <Input
                  value={editingQuestion.followUp}
                  onChange={(e) =>
                    setEditingQuestion((prev) => prev && { ...prev, followUp: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
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
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>Cancel</Button>
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
    </Card>
    </>
  )
}
