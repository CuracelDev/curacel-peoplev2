'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  MapPin,
  DollarSign,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
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
  { value: '1', label: 'Not Urgent', color: 'bg-muted text-foreground' },
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD']
const PAY_FREQUENCIES = ['annually', 'monthly', 'hourly']

const SUGGESTED_LOCATIONS = [
  'Lagos, LA, NG',
  'Nairobi, KE',
  'Abuja, FCT, NG',
  'London, UK',
  'New York, NY, US',
  'San Francisco, CA, US',
  'Berlin, DE',
]

export default function CreateJobPage() {
  const router = useRouter()
  const { data: teams } = trpc.team.listForSelect.useQuery()
  const { data: jobDescriptions } = trpc.jobDescription.listForSelect.useQuery()
  const { data: competencies } = trpc.competency.listForSelect.useQuery()
  const { data: employees } = trpc.employee.getAllActive.useQuery()
  const createJob = trpc.job.create.useMutation()

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    employmentType: 'full-time',
    priority: '3',
    jdId: '',
    deadline: '',
    hiresCount: '1',
    // New fields
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'USD',
    salaryFrequency: 'annually',
    equityMin: '',
    equityMax: '',
    autoArchiveLocation: false,
    hiringManagerId: '',
  })

  const [officeLocations, setOfficeLocations] = useState<string[]>([])
  const [locationSearch, setLocationSearch] = useState('')
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const [followers, setFollowers] = useState<string[]>([])
  const [followerSearch, setFollowerSearch] = useState('')

  const [selectedFlow, setSelectedFlow] = useState('')
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([])
  const [competencySearch, setCompetencySearch] = useState('')
  const [saveState, setSaveState] = useState<{
    type: 'draft' | 'active' | 'error'
    message: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveTarget, setSaveTarget] = useState<'draft' | 'active' | null>(null)

  // Use tRPC for hiring flows instead of localStorage
  const { data: hiringFlows, isLoading: flowsLoading } = trpc.hiringFlow.list.useQuery()
  const flows = hiringFlows ?? []

  useEffect(() => {
    if (!flows.length) return
    if (!selectedFlow || !flows.some((flow) => flow.id === selectedFlow)) {
      // Select the default flow, or first flow
      const defaultFlow = flows.find((f) => f.isDefault) ?? flows[0]
      setSelectedFlow(defaultFlow.id)
    }
  }, [flows, selectedFlow])

  const selectedFlowData = flows.find((flow) => flow.id === selectedFlow) ?? flows[0]
  const selectedJD = (jobDescriptions || []).find(jd => jd.id === formData.jdId)

  // Filter competencies based on search
  const filteredCompetencies = useMemo(() => {
    const allCompetencies = competencies || []
    if (!competencySearch.trim()) return allCompetencies
    return allCompetencies.filter(c =>
      c.name.toLowerCase().includes(competencySearch.toLowerCase()) ||
      c.category.toLowerCase().includes(competencySearch.toLowerCase())
    )
  }, [competencies, competencySearch])

  // Filter office locations based on search
  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim()
    const normalizedQuery = query.toLowerCase()
    const existingLocations = new Set(officeLocations.map((loc) => loc.toLowerCase()))
    const matches = SUGGESTED_LOCATIONS
      .filter((loc) => (query ? loc.toLowerCase().includes(normalizedQuery) : true))
      .map((loc) => ({ label: loc, value: loc, isCustom: false }))

    if (query && !existingLocations.has(normalizedQuery)) {
      const alreadySuggested = SUGGESTED_LOCATIONS.some(
        (loc) => loc.toLowerCase() === normalizedQuery
      )
      if (!alreadySuggested) {
        matches.unshift({ label: `Add "${query}"`, value: query, isCustom: true })
      }
    }

    return matches
  }, [locationSearch, officeLocations])

  // Filter employees for followers based on search
  const filteredEmployees = useMemo(() => {
    const allEmployees = employees || []
    if (!followerSearch.trim()) return allEmployees.slice(0, 10)
    return allEmployees.filter(emp =>
      emp.fullName?.toLowerCase().includes(followerSearch.toLowerCase()) ||
      emp.workEmail?.toLowerCase().includes(followerSearch.toLowerCase())
    ).slice(0, 10)
  }, [employees, followerSearch])

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

  const toggleLocation = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setOfficeLocations((prev) => {
      const normalized = trimmed.toLowerCase()
      const exists = prev.some((loc) => loc.toLowerCase() === normalized)
      if (exists) {
        return prev.filter((loc) => loc.toLowerCase() !== normalized)
      }
      return [...prev, trimmed]
    })
  }

  const removeLocation = (value: string) => {
    const normalized = value.toLowerCase()
    setOfficeLocations((prev) => prev.filter((loc) => loc.toLowerCase() !== normalized))
  }

  const toggleFollower = (id: string) => {
    setFollowers((prev) =>
      prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id]
    )
  }

  const removeFollower = (id: string) => {
    setFollowers((prev) => prev.filter((f) => f !== id))
  }

  const selectedCompetencyNames = selectedCompetencies.map(
    id => (competencies || []).find(c => c.id === id)?.name || ''
  ).filter(Boolean)

  const formattedDeadline = formData.deadline
    ? new Date(formData.deadline).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : ''
  const hiresCountValue = Number(formData.hiresCount)
  const hiresCountDisplay = Number.isFinite(hiresCountValue) && hiresCountValue > 0
    ? hiresCountValue
    : 1
  const locationSummary = officeLocations.length === 0
    ? 'Location TBD'
    : officeLocations.length === 1
      ? officeLocations[0]
      : `${officeLocations.length} locations`

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
    if (!formData.hiresCount || Number(formData.hiresCount) < 1) {
      return 'Number of hires must be at least 1.'
    }
    if (!formData.deadline) {
      return 'Add a deadline to create a job.'
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

    try {
      const job = await createJob.mutateAsync({
        title: formData.title.trim(),
        department: formData.department || undefined,
        employmentType: formData.employmentType,
        status: target === 'draft' ? 'DRAFT' : 'ACTIVE',
        priority: Number(formData.priority),
        deadline: formData.deadline || undefined,
        hiresCount: Number(formData.hiresCount) || 1,
        salaryMin: formData.salaryMin ? Number(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? Number(formData.salaryMax) : undefined,
        salaryCurrency: formData.salaryCurrency || undefined,
        salaryFrequency: formData.salaryFrequency || undefined,
        equityMin: formData.equityMin ? Number(formData.equityMin) : undefined,
        equityMax: formData.equityMax ? Number(formData.equityMax) : undefined,
        locations: officeLocations,
        hiringFlowId: selectedFlow || undefined,
        jobDescriptionId: formData.jdId || undefined,
        hiringManagerId: formData.hiringManagerId || undefined,
        autoArchiveLocation: formData.autoArchiveLocation,
        followerIds: followers,
        competencyIds: selectedCompetencies,
      })

      setSaveState({
        type: target,
        message: target === 'draft'
          ? 'Draft saved. You can finish this job later.'
          : 'Job created. Ready to start adding candidates.',
      })

      // Navigate to jobs list after a short delay
      setTimeout(() => {
        router.push('/hiring/positions')
      }, 1000)
    } catch (error) {
      setSaveState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save job. Please try again.',
      })
    } finally {
      setIsSaving(false)
      setSaveTarget(null)
    }
  }

  // Auto-populate title when JD is selected
  useEffect(() => {
    if (formData.jdId && selectedJD) {
      setFormData(prev => ({
        ...prev,
        title: prev.title || selectedJD.name,
        department: prev.department || selectedJD.department || '',
      }))
    }
  }, [formData.jdId, selectedJD])

  return (
    <div className="p-4">
      {/* Action Bar */}
      <div className="flex justify-end gap-3 mb-4">
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
      {saveState && (
        <div className={cn(
          'mb-4 rounded-lg border px-4 py-3 text-sm',
          saveState.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-green-200 bg-green-50 text-green-700'
        )}>
          {saveState.message}
        </div>
      )}

      <div className="grid grid-cols-[1fr_300px] gap-4">
        {/* Form Column */}
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-5 border-b border-border flex items-center gap-3">
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
              <div className="grid grid-cols-2 gap-4">
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
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Target date to fill this role.</p>
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
                <div className="space-y-2">
                  <Label>Number of Hires</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={formData.hiresCount}
                    onChange={(e) => setFormData({ ...formData, hiresCount: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">How many people should we hire?</p>
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-3">
                <Label>Location</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {officeLocations.map((loc) => (
                    <Badge
                      key={loc}
                      variant="secondary"
                      className="gap-1 cursor-pointer"
                      onClick={() => removeLocation(loc)}
                    >
                      {loc}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    placeholder="Search or add a city or region"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onFocus={() => setLocationDropdownOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setLocationDropdownOpen(false), 150)
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return
                      const value = locationSearch.trim()
                      if (!value) return
                      event.preventDefault()
                      toggleLocation(value)
                      setLocationSearch('')
                    }}
                  />
                  {locationDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredLocations.map((loc) => (
                        <button
                          key={loc.value}
                          type="button"
                          className={cn(
                            'w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between',
                            officeLocations.some((selected) => selected.toLowerCase() === loc.value.toLowerCase()) && 'bg-indigo-50'
                          )}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            toggleLocation(loc.value)
                            setLocationSearch('')
                            setLocationDropdownOpen(false)
                          }}
                        >
                          <span className="text-sm">{loc.label}</span>
                          {officeLocations.some((selected) => selected.toLowerCase() === loc.value.toLowerCase()) && (
                            <Check className="h-4 w-4 text-indigo-600" />
                          )}
                        </button>
                      ))}
                      {!filteredLocations.length && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No matches found.</div>
                      )}
                    </div>
                  )}
                </div>
                {!locationSearch && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Suggested:</span>
                    {SUGGESTED_LOCATIONS.slice(0, 3).map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        className="text-indigo-600 hover:underline"
                        onClick={() => toggleLocation(loc)}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Add any city or region. You can select multiple locations.</p>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-5 border-b border-border flex items-center gap-3">
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
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Select from your JD library in{' '}
                    <Link href="/settings/jd-templates" className="text-indigo-600 hover:underline">
                      Job Settings
                    </Link>
                  </p>
                )}
              </div>
              {selectedJD && (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{selectedJD.name}</span>
                    <Badge variant="secondary">{selectedJD.department}</Badge>
                  </div>
                  <p className="text-sm text-foreground/80">
                    Job description content will be loaded here...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Salary and Equity Ranges */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <h2 className="font-semibold">Salary and Equity Ranges</h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">This information is visible to candidates on the job directory.</p>

              {/* Pay Range */}
              <div className="space-y-2">
                <Label>Pay range</Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-10">Min.</span>
                    <Input
                      type="number"
                      placeholder="6000"
                      value={formData.salaryMin}
                      onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                      className="w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-10">Max.</span>
                    <Input
                      type="number"
                      placeholder="9000"
                      value={formData.salaryMax}
                      onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                      className="w-28"
                    />
                  </div>
                  <Select
                    value={formData.salaryCurrency}
                    onValueChange={(value) => setFormData({ ...formData, salaryCurrency: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.salaryFrequency}
                    onValueChange={(value) => setFormData({ ...formData, salaryFrequency: value })}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAY_FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Equity Range */}
              <div className="space-y-2">
                <Label>Equity range</Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-10">Min.</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.05"
                      value={formData.equityMin}
                      onChange={(e) => setFormData({ ...formData, equityMin: e.target.value })}
                      className="w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-10">Max.</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.5"
                      value={formData.equityMax}
                      onChange={(e) => setFormData({ ...formData, equityMax: e.target.value })}
                      className="w-28"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground px-3 py-2 bg-muted rounded">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interview Flow */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-5 border-b border-border flex items-center gap-3">
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
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  Manage flows in{' '}
                  <Link href="/hiring/settings" className="text-indigo-600 hover:underline">
                    Interview Settings
                  </Link>
                </p>
              </div>

              {selectedFlowData && (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      flowAppearance[selectedFlowData.id as keyof typeof flowAppearance]?.color || 'bg-muted text-foreground/80'
                    )}>
                      {(() => {
                        const Icon = flowAppearance[selectedFlowData.id as keyof typeof flowAppearance]?.icon || User
                        return <Icon className="h-5 w-5" />
                      })()}
                    </div>
                    <div>
                      <div className="font-semibold">{selectedFlowData.name}</div>
                      <div className="text-sm text-muted-foreground">{selectedFlowData.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedFlowData.stages.map((stage, i) => (
                      <span key={`${selectedFlowData.id}-${stage}-${i}`} className="flex items-center gap-2">
                        <span className="text-xs bg-card px-3 py-1 rounded-full text-foreground/80 border">
                          {stage}
                        </span>
                        {i < selectedFlowData.stages.length - 1 && (
                          <span className="text-muted-foreground/60">&rarr;</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Competencies */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-5 border-b border-border flex items-center gap-3">
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
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                        : 'border-border hover:border-border'
                    )}
                  >
                    <div
                      className={cn(
                        'w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0',
                        selectedCompetencies.includes(comp.id)
                          ? 'bg-indigo-600 text-white'
                          : 'border-2 border-border'
                      )}
                    >
                      {selectedCompetencies.includes(comp.id) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{comp.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{comp.category}</span>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-4">
                <Info className="h-3.5 w-3.5" />
                Manage competencies in{' '}
                <Link href="/settings/job-settings/competencies" className="text-indigo-600 hover:underline">
                  Job Settings &rarr; Role Competencies
                </Link>
              </p>
            </div>
          </div>

          {/* BlueAI Actions */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                6
              </div>
              <h2 className="font-semibold">BlueAI Actions</h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-muted-foreground mb-4">Auto-archive applicants that do not meet your requirements.</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={formData.autoArchiveLocation}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoArchiveLocation: !!checked })}
                />
                <span className="text-sm">Auto-archive applicants that do not meet any location requirements</span>
              </label>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                7
              </div>
              <h2 className="font-semibold">Additional Details</h2>
            </div>
            <div className="p-5 space-y-5">
              {/* Hiring Manager */}
              <div className="space-y-2">
                <Label>Hiring manager</Label>
                <Select
                  value={formData.hiringManagerId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, hiringManagerId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hiring manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    {(employees || []).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The person responsible for filling this role</p>
              </div>

              {/* Followers */}
              <div className="space-y-2">
                <Label>Followers</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
                      {followers.map((id) => {
                        const emp = (employees || []).find(e => e.id === id)
                        if (!emp) return null
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="gap-1 cursor-pointer"
                            onClick={() => removeFollower(id)}
                          >
                            {emp.fullName}
                            <X className="h-3 w-3" />
                          </Badge>
                        )
                      })}
                      <Input
                        placeholder={followers.length === 0 ? "Search employees..." : ""}
                        value={followerSearch}
                        onChange={(e) => setFollowerSearch(e.target.value)}
                        className="border-0 shadow-none p-0 h-6 flex-1 min-w-[100px] focus-visible:ring-0"
                      />
                    </div>
                    {followerSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredEmployees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            className={cn(
                              'w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between',
                              followers.includes(emp.id) && 'bg-indigo-50'
                            )}
                            onClick={() => {
                              toggleFollower(emp.id)
                              setFollowerSearch('')
                            }}
                          >
                            <span className="text-sm">{emp.fullName}</span>
                            {followers.includes(emp.id) && (
                              <Check className="h-4 w-4 text-indigo-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="text-indigo-600"
                    onClick={() => {
                      // Add current user as follower - would need current user context
                    }}
                  >
                    Add me
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Followers receive email notifications of new matching candidates.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Sidebar */}
        <div className="sticky top-20">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5">
              <div className="text-xs opacity-80 mb-2">Job Preview</div>
              <div className="text-xl font-semibold">{formData.title || 'Job Title'}</div>
              <div className="text-sm opacity-90 mt-1">
                {formData.department || 'No team'} &middot; {locationSummary}
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Employment</div>
                <div className="font-medium capitalize">{formData.employmentType.replace('-', ' ')}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Priority</div>
                <Badge className={cn(
                  PRIORITIES.find(p => p.value === formData.priority)?.color || 'bg-muted'
                )}>
                  {PRIORITIES.find(p => p.value === formData.priority)?.label || 'Medium'}
                </Badge>
              </div>
              {formattedDeadline && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Deadline</div>
                  <div className="font-medium text-sm">{formattedDeadline}</div>
                </div>
              )}
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Hires</div>
                <div className="font-medium text-sm">{hiresCountDisplay}</div>
              </div>
              {(formData.salaryMin || formData.salaryMax) && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Salary</div>
                  <div className="font-medium text-sm">
                    {formData.salaryMin && formData.salaryMax
                      ? `${formData.salaryCurrency} ${Number(formData.salaryMin).toLocaleString()}-${Number(formData.salaryMax).toLocaleString()} ${formData.salaryFrequency}`
                      : formData.salaryMin
                        ? `${formData.salaryCurrency} ${Number(formData.salaryMin).toLocaleString()}+ ${formData.salaryFrequency}`
                        : `Up to ${formData.salaryCurrency} ${Number(formData.salaryMax).toLocaleString()} ${formData.salaryFrequency}`
                    }
                  </div>
                </div>
              )}
              {(formData.equityMin || formData.equityMax) && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Equity</div>
                  <div className="font-medium text-sm">
                    {formData.equityMin && formData.equityMax
                      ? `${formData.equityMin}% - ${formData.equityMax}%`
                      : formData.equityMin
                        ? `${formData.equityMin}%+`
                        : `Up to ${formData.equityMax}%`
                    }
                  </div>
                </div>
              )}
              {officeLocations.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Locations</div>
                  <div className="flex flex-wrap gap-1">
                    {officeLocations.map((loc) => (
                      <Badge key={loc} variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {loc}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedJD && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Job Description</div>
                  <div className="font-medium">{selectedJD.name}</div>
                </div>
              )}
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Interview Flow</div>
                <div className="font-medium">{selectedFlowData?.name}</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {selectedFlowData?.stages.map((stage, i) => (
                    <span key={i} className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {stage}
                      </Badge>
                      {i < (selectedFlowData?.stages.length || 0) - 1 && (
                        <span className="text-muted-foreground/60">&rarr;</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              {selectedCompetencyNames.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Key Competencies</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCompetencyNames.map((name) => (
                      <Badge key={name} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {formData.hiringManagerId && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Hiring Manager</div>
                  <div className="font-medium text-sm">
                    {(employees || []).find(e => e.id === formData.hiringManagerId)?.fullName || 'Selected'}
                  </div>
                </div>
              )}
              {followers.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Followers</div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{followers.length} people</span>
                  </div>
                </div>
              )}
              {formData.autoArchiveLocation && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span>Auto-archive non-matching locations</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Info className="h-4 w-4" />
              <span className="font-medium text-sm">BlueAI-Ready</span>
            </div>
            <p className="text-sm text-foreground/80">
              Once created, BlueAI will use this job profile to score candidates and generate personalized interview questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
