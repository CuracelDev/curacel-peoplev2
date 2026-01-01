'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  Users,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function EditJobPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const { data: job, isLoading: jobLoading } = trpc.job.get.useQuery({ id: jobId })
  const { data: teams } = trpc.team.listForSelect.useQuery()
  const { data: jobDescriptions } = trpc.jobDescription.listForSelect.useQuery()
  const { data: competencies } = trpc.competency.listForSelect.useQuery()
  const { data: employees } = trpc.employee.getAllActive.useQuery()
  const updateJob = trpc.job.update.useMutation()

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    employmentType: 'full-time',
    status: 'DRAFT',
    priority: '3',
    jdId: '',
    deadline: '',
    hiresCount: '1',
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
  const [saveState, setSaveState] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Use tRPC for hiring flows instead of localStorage
  const { data: hiringFlows } = trpc.hiringFlow.list.useQuery()
  const flows = hiringFlows ?? []

  // Initialize form with job data
  useEffect(() => {
    if (job && !initialized) {
      setFormData({
        title: job.title || '',
        department: job.department || '',
        employmentType: job.employmentType || 'full-time',
        status: job.status || 'DRAFT',
        priority: String(job.priority || 3),
        jdId: job.jobDescriptionId || '',
        deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
        hiresCount: String(job.hiresCount || 1),
        salaryMin: job.salaryMin ? String(job.salaryMin) : '',
        salaryMax: job.salaryMax ? String(job.salaryMax) : '',
        salaryCurrency: job.salaryCurrency || 'USD',
        salaryFrequency: job.salaryFrequency || 'annually',
        equityMin: job.equityMin ? String(job.equityMin) : '',
        equityMax: job.equityMax ? String(job.equityMax) : '',
        autoArchiveLocation: job.autoArchiveLocation || false,
        hiringManagerId: job.hiringManagerId || '',
      })
      setOfficeLocations(Array.isArray(job.locations) ? job.locations as string[] : [])
      setFollowers(job.followers?.map(f => f.employeeId) || [])
      setSelectedCompetencies(job.competencies?.map(c => c.competencyId) || [])
      if (job.hiringFlowId) setSelectedFlow(job.hiringFlowId)
      setInitialized(true)
    }
  }, [job, initialized])

  useEffect(() => {
    if (!flows.length) return
    if (!selectedFlow || !flows.some((flow) => flow.id === selectedFlow)) {
      setSelectedFlow(flows[0].id)
    }
  }, [flows, selectedFlow])

  const selectedFlowData = flows.find((flow) => flow.id === selectedFlow) ?? flows[0]
  const selectedJD = (jobDescriptions || []).find(jd => jd.id === formData.jdId)

  const filteredCompetencies = useMemo(() => {
    const allCompetencies = competencies || []
    if (!competencySearch.trim()) return allCompetencies
    return allCompetencies.filter(c =>
      c.name.toLowerCase().includes(competencySearch.toLowerCase()) ||
      c.category.toLowerCase().includes(competencySearch.toLowerCase())
    )
  }, [competencies, competencySearch])

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
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
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
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const removeFollower = (id: string) => {
    setFollowers((prev) => prev.filter((f) => f !== id))
  }

  const handleSave = async () => {
    setSaveState(null)
    setIsSaving(true)

    if (!formData.title.trim()) {
      setSaveState({ type: 'error', message: 'Job title is required.' })
      setIsSaving(false)
      return
    }

    try {
      await updateJob.mutateAsync({
        id: jobId,
        title: formData.title.trim(),
        department: formData.department || null,
        employmentType: formData.employmentType,
        status: formData.status as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'HIRED',
        priority: Number(formData.priority),
        deadline: formData.deadline || null,
        hiresCount: Number(formData.hiresCount) || 1,
        salaryMin: formData.salaryMin ? Number(formData.salaryMin) : null,
        salaryMax: formData.salaryMax ? Number(formData.salaryMax) : null,
        salaryCurrency: formData.salaryCurrency || null,
        salaryFrequency: formData.salaryFrequency || null,
        equityMin: formData.equityMin ? Number(formData.equityMin) : null,
        equityMax: formData.equityMax ? Number(formData.equityMax) : null,
        locations: officeLocations,
        hiringFlowId: selectedFlow || null,
        jobDescriptionId: formData.jdId || null,
        hiringManagerId: formData.hiringManagerId || null,
        autoArchiveLocation: formData.autoArchiveLocation,
        followerIds: followers,
        competencyIds: selectedCompetencies,
      })

      setSaveState({ type: 'success', message: 'Job updated successfully.' })
      setTimeout(() => {
        router.push(`/recruiting/positions/${jobId}/candidates`)
      }, 1000)
    } catch (error) {
      setSaveState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update job.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const locationSummary = officeLocations.length === 0
    ? 'Location TBD'
    : officeLocations.length === 1
      ? officeLocations[0]
      : `${officeLocations.length} locations`

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-foreground">Job not found</h2>
        <Link href="/hiring/positions">
          <Button className="mt-4">Back to Jobs</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Action Bar */}
      <div className="flex justify-end gap-3 mb-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
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
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">1</div>
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
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="HIRED">Hired</SelectItem>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
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
                            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', p.color)}>{p.value}</span>
                            {p.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Number of Hires</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.hiresCount}
                  onChange={(e) => setFormData({ ...formData, hiresCount: e.target.value })}
                  className="w-32"
                />
              </div>

              {/* Locations */}
              <div className="space-y-3">
                <Label>Location</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {officeLocations.map((loc) => (
                    <Badge key={loc} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeLocation(loc)}>
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
                    onBlur={() => window.setTimeout(() => setLocationDropdownOpen(false), 150)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && locationSearch.trim()) {
                        e.preventDefault()
                        toggleLocation(locationSearch)
                        setLocationSearch('')
                      }
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
                            officeLocations.some((s) => s.toLowerCase() === loc.value.toLowerCase()) && 'bg-indigo-50'
                          )}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { toggleLocation(loc.value); setLocationSearch(''); setLocationDropdownOpen(false) }}
                        >
                          <span className="text-sm">{loc.label}</span>
                          {officeLocations.some((s) => s.toLowerCase() === loc.value.toLowerCase()) && <Check className="h-4 w-4 text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Salary and Equity */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">2</div>
              <h2 className="font-semibold">Salary and Equity</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Pay range</Label>
                <div className="flex items-center gap-3">
                  <Input type="number" placeholder="Min" value={formData.salaryMin} onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })} className="w-28" />
                  <span>-</span>
                  <Input type="number" placeholder="Max" value={formData.salaryMax} onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })} className="w-28" />
                  <Select value={formData.salaryCurrency} onValueChange={(v) => setFormData({ ...formData, salaryCurrency: v })}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={formData.salaryFrequency} onValueChange={(v) => setFormData({ ...formData, salaryFrequency: v })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAY_FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Equity range (%)</Label>
                <div className="flex items-center gap-3">
                  <Input type="number" step="0.01" placeholder="Min" value={formData.equityMin} onChange={(e) => setFormData({ ...formData, equityMin: e.target.value })} className="w-28" />
                  <span>-</span>
                  <Input type="number" step="0.01" placeholder="Max" value={formData.equityMax} onChange={(e) => setFormData({ ...formData, equityMax: e.target.value })} className="w-28" />
                </div>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">3</div>
              <h2 className="font-semibold">Job Description</h2>
            </div>
            <div className="p-5">
              <Select value={formData.jdId || 'none'} onValueChange={(v) => setFormData({ ...formData, jdId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select a job description" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No JD selected</SelectItem>
                  {(jobDescriptions || []).map((jd) => <SelectItem key={jd.id} value={jd.id}>{jd.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Competencies */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">4</div>
              <h2 className="font-semibold">Role Competencies</h2>
            </div>
            <div className="p-5">
              {selectedCompetencies.length > 0 && (
                <div className="mb-4">
                  <Label className="mb-2 block">Selected ({selectedCompetencies.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompetencies.map((id) => {
                      const comp = (competencies || []).find(c => c.id === id)
                      if (!comp) return null
                      return (
                        <Badge key={id} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer gap-1" onClick={() => removeCompetency(id)}>
                          {comp.name}
                          <X className="h-3 w-3" />
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search competencies..." value={competencySearch} onChange={(e) => setCompetencySearch(e.target.value)} className="pl-10" />
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {filteredCompetencies.map((comp) => (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => toggleCompetency(comp.id)}
                    className={cn(
                      'flex items-center gap-2 p-3 border rounded-lg transition-all text-left',
                      selectedCompetencies.includes(comp.id) ? 'border-indigo-500 bg-indigo-50/50' : 'border-border hover:border-border'
                    )}
                  >
                    <div className={cn('w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0', selectedCompetencies.includes(comp.id) ? 'bg-indigo-600 text-white' : 'border-2 border-border')}>
                      {selectedCompetencies.includes(comp.id) && <Check className="h-3 w-3" />}
                    </div>
                    <span className="text-sm font-medium">{comp.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">5</div>
              <h2 className="font-semibold">Additional Details</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <Label>Hiring manager</Label>
                <Select value={formData.hiringManagerId || 'none'} onValueChange={(v) => setFormData({ ...formData, hiringManagerId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select hiring manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    {(employees || []).map((emp) => <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Followers</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
                  {followers.map((id) => {
                    const emp = (employees || []).find(e => e.id === id)
                    if (!emp) return null
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeFollower(id)}>
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
                  <div className="bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredEmployees.map((emp) => (
                      <button key={emp.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted" onClick={() => { toggleFollower(emp.id); setFollowerSearch('') }}>
                        {emp.fullName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={formData.autoArchiveLocation} onCheckedChange={(c) => setFormData({ ...formData, autoArchiveLocation: !!c })} />
                <span className="text-sm">Auto-archive applicants that do not meet location requirements</span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview Sidebar */}
        <div className="sticky top-20">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5">
              <div className="text-xs opacity-80 mb-2">Job Preview</div>
              <div className="text-xl font-semibold">{formData.title || 'Job Title'}</div>
              <div className="text-sm opacity-90 mt-1">{formData.department || 'No team'} &middot; {locationSummary}</div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Status</div>
                <Badge className={cn(
                  formData.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                  formData.status === 'PAUSED' ? 'bg-orange-100 text-orange-700' :
                  formData.status === 'HIRED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                )}>{formData.status}</Badge>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Employment</div>
                <div className="font-medium capitalize">{formData.employmentType.replace('-', ' ')}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Priority</div>
                <Badge className={PRIORITIES.find(p => p.value === formData.priority)?.color || 'bg-muted'}>
                  {PRIORITIES.find(p => p.value === formData.priority)?.label || 'Medium'}
                </Badge>
              </div>
              {formData.deadline && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Deadline</div>
                  <div className="font-medium text-sm">{new Date(formData.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              )}
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Hires</div>
                <div className="font-medium text-sm">{formData.hiresCount || 1}</div>
              </div>
              {(formData.salaryMin || formData.salaryMax) && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Salary</div>
                  <div className="font-medium text-sm">
                    {formData.salaryCurrency} {formData.salaryMin && Number(formData.salaryMin).toLocaleString()}{formData.salaryMin && formData.salaryMax && ' - '}{formData.salaryMax && Number(formData.salaryMax).toLocaleString()} {formData.salaryFrequency}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
