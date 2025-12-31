'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import {
  Briefcase,
  Building2,
  MapPin,
  CheckCircle,
  Loader2,
  Upload,
  AlertCircle,
  DollarSign,
  Clock,
  Users,
  FileText,
  UserPlus,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// Format salary for display
function formatSalary(min?: number | null, max?: number | null, currency?: string | null) {
  if (!min && !max) return null
  const curr = currency || 'USD'
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: curr,
    maximumFractionDigits: 0,
  })
  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`
  }
  if (min) return `${formatter.format(min)}+`
  if (max) return `Up to ${formatter.format(max)}`
  return null
}

// Format employment type
function formatEmploymentType(type: string) {
  const types: Record<string, string> = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'contract': 'Contract',
    'internship': 'Internship',
  }
  return types[type] || type
}

// Get stage badge color
function getStageBadgeColor(stage: string) {
  const colors: Record<string, string> = {
    APPLIED: 'bg-blue-100 text-blue-800',
    HR_SCREEN: 'bg-indigo-100 text-indigo-800',
    TECHNICAL: 'bg-purple-100 text-purple-800',
    PANEL: 'bg-violet-100 text-violet-800',
    TRIAL: 'bg-amber-100 text-amber-800',
    CEO_CHAT: 'bg-orange-100 text-orange-800',
    OFFER: 'bg-green-100 text-green-800',
    HIRED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-800',
    WITHDRAWN: 'bg-muted text-foreground',
  }
  return colors[stage] || 'bg-muted text-foreground'
}

// Format stage name
function formatStageName(stage: string) {
  const names: Record<string, string> = {
    APPLIED: 'Applied',
    HR_SCREEN: 'HR Screen',
    TECHNICAL: 'Technical',
    PANEL: 'Panel Interview',
    TRIAL: 'Trial',
    CEO_CHAT: 'CEO Chat',
    OFFER: 'Offer Stage',
    HIRED: 'Hired',
    REJECTED: 'Rejected',
    WITHDRAWN: 'Withdrawn',
  }
  return names[stage] || stage
}

export default function RecruiterPortalPage() {
  const params = useParams()
  const token = params.token as string
  const [activeTab, setActiveTab] = useState('job')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    bio: '',
    notes: '',
    resumeUrl: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch portal data
  const { data: portal, isLoading, error } = trpc.recruiter.getPortalByToken.useQuery(
    { token },
    { enabled: !!token }
  )

  // Fetch candidates
  const { data: candidates, refetch: refetchCandidates } = trpc.recruiter.getCandidatesByToken.useQuery(
    { token },
    { enabled: !!token }
  )

  // Submit candidate mutation
  const submitCandidate = trpc.recruiter.submitCandidate.useMutation({
    onSuccess: () => {
      setSubmitSuccess(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        linkedinUrl: '',
        bio: '',
        notes: '',
        resumeUrl: '',
      })
      refetchCandidates()
      setTimeout(() => {
        setActiveTab('candidates')
        setSubmitSuccess(false)
      }, 2000)
    },
    onError: (err) => {
      setErrors({ submit: err.message })
    },
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await submitCandidate.mutateAsync({
        token,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        bio: formData.bio || undefined,
        notes: formData.notes || undefined,
        resumeUrl: formData.resumeUrl || undefined,
      })
    } catch {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  // Error state
  if (error || !portal) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-foreground/80 mb-6">
              {error?.message || 'This recruiter portal link is invalid or has expired.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { recruiter, job } = portal
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)
  const locations = (job.locations as string[]) || []

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-purple-200 text-sm mb-2">
            <Building2 className="h-4 w-4" />
            <span>Recruiter Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{job.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm">
            {job.department && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span>{job.department}</span>
              </div>
            )}
            {locations.length > 0 && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{locations.join(', ')}</span>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-purple-400/30 text-purple-100 text-sm">
            Welcome back, <strong>{recruiter.name}</strong>
            {recruiter.organizationName && (
              <span className="text-purple-200"> from {recruiter.organizationName}</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="job" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Job Details</span>
              <span className="sm:hidden">Job</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Submit Candidate</span>
              <span className="sm:hidden">Submit</span>
            </TabsTrigger>
            <TabsTrigger value="candidates" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">My Candidates</span>
              <span className="sm:hidden">Candidates</span>
              {candidates && candidates.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {candidates.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Job Details Tab */}
          <TabsContent value="job">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>About This Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {job.jobDescription?.content ? (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: job.jobDescription.content }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No description available.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Quick Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {job.department && (
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Users className="h-4 w-4" />
                        <span>{job.department}</span>
                      </div>
                    )}
                    {job.employmentType && (
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Clock className="h-4 w-4" />
                        <span>{formatEmploymentType(job.employmentType)}</span>
                      </div>
                    )}
                    {locations.length > 0 && (
                      <div className="flex items-center gap-2 text-foreground/80">
                        <MapPin className="h-4 w-4" />
                        <span>{locations.join(', ')}</span>
                      </div>
                    )}
                    {salary && (
                      <div className="flex items-center gap-2 text-foreground/80">
                        <DollarSign className="h-4 w-4" />
                        <span>{salary}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-4">
                    <p className="text-sm text-purple-800">
                      As an external recruiter, you can submit candidates for this role.
                      Your candidates will appear in the &quot;My Candidates&quot; tab where you can track their progress.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Submit Candidate Tab */}
          <TabsContent value="upload">
            {submitSuccess ? (
              <Card className="max-w-2xl mx-auto text-center">
                <CardContent className="pt-10 pb-10">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Candidate Submitted!</h2>
                  <p className="text-foreground/80">
                    The candidate has been added to the pipeline. Redirecting to your candidates...
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Submit a Candidate</CardTitle>
                  <CardDescription>
                    Enter the candidate&apos;s details below. Fields marked with * are required.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className={cn(errors.name && 'border-red-500')}
                        />
                        {errors.name && (
                          <p className="text-red-500 text-sm">{errors.name}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Email Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={cn(errors.email && 'border-red-500')}
                        />
                        {errors.email && (
                          <p className="text-red-500 text-sm">{errors.email}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+234 XXX XXX XXXX"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
                        <Input
                          id="linkedin"
                          type="url"
                          placeholder="https://linkedin.com/in/profile"
                          value={formData.linkedinUrl}
                          onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Brief Bio / Background</Label>
                      <Textarea
                        id="bio"
                        placeholder="Brief overview of the candidate's background and experience..."
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Your Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Why do you think this candidate is a good fit? Any relevant context..."
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Resume/CV (Optional)</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-purple-400 transition-colors cursor-pointer bg-muted/50">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-foreground/80">
                          Drag and drop a resume or <span className="text-purple-600">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, DOC, or DOCX (max 5MB)
                        </p>
                      </div>
                    </div>

                    {errors.submit && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{errors.submit}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Submit Candidate
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* My Candidates Tab */}
          <TabsContent value="candidates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Your Submitted Candidates</span>
                  {candidates && candidates.length > 0 && (
                    <Badge variant="secondary">{candidates.length} total</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Track the progress of candidates you&apos;ve submitted for this role.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!candidates || candidates.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No candidates yet</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven&apos;t submitted any candidates for this position.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('upload')}
                      className="border-purple-600 text-purple-600 hover:bg-purple-50"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Submit Your First Candidate
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-700 font-medium">
                                {candidate.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground">{candidate.name}</h4>
                              <p className="text-sm text-muted-foreground">{candidate.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {candidate.score !== null && (
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-muted-foreground">Score</p>
                              <p className="font-medium">{candidate.score}%</p>
                            </div>
                          )}
                          <Badge className={getStageBadgeColor(candidate.stage)}>
                            {formatStageName(candidate.stage)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-8">
        <p>
          Need help? Contact us at{' '}
          <a href="mailto:recruiting@curacel.co" className="text-purple-600 hover:underline">
            recruiting@curacel.co
          </a>
        </p>
      </div>
    </div>
  )
}
