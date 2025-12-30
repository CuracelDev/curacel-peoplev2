'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Save,
  Star,
  Smile,
  Users,
  GitBranch,
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
  Edit2,
  X,
  ArrowRight,
  Check,
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
import { useHiringFlows, type HiringFlow } from '@/lib/recruiting/hiring-flows'
import { trpc } from '@/lib/trpc-client'

const settingsNav = [
  { id: 'competencies', name: 'Competencies', icon: Star },
  { id: 'personality', name: 'Personality Templates', icon: Smile },
  { id: 'team', name: 'Team Profiles', icon: Users },
  { id: 'interview', name: 'Hiring Flow', icon: GitBranch },
  { id: 'interestForms', name: 'Interest Forms', icon: FileQuestion },
  { id: 'rubrics', name: 'Interview Rubrics', icon: ClipboardCheck },
]

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
  flows: 'interview',
  forms: 'interestForms',
  rubrics: 'rubrics',
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
  const { flows, setFlows, resetFlows, saveFlows } = useHiringFlows()
  const [activeFlowId, setActiveFlowId] = useState('standard')
  const [flowSaving, setFlowSaving] = useState(false)
  const [flowSaved, setFlowSaved] = useState(false)

  // Interest form state
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingFormId, setEditingFormId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)
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

  // API queries
  const interestFormsQuery = trpc.interestForm.list.useQuery()
  const rubricTemplatesQuery = trpc.interviewStage.listTemplates.useQuery()
  const competenciesQuery = trpc.competency.list.useQuery()

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

  // Handle section query parameter from URL
  useEffect(() => {
    const section = searchParams.get('section')
    if (section && sectionMap[section]) {
      setActiveSection(sectionMap[section])
    }
  }, [searchParams])

  useEffect(() => {
    if (!flows.length) return
    if (!flows.some((flow) => flow.id === activeFlowId)) {
      setActiveFlowId(flows[0].id)
    }
  }, [flows, activeFlowId])

  const activeFlow = flows.find((flow) => flow.id === activeFlowId) ?? flows[0]

  const updateActiveFlow = (updates: Partial<HiringFlow>) => {
    if (!activeFlow) return
    const nextFlows = flows.map((flow) =>
      flow.id === activeFlow.id ? { ...flow, ...updates } : flow
    )
    setFlows(nextFlows)
  }

  const updateStage = (index: number, value: string) => {
    if (!activeFlow) return
    const nextStages = activeFlow.stages.map((stage, i) =>
      i === index ? value : stage
    )
    updateActiveFlow({ stages: nextStages })
  }

  const addStage = () => {
    if (!activeFlow) return
    updateActiveFlow({ stages: [...activeFlow.stages, 'New Stage'] })
  }

  const removeStage = (index: number) => {
    if (!activeFlow || activeFlow.stages.length <= 1) return
    const nextStages = activeFlow.stages.filter((_, i) => i !== index)
    updateActiveFlow({ stages: nextStages })
  }

  const handleSaveFlows = async () => {
    setFlowSaving(true)
    setFlowSaved(false)
    try {
      saveFlows()
      setFlowSaved(true)
      setTimeout(() => setFlowSaved(false), 2000)
    } finally {
      setFlowSaving(false)
    }
  }

  // Form dialog helpers
  const openFormDialog = (form?: typeof interestFormsQuery.data extends (infer T)[] ? T : never) => {
    if (form) {
      setEditingFormId(form.id)
      setFormName(form.name)
      setFormDescription(form.description || '')
      setFormIsDefault(form.isDefault)
      setFormQuestions(
        form.questions.map((q: { id: string; label: string; type: string; placeholder?: string | null; helpText?: string | null; isRequired: boolean; options?: string | null }) => ({
          id: q.id,
          label: q.label,
          type: q.type,
          placeholder: q.placeholder || '',
          helpText: q.helpText || '',
          isRequired: q.isRequired,
          options: q.options || '',
        }))
      )
    } else {
      setEditingFormId(null)
      setFormName('')
      setFormDescription('')
      setFormIsDefault(false)
      setFormQuestions([])
    }
    setFormDialogOpen(true)
  }

  const closeFormDialog = () => {
    setFormDialogOpen(false)
    setEditingFormId(null)
    setFormName('')
    setFormDescription('')
    setFormIsDefault(false)
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
      isDefault: formIsDefault,
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
  const openRubricDialog = (rubric?: typeof rubricTemplatesQuery.data extends (infer T)[] ? T : never) => {
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
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Hiring Settings</h1>
          <p className="text-sm text-gray-500">Configure company-wide hiring criteria and interview processes</p>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-6">
        {/* Settings Navigation - Sidebar List */}
        <Card className="h-fit sticky top-20">
          <CardContent className="p-3">
            {settingsNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
                  activeSection === item.id
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.name}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="space-y-6">
          {/* Competency Framework */}
          {activeSection === 'competencies' && (
            <Card id="competencies">
              <CardHeader className="p-5 border-b">
                <h2 className="text-lg font-semibold">Competency Framework</h2>
                <p className="text-sm text-gray-500">Define the competencies expected of all hires. Role-specific competencies are set per job.</p>
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
                        <div key={competency.id} className="p-4 border border-gray-200 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold">{competency.name}</div>
                            <Badge variant="secondary">{competency.category}</Badge>
                          </div>
                          <div className="text-sm text-gray-600">{competency.description}</div>
                        </div>
                      ))}
                    </div>
                    {competencies.length === 0 && (
                      <div className="text-center py-10 text-gray-500">
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

          {/* Personality Templates */}
          {activeSection === 'personality' && (
            <Card id="personality">
              <CardHeader className="p-5 border-b">
                <h2 className="text-lg font-semibold">Personality Templates</h2>
                <p className="text-sm text-gray-500">Define ideal OCEAN personality profiles for different departments. Used for team fit analysis.</p>
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
                      <div key={key} className="text-center p-3 border border-gray-200 rounded-lg">
                        <div className="text-xs text-gray-500 mb-2 capitalize">{key}</div>
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
                <p className="text-sm text-gray-500">Configure team-specific settings and preferences.</p>
              </CardHeader>
              <CardContent className="p-5">
                <div className="text-center py-10 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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
                    <p className="text-sm text-gray-500">
                      Edit the interview flow for each role type. Changes apply across job setup, templates, and candidate stages.
                    </p>
                  </div>
                  <Button onClick={handleSaveFlows} disabled={flowSaving} variant={flowSaved ? 'outline' : 'default'} className={flowSaved ? 'bg-green-50 text-green-700 border-green-300' : ''}>
                    {flowSaved ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {flowSaving ? 'Saving...' : 'Save Changes'}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-[220px_1fr] gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Role Flow</Label>
                      <Select value={activeFlowId} onValueChange={setActiveFlowId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select flow" />
                        </SelectTrigger>
                        <SelectContent>
                          {flows.map((flow) => (
                            <SelectItem key={flow.id} value={flow.id}>
                              {flow.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3 text-xs text-gray-500">
                      These stages power the flow preview in job creation and the flow selector in JD templates.
                    </div>
                    <Button variant="outline" size="sm" onClick={resetFlows}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to defaults
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Flow Name</Label>
                        <Input
                          value={activeFlow?.name ?? ''}
                          onChange={(e) => updateActiveFlow({ name: e.target.value })}
                          placeholder="e.g., Engineering"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={activeFlow?.description ?? ''}
                          onChange={(e) => updateActiveFlow({ description: e.target.value })}
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
                        {(activeFlow?.stages ?? []).map((stage, index) => (
                          <div key={`${activeFlow?.id}-stage-${index}`} className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-semibold">
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
                              disabled={(activeFlow?.stages.length ?? 0) <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Preview</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(activeFlow?.stages ?? []).map((stage) => (
                          <Badge key={`${activeFlow?.id}-${stage}`} variant="secondary">
                            {stage}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interest Forms */}
          {activeSection === 'interestForms' && (
            <Card id="interestForms">
              <CardHeader className="p-5 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">Interest Forms</h2>
                    <p className="text-sm text-gray-500">
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
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                          onClick={() => setSelectedFormId(selectedFormId === form.id ? null : form.id)}
                        >
                          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                            <FileQuestion className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{form.name}</span>
                              {form.isDefault && (
                                <Badge className="bg-green-100 text-green-700">Default</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
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
                      <div className="text-center py-10 text-gray-500">
                        <FileQuestion className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto">
                          {selectedForm.questions.map((q, i) => (
                            <div key={q.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 text-gray-500 text-xs font-medium flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{q.label}</span>
                                  {q.isRequired && <span className="text-red-500 text-xs">*</span>}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{q.type}</div>
                              </div>
                            </div>
                          ))}
                          {selectedForm.questions.length === 0 && (
                            <div className="text-center py-6 text-gray-500">
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
                    <p className="text-sm text-gray-500">
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
                              : 'border-gray-200 hover:border-gray-300'
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
                            <div className="text-sm text-gray-500">
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
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {rubricTemplates.length === 0 && (
                      <div className="text-center py-10 text-gray-500">
                        <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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
                              className="border border-gray-200 rounded-lg overflow-hidden"
                            >
                              <div
                                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
                                onClick={() => setExpandedCriteria(expandedCriteria === criteria.id ? null : criteria.id)}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{criteria.name}</span>
                                    <Badge variant="outline">Weight: {criteria.weight}</Badge>
                                  </div>
                                  {criteria.description && (
                                    <p className="text-sm text-gray-500 mt-1">{criteria.description}</p>
                                  )}
                                </div>
                                {expandedCriteria === criteria.id ? (
                                  <ChevronUp className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              {expandedCriteria === criteria.id && (
                                <div className="bg-gray-50 p-4 border-t">
                                  <div className="text-sm font-medium mb-3">Scoring Scale</div>
                                  <div className="grid grid-cols-5 gap-2">
                                    {Object.entries(scoreScaleLabels).map(([score, label]) => (
                                      <div key={score} className="text-center p-2 bg-white rounded-lg border border-gray-200">
                                        <div className={cn(
                                          'text-lg font-bold mb-1',
                                          parseInt(score) >= 4 ? 'text-green-600' :
                                          parseInt(score) >= 3 ? 'text-amber-600' : 'text-red-600'
                                        )}>
                                          {score}
                                        </div>
                                        <div className="text-xs text-gray-500 leading-tight">{label}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {selectedRubric.criteria.length === 0 && (
                            <div className="text-center py-6 text-gray-500">
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
        </div>
      </div>

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

            <div className="flex items-center gap-2">
              <Switch checked={formIsDefault} onCheckedChange={setFormIsDefault} />
              <Label>Set as default form for new jobs</Label>
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
                  <div key={index} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-500 text-sm font-medium flex-shrink-0">
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
                  <div className="text-center py-6 text-gray-500 border border-dashed border-gray-200 rounded-lg">
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
                  <div key={index} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                    <GripVertical className="h-5 w-5 text-gray-400 mt-2 flex-shrink-0 cursor-grab" />
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
                  <div className="text-center py-6 text-gray-500 border border-dashed border-gray-200 rounded-lg">
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
