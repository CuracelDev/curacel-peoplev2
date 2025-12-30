'use client'

import { useEffect, useState } from 'react'
import {
  Save,
  Star,
  Smile,
  Users,
  GitBranch,
  Lock,
  Settings,
  Plus,
  Eye,
  Copy,
  ExternalLink,
  Trash2,
  RotateCcw,
  FileQuestion,
  ClipboardCheck,
  GripVertical,
  Link2,
  ChevronDown,
  ChevronUp,
  Edit2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useHiringFlows, type HiringFlow } from '@/lib/recruiting/hiring-flows'

const settingsNav = [
  { id: 'competencies', name: 'Competencies', icon: Star },
  { id: 'personality', name: 'Personality Templates', icon: Smile },
  { id: 'team', name: 'Team Profiles', icon: Users },
  { id: 'interview', name: 'Hiring Flow', icon: GitBranch },
  { id: 'interestForms', name: 'Interest Forms', icon: FileQuestion },
  { id: 'rubrics', name: 'Interview Rubrics', icon: ClipboardCheck },
  { id: 'integrations', name: 'Integrations', icon: Lock },
  { id: 'api', name: 'API & Keys', icon: Settings },
]

const competencies = [
  { name: 'Problem Solving', description: 'Ability to analyze complex problems, identify root causes, and develop effective solutions.', level: 'Required' },
  { name: 'Communication', description: 'Clear and effective written and verbal communication across all levels of the organization.', level: 'Required' },
  { name: 'Collaboration', description: 'Works effectively with cross-functional teams and builds strong working relationships.', level: 'Required' },
  { name: 'Adaptability', description: 'Thrives in ambiguous situations and adapts quickly to changing priorities.', level: 'Required' },
  { name: 'Ownership', description: 'Takes full responsibility for outcomes and follows through on commitments.', level: 'Required' },
  { name: 'Customer Focus', description: 'Prioritizes customer needs and consistently delivers value to end users.', level: 'Required' },
]

const integrations = [
  { name: 'Fireflies.ai', status: 'connected', statusText: 'Connected - Last sync 2 hours ago', color: 'bg-orange-500' },
  { name: 'Google Forms', status: 'connected', statusText: 'Connected - Webhook active', color: 'bg-blue-500' },
  { name: 'Kand.io', status: 'disconnected', statusText: 'Not connected', color: 'bg-gray-100' },
  { name: 'TestGorilla', status: 'disconnected', statusText: 'Not connected', color: 'bg-gray-100' },
  { name: 'Testify', status: 'disconnected', statusText: 'Not connected', color: 'bg-gray-100' },
]

// Mock interest form templates
const interestFormTemplates = [
  {
    id: '1',
    name: 'Senior Enterprise Account Executive',
    questionCount: 30,
    isDefault: false,
    linkedJobs: 2,
    lastUpdated: '2 days ago',
  },
  {
    id: '2',
    name: 'Engineering Roles',
    questionCount: 25,
    isDefault: true,
    linkedJobs: 5,
    lastUpdated: '1 week ago',
  },
  {
    id: '3',
    name: 'Design Roles',
    questionCount: 20,
    isDefault: false,
    linkedJobs: 1,
    lastUpdated: '3 days ago',
  },
]

// Sample questions for the form builder preview
const sampleFormQuestions = [
  { id: '1', question: 'What is your name?', type: 'text', required: true },
  { id: '2', question: 'What keeps you awake?', type: 'textarea', required: true },
  { id: '3', question: 'Most impressive thing you have done', type: 'textarea', required: true },
  { id: '4', question: 'Big dream to achieve', type: 'textarea', required: true },
  { id: '5', question: 'MBTI type', type: 'text', required: true },
  { id: '6', question: 'Why work at Curacel?', type: 'textarea', required: true },
  { id: '7', question: 'Sales experience duration', type: 'text', required: true },
  { id: '8', question: 'Sales type experience', type: 'select', required: true, options: ['Retail', 'Enterprise', 'Inside', 'Outside', 'B2B'] },
  { id: '9', question: 'Prospecting skill rating', type: 'scale', required: true, scaleMin: 1, scaleMax: 5 },
  { id: '10', question: 'Current/previous salary', type: 'text', required: true },
  { id: '11', question: 'Expected monthly salary', type: 'text', required: true },
]

// Mock interview rubric templates
const interviewRubrics = [
  {
    id: '1',
    name: 'General Questions',
    stage: 'HR_SCREEN',
    criteriaCount: 8,
    linkedJobs: 5,
    lastUpdated: '1 week ago',
  },
  {
    id: '2',
    name: 'Technical Assessment',
    stage: 'TECHNICAL',
    criteriaCount: 10,
    linkedJobs: 3,
    lastUpdated: '2 days ago',
  },
  {
    id: '3',
    name: 'Panel Interview',
    stage: 'PANEL',
    criteriaCount: 12,
    linkedJobs: 5,
    lastUpdated: '3 days ago',
  },
]

// Sample rubric criteria
const sampleRubricCriteria = [
  {
    id: '1',
    name: 'Problem Solving',
    description: 'Ability to analyze complex problems and develop effective solutions',
    weight: 5,
  },
  {
    id: '2',
    name: 'Communication',
    description: 'Clear and effective verbal and written communication',
    weight: 4,
  },
  {
    id: '3',
    name: 'Technical Knowledge',
    description: 'Depth of domain expertise and technical understanding',
    weight: 5,
  },
  {
    id: '4',
    name: 'Cultural Fit',
    description: 'Alignment with company values and team dynamics',
    weight: 4,
  },
  {
    id: '5',
    name: 'Leadership Potential',
    description: 'Ability to guide and influence others',
    weight: 3,
  },
]

const scoreScaleLabels = {
  1: 'Poor - No evidence of skill',
  2: 'Below Average - Limited evidence',
  3: 'Average - Meets expectations',
  4: 'Above Average - Exceeds expectations',
  5: 'Excellent - Strong evidence',
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('competencies')
  const [selectedDepartment, setSelectedDepartment] = useState('engineering')
  const [oceanProfile, setOceanProfile] = useState({
    openness: 75,
    conscientiousness: 85,
    extraversion: 50,
    agreeableness: 70,
    neuroticism: 30,
  })
  const { flows, setFlows, resetFlows } = useHiringFlows()
  const [activeFlowId, setActiveFlowId] = useState('standard')

  // Interest form state
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [editingForm, setEditingForm] = useState(false)

  // Rubric state
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null)
  const [editingRubric, setEditingRubric] = useState(false)
  const [expandedCriteria, setExpandedCriteria] = useState<string | null>(null)

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

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Hiring Settings</h1>
          <p className="text-sm text-gray-500">Configure company-wide hiring criteria and integrations</p>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
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
          <Card id="competencies">
            <CardHeader className="p-5 border-b">
              <h2 className="text-lg font-semibold">Competency Framework</h2>
              <p className="text-sm text-gray-500">Define the competencies expected of all hires at Curacel. Role-specific competencies are set per job.</p>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {competencies.map((competency, i) => (
                  <div key={i} className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold">{competency.name}</div>
                      <Badge variant="secondary">{competency.level}</Badge>
                    </div>
                    <div className="text-sm text-gray-600">{competency.description}</div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Competency
              </Button>
            </CardContent>
          </Card>

          {/* Personality Templates */}
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
                <Label className="mb-4 block">OCEAN Profile (Engineering)</Label>
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
            </CardContent>
          </Card>

          {/* Interview Settings */}
          <Card id="interview">
            <CardHeader className="p-5 border-b">
              <h2 className="text-lg font-semibold">Hiring Flow</h2>
              <p className="text-sm text-gray-500">
                Edit the interview flow for each role type. Changes apply across job setup, templates, and candidate stages.
              </p>
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

          {/* Interest Forms */}
          <Card id="interestForms">
            <CardHeader className="p-5 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">Interest Forms</h2>
                  <p className="text-sm text-gray-500">
                    Create and manage application forms that candidates fill out when applying. These forms can be linked to specific jobs.
                  </p>
                </div>
                <Button onClick={() => setEditingForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Form
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3">
                {interestFormTemplates.map((form) => (
                  <div
                    key={form.id}
                    className={cn(
                      'flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all',
                      selectedFormId === form.id
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                    onClick={() => setSelectedFormId(form.id)}
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
                        {form.questionCount} questions · Linked to {form.linkedJobs} job{form.linkedJobs !== 1 ? 's' : ''} · Updated {form.lastUpdated}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); }}>
                        <Link2 className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingForm(true); }}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Preview/Editor */}
              {selectedFormId && (
                <div className="mt-6 border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Form Preview</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Form
                      </Button>
                      <Button variant="outline" size="sm">
                        <Link2 className="h-4 w-4 mr-2" />
                        Get Public Link
                      </Button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto">
                    {sampleFormQuestions.map((q, i) => (
                      <div key={q.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 text-gray-500 text-xs font-medium flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{q.question}</span>
                            {q.required && <span className="text-red-500 text-xs">*</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 capitalize">{q.type}</div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Link2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">Public Application Link</div>
                    <p className="text-sm text-blue-700 mt-1">
                      When you assign an interest form to a job, candidates can access it via:
                    </p>
                    <code className="text-sm bg-blue-100 px-2 py-1 rounded mt-2 block text-blue-800">
                      https://yourcompany.com/apply/[job-id]
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interview Rubrics */}
          <Card id="rubrics">
            <CardHeader className="p-5 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">Interview Rubrics</h2>
                  <p className="text-sm text-gray-500">
                    Define scoring criteria for each interview stage. Evaluators use these to consistently score candidates.
                  </p>
                </div>
                <Button onClick={() => setEditingRubric(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rubric
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3">
                {interviewRubrics.map((rubric) => (
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
                        {rubric.criteriaCount} criteria · Linked to {rubric.linkedJobs} job{rubric.linkedJobs !== 1 ? 's' : ''} · Updated {rubric.lastUpdated}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingRubric(true); }}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
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

              {/* Rubric Criteria Preview */}
              {selectedRubricId && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="font-semibold mb-4">Scoring Criteria</h3>
                  <div className="space-y-3">
                    {sampleRubricCriteria.map((criteria) => (
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
                            <p className="text-sm text-gray-500 mt-1">{criteria.description}</p>
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
                  </div>

                  <Button variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Criteria
                  </Button>
                </div>
              )}

              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-900">How Rubrics Work</div>
                    <p className="text-sm text-purple-700 mt-1">
                      Each interviewer fills out a scorecard using the rubric criteria. Scores are aggregated across evaluators to provide a comprehensive view of the candidate on their profile.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card id="integrations">
            <CardHeader className="p-5 border-b">
              <h2 className="text-lg font-semibold">Integrations</h2>
              <p className="text-sm text-gray-500">Connect external services to automate data collection and analysis.</p>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {integrations.map((integration, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center text-white', integration.color)}>
                    <ExternalLink className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{integration.name}</div>
                    <div className={cn(
                      'text-sm',
                      integration.status === 'connected' ? 'text-green-600' : 'text-gray-500'
                    )}>
                      {integration.statusText}
                    </div>
                  </div>
                  <Button
                    variant={integration.status === 'connected' ? 'outline' : 'default'}
                    size="sm"
                  >
                    {integration.status === 'connected' ? 'Configure' : 'Connect'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* API & Keys */}
          <Card id="api">
            <CardHeader className="p-5 border-b">
              <h2 className="text-lg font-semibold">API & Keys</h2>
              <p className="text-sm text-gray-500">Manage API keys for AI services and external integrations.</p>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <Label className="mb-2 block">Anthropic API Key (Claude)</Label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg font-mono text-sm">
                  <span className="flex-1 text-gray-600">sk-ant-api03-****************************</span>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Show
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Fireflies API Key</Label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg font-mono text-sm">
                  <span className="flex-1 text-gray-600">ff-****************************</span>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Show
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>

              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add New Key
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
