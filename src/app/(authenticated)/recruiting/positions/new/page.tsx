'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Save,
  Upload,
  User,
  Code,
  TrendingUp,
  Star,
  Info,
  Check,
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

const flowAppearance = {
  standard: { icon: User, color: 'bg-indigo-50 text-indigo-600' },
  engineering: { icon: Code, color: 'bg-green-50 text-green-600' },
  sales: { icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
  executive: { icon: Star, color: 'bg-pink-50 text-pink-600' },
}

const competencies = [
  'Technical Excellence',
  'Problem Solving',
  'Communication',
  'Leadership',
  'Collaboration',
  'Adaptability',
  'Ownership',
  'System Design',
  'Customer Focus',
]

export default function CreateJobPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: 'Senior Backend Engineer',
    department: 'engineering',
    location: 'remote',
    employmentType: 'full-time',
    description: `We are looking for a Senior Backend Engineer to join our growing team. You will be responsible for designing, building, and maintaining scalable backend systems that power our insurance technology platform.

Key Responsibilities:
- Design and implement scalable microservices architecture
- Lead technical decisions and mentor junior engineers
- Collaborate with product and design teams
- Ensure code quality through testing and code reviews

Requirements:
- 5+ years of backend development experience
- Strong proficiency in Node.js, Python, or Go
- Experience with cloud platforms (AWS, GCP)
- Database design expertise (PostgreSQL, MongoDB)
- Understanding of CI/CD and DevOps practices`,
    objectives: `- Successfully onboard and contribute to core product features within first 30 days
- Lead at least 2 major feature implementations
- Establish testing best practices for the backend team
- Mentor at least 1 junior engineer`,
  })
  const [selectedFlow, setSelectedFlow] = useState('engineering')
  const [selectedCompetencies, setSelectedCompetencies] = useState([
    'Technical Excellence',
    'Problem Solving',
    'Communication',
    'Leadership',
    'System Design',
  ])

  const toggleCompetency = (competency: string) => {
    setSelectedCompetencies((prev) =>
      prev.includes(competency)
        ? prev.filter((c) => c !== competency)
        : [...prev, competency]
    )
  }

  const { flows } = useHiringFlows()

  useEffect(() => {
    if (!flows.length) return
    if (!flows.some((flow) => flow.id === selectedFlow)) {
      setSelectedFlow(flows[0].id)
    }
  }, [flows, selectedFlow])

  const selectedFlowData = flows.find((flow) => flow.id === selectedFlow) ?? flows[0]

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Create New Job</h1>
          <p className="text-sm text-gray-500">Set up a new hiring position with role details and requirements</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Save as Draft</Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </div>
      </div>

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
                  <Label>Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <Label>
                  Job Description <span className="text-gray-400 font-normal">(paste or upload)</span>
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-colors cursor-pointer">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="text-gray-600">Drop your JD file here or click to upload</div>
                  <div className="text-sm text-gray-400 mt-1">PDF, DOC, or TXT (max 10MB)</div>
                </div>
                <div className="text-center text-gray-400 text-sm py-2">or paste below</div>
                <Textarea
                  rows={8}
                  placeholder="Paste job description here..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
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
                <Label>
                  Upload Hiring Rubric <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-colors cursor-pointer">
                  <div className="text-gray-600">Upload rubric document</div>
                  <div className="text-sm text-gray-400 mt-1">PDF, DOC, or Excel</div>
                </div>
              </div>
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
              <Label className="mb-4 block">Select the interview flow for this role</Label>
              <div className="grid grid-cols-2 gap-4">
                {flows.map((flow) => {
                  const appearance =
                    flowAppearance[flow.id as keyof typeof flowAppearance] ??
                    { icon: User, color: 'bg-gray-50 text-gray-600' }
                  const Icon = appearance.icon

                  return (
                    <button
                      key={flow.id}
                      type="button"
                      onClick={() => setSelectedFlow(flow.id)}
                      className={cn(
                        'border-2 rounded-xl p-4 text-left transition-all',
                        selectedFlow === flow.id
                          ? 'border-indigo-500 bg-indigo-50/50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', appearance.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="font-semibold">{flow.name}</div>
                      </div>
                      <div className="text-sm text-gray-500">{flow.description}</div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {flow.stages.map((stage, i) => (
                          <span key={`${flow.id}-${stage}-${i}`} className="flex items-center gap-2">
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                              {stage}
                            </span>
                            {i < flow.stages.length - 1 && (
                              <span className="text-gray-300 text-xs">&rarr;</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
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
              <Label className="mb-4 block">Select the key competencies for this role</Label>
              <div className="grid grid-cols-3 gap-3">
                {competencies.map((competency) => (
                  <button
                    key={competency}
                    type="button"
                    onClick={() => toggleCompetency(competency)}
                    className={cn(
                      'flex items-center gap-2 p-3 border rounded-lg transition-all text-left',
                      selectedCompetencies.includes(competency)
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div
                      className={cn(
                        'w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0',
                        selectedCompetencies.includes(competency)
                          ? 'bg-indigo-600 text-white'
                          : 'border-2 border-gray-300'
                      )}
                    >
                      {selectedCompetencies.includes(competency) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <span className="text-sm">{competency}</span>
                  </button>
                ))}
              </div>
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
                {formData.department.charAt(0).toUpperCase() + formData.department.slice(1)} &middot;{' '}
                {formData.location === 'remote' ? 'Remote' : formData.location === 'lagos' ? 'Lagos, Nigeria' : 'Hybrid'}
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Employment</div>
                <div className="font-medium">
                  {formData.employmentType === 'full-time' ? 'Full-time' : formData.employmentType === 'part-time' ? 'Part-time' : 'Contract'}
                </div>
              </div>
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
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Key Competencies</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCompetencies.map((competency) => (
                    <Badge key={competency} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                      {competency}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">6-12 Month Objectives</div>
                <ul className="text-sm text-gray-600 list-disc pl-4 space-y-1 mt-2">
                  <li>Contribute to core features in 30 days</li>
                  <li>Lead 2+ major implementations</li>
                  <li>Establish testing best practices</li>
                  <li>Mentor junior engineers</li>
                </ul>
              </div>
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
