'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Save,
  User,
  Code,
  TrendingUp,
  Star,
  Info,
  Check,
  Search,
  X,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useHiringFlows } from '@/lib/recruiting/hiring-flows'
import { trpc } from '@/lib/trpc-client'

const flowAppearance = {
  standard: { icon: User, color: 'bg-indigo-50 text-indigo-600' },
  engineering: { icon: Code, color: 'bg-green-50 text-green-600' },
  sales: { icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
  executive: { icon: Star, color: 'bg-pink-50 text-pink-600' },
}

const PRIORITIES = [
  { value: '5', label: 'Urgent', color: 'bg-red-100 text-red-700' },
  { value: '4', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: '3', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: '2', label: 'Low', color: 'bg-blue-100 text-blue-700' },
  { value: '1', label: 'Not Urgent', color: 'bg-gray-100 text-gray-700' },
]

export default function CreateJobPage() {
  const { data: teams } = trpc.team.listForSelect.useQuery()
  const { data: jobDescriptions } = trpc.jobDescription.listForSelect.useQuery()
  const { data: rubrics } = trpc.hiringRubric.listForSelect.useQuery()
  const { data: competencies } = trpc.competency.listForSelect.useQuery()
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: 'remote',
    employmentType: 'full-time',
    priority: '3',
    jdId: '',
    rubricId: '',
    objectives: '',
  })
  const [selectedFlow, setSelectedFlow] = useState('')
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([])
  const [competencySearch, setCompetencySearch] = useState('')
  const [saveState, setSaveState] = useState<{
    type: 'draft' | 'active' | 'error'
    message: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveTarget, setSaveTarget] = useState<'draft' | 'active' | null>(null)

  const { flows } = useHiringFlows()

  useEffect(() => {
    if (!flows.length) return
    if (!selectedFlow || !flows.some((flow) => flow.id === selectedFlow)) {
      setSelectedFlow(flows[0].id)
    }
  }, [flows, selectedFlow])

  const selectedFlowData = flows.find((flow) => flow.id === selectedFlow) ?? flows[0]
  const selectedJD = (jobDescriptions || []).find(jd => jd.id === formData.jdId)
  const selectedRubric = (rubrics || []).find(r => r.id === formData.rubricId)

  // Filter competencies based on search
  const filteredCompetencies = useMemo(() => {
    const allCompetencies = competencies || []
    if (!competencySearch.trim()) return allCompetencies
    return allCompetencies.filter(c =>
      c.name.toLowerCase().includes(competencySearch.toLowerCase()) ||
      c.category.toLowerCase().includes(competencySearch.toLowerCase())
    )
  }, [competencies, competencySearch])

  const toggleCompetency = (id: string) => {
    setSelectedCompetencies((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : [...prev, id]
    )
  }

  const removeCompetency = (id: string) => {
    setSelectedCompetencies((prev) => prev.filter((c) => c !== id))
  }

  const selectedCompetencyNames = selectedCompetencies.map(
    id => (competencies || []).find(c => c.id === id)?.name || ''
  ).filter(Boolean)

  const validateDraft = () => {
    if (!formData.title.trim()) {
      return 'Add a job title to save a draft.'
    }
    return null
  }

  const validateActive = () => {
    if (!formData.title.trim()) {
      return 'Job title is required to create a job.'
    }
    if (!formData.department.trim()) {
      return 'Select a team or department to create a job.'
    }
    if (!selectedFlow) {
      return 'Select an interview flow to create a job.'
    }
    return null
  }

  const handleSave = async (target: 'draft' | 'active') => {
    setSaveState(null)
    setSaveTarget(target)
    setIsSaving(true)

    const validationError = target === 'draft' ? validateDraft() : validateActive()
    if (validationError) {
      setSaveState({ type: 'error', message: validationError })
      setIsSaving(false)
      setSaveTarget(null)
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 300))

    setSaveState({
      type: target,
      message: target === 'draft'
        ? 'Draft saved. You can finish this job later.'
        : 'Job created. Ready to start adding candidates.',
    })
    setIsSaving(false)
    setSaveTarget(null)
  }

  // Auto-populate title when JD is selected
  useEffect(() => {
    if (formData.jdId && selectedJD) {
      setFormData(prev => ({
        ...prev,
        title: prev.title || selectedJD.name,
        department: prev.department || selectedJD.department,
      }))
    }
  }, [formData.jdId, selectedJD])

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Create New Job</h1>
          <p className="text-sm text-gray-500">Set up a new hiring position with role details and requirements</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={isSaving}
          >
            {saveTarget === 'draft' && isSaving ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button
            onClick={() => handleSave('active')}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveTarget === 'active' && isSaving ? 'Creating...' : 'Create Job'}
          </Button>
        </div>
      </div>
      {saveState && (
        <div className={cn(
          'mb-6 rounded-lg border px-4 py-3 text-sm',
          saveState.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-green-200 bg-green-50 text-green-700'
        )}>
          {saveState.message}
        </div>
      )}

      <div className="grid grid-cols-[1fr_340px] gap-6">
        {/* Form Column */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="p-5 border-b border-gray-200 flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <h2 className="font-semibold">Basic Information</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input
                    placeholder="e.g., Senior Backend Engineer"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Team / Department</Label>
                  <Select
                    value={formData.department || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, department: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {(teams || []).map((team) => (
                        <SelectItem key={team.id} value={team.name}>
                          {team.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="lagos">Lagos, Nigeria</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(value) => setFormData({ ...formData, employmentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center gap-2">
                            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', p.color)}>
                              {p.value}
                            </span>
                            {p.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="p-5 border-b border-gray-200 flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <h2 className="font-semibold">Job Description</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Select from JD Library</Label>
                <Select
                  value={formData.jdId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, jdId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job description" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a JD...</SelectItem>
                    {(jobDescriptions || []).map((jd) => (
                      <SelectItem key={jd.id} value={jd.id}>
                        {jd.name}{jd.department ? ` (${jd.department})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!formData.jdId && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Select from your JD library in{' '}
                    <Link href="/settings/jd-templates" className="text-indigo-600 hover:underline">
                      Job Settings
                    </Link>
                  </p>
                )}
              </div>
              {selectedJD && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{selectedJD.name}</span>
                    <Badge variant="secondary">{selectedJD.department}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Job description content will be loaded here...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Hiring Rubric */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="p-5 border-b border-gray-200 flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <h2 className="font-semibold">Hiring Rubric & Scorecard</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Select Hiring Rubric</Label>
                <Select
                  value={formData.rubricId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, rubricId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a rubric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a rubric...</SelectItem>
                    {(rubrics || []).map((rubric) => (
                      <SelectItem key={rubric.id} value={rubric.id}>
                        {rubric.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!formData.rubricId && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Create rubrics in{' '}
                    <Link href="/settings/job-settings/rubrics" className="text-indigo-600 hover:underline">
                      Job Settings &rarr; Hiring Rubrics
                    </Link>
                  </p>
                )}
              </div>
              {selectedRubric && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <span className="font-medium">{selectedRubric.name}</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Rubric criteria will be shown here...
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Role Objectives (6-12 months)</Label>
                <Textarea
                  rows={4}
                  placeholder="What should this person achieve in their first 6-12 months?"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Interview Flow */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="p-5 border-b border-gray-200 flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                4
              </div>
              <h2 className="font-semibold">Interview Flow</h2>
            </div>
            <div className="p-5">
              <div className="space-y-2 mb-4">
                <Label>Select Interview Flow</Label>
                <Select
                  value={selectedFlow}
                  onValueChange={setSelectedFlow}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interview flow" />
                  </SelectTrigger>
                  <SelectContent>
                    {flows.map((flow) => (
                      <SelectItem key={flow.id} value={flow.id}>
                        {flow.name} ({flow.stages.length} stages)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  Manage flows in{' '}
                  <Link href="/recruiting/settings" className="text-indigo-600 hover:underline">
                    Interview Settings
                  </Link>
                </p>
              </div>

              {selectedFlowData && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      flowAppearance[selectedFlowData.id as keyof typeof flowAppearance]?.color || 'bg-gray-100 text-gray-600'
                    )}>
                      {(() => {
                        const Icon = flowAppearance[selectedFlowData.id as keyof typeof flowAppearance]?.icon || User
                        return <Icon className="h-5 w-5" />
                      })()}
                    </div>
                    <div>
                      <div className="font-semibold">{selectedFlowData.name}</div>
                      <div className="text-sm text-gray-500">{selectedFlowData.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedFlowData.stages.map((stage, i) => (
                      <span key={`${selectedFlowData.id}-${stage}-${i}`} className="flex items-center gap-2">
                        <span className="text-xs bg-white px-3 py-1 rounded-full text-gray-600 border">
                          {stage}
                        </span>
                        {i < selectedFlowData.stages.length - 1 && (
                          <span className="text-gray-300">&rarr;</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Competencies */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="p-5 border-b border-gray-200 flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                5
              </div>
              <h2 className="font-semibold">Role Competencies</h2>
            </div>
            <div className="p-5">
              {/* Selected competencies */}
              {selectedCompetencies.length > 0 && (
                <div className="mb-4">
                  <Label className="mb-2 block">Selected ({selectedCompetencies.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompetencies.map((id) => {
                      const comp = (competencies || []).find(c => c.id === id)
                      if (!comp) return null
                      return (
                        <Badge
                          key={id}
                          className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer gap-1"
                          onClick={() => removeCompetency(id)}
                        >
                          {comp.name}
                          <X className="h-3 w-3" />
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search competencies..."
                  value={competencySearch}
                  onChange={(e) => setCompetencySearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Competencies grid */}
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {filteredCompetencies.map((comp) => (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => toggleCompetency(comp.id)}
                    className={cn(
                      'flex items-center gap-2 p-3 border rounded-lg transition-all text-left',
                      selectedCompetencies.includes(comp.id)
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div
                      className={cn(
                        'w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0',
                        selectedCompetencies.includes(comp.id)
                          ? 'bg-indigo-600 text-white'
                          : 'border-2 border-gray-300'
                      )}
                    >
                      {selectedCompetencies.includes(comp.id) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{comp.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{comp.category}</span>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-sm text-gray-500 flex items-center gap-1 mt-4">
                <Info className="h-3.5 w-3.5" />
                Manage competencies in{' '}
                <Link href="/settings/job-settings/competencies" className="text-indigo-600 hover:underline">
                  Job Settings &rarr; Role Competencies
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Preview Sidebar */}
        <div className="sticky top-20">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5">
              <div className="text-xs opacity-80 mb-2">Job Preview</div>
              <div className="text-xl font-semibold">{formData.title || 'Job Title'}</div>
              <div className="text-sm opacity-90 mt-1">
                {formData.department || 'No team'} &middot;{' '}
                {formData.location === 'remote' ? 'Remote' : formData.location === 'lagos' ? 'Lagos, Nigeria' : 'Hybrid'}
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Employment</div>
                  <div className="font-medium capitalize">{formData.employmentType.replace('-', ' ')}</div>
                </div>
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Priority</div>
                  <Badge className={cn(
                    PRIORITIES.find(p => p.value === formData.priority)?.color || 'bg-gray-100'
                  )}>
                    {PRIORITIES.find(p => p.value === formData.priority)?.label || 'Medium'}
                  </Badge>
                </div>
              </div>
              {selectedJD && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Job Description</div>
                  <div className="font-medium">{selectedJD.name}</div>
                </div>
              )}
              {selectedRubric && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Hiring Rubric</div>
                  <div className="font-medium">{selectedRubric.name}</div>
                </div>
              )}
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Interview Flow</div>
                <div className="font-medium">{selectedFlowData?.name}</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {selectedFlowData?.stages.map((stage, i) => (
                    <span key={i} className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {stage}
                      </Badge>
                      {i < (selectedFlowData?.stages.length || 0) - 1 && (
                        <span className="text-gray-300">&rarr;</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              {selectedCompetencyNames.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Key Competencies</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCompetencyNames.map((name) => (
                      <Badge key={name} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Info className="h-4 w-4" />
              <span className="font-medium text-sm">AI-Ready</span>
            </div>
            <p className="text-sm text-gray-600">
              Once created, the AI will use this job profile to score candidates and generate personalized interview questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
