'use client'

import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
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
  ArrowLeft,
  X,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import Link from 'next/link'

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

export default function PublicCareersPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const jobId = params.id as string
  const isPreview = searchParams.get('preview') === 'true'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    bio: '',
    coverLetter: '',
    resumeUrl: '',
    inboundChannel: 'PEOPLEOS',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  // Fetch job details (preview mode bypasses isPublic check)
  const { data: job, isLoading, error } = trpc.job.getPublicJob.useQuery(
    { id: jobId, preview: isPreview },
    { enabled: !!jobId }
  )

  // Submit application mutation
  const submitApplication = trpc.job.submitApplication.useMutation({
    onSuccess: () => {
      setIsSubmitted(true)
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

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, resume: 'Please upload a PDF, DOC, or DOCX file' }))
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, resume: 'File size must be less than 5MB' }))
      return
    }

    setIsUploading(true)
    setErrors(prev => ({ ...prev, resume: '' }))

    try {
      // For now, convert to base64 data URL (temporary solution)
      // TODO: Replace with actual file upload to storage service
      const reader = new FileReader()
      reader.onload = () => {
        setFormData(prev => ({ ...prev, resumeUrl: reader.result as string }))
        setUploadedFile(file)
        setIsUploading(false)
      }
      reader.onerror = () => {
        setErrors(prev => ({ ...prev, resume: 'Failed to read file' }))
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setErrors(prev => ({ ...prev, resume: 'Failed to upload file' }))
      setIsUploading(false)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setFormData(prev => ({ ...prev, resumeUrl: '' }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }
    if (!formData.coverLetter.trim()) newErrors.coverLetter = 'Please tell us why you want to apply'
    if (!consentChecked) newErrors.consent = 'You must agree to the data processing terms'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await submitApplication.mutateAsync({
        jobId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        bio: formData.bio || undefined,
        coverLetter: formData.coverLetter,
        resumeUrl: formData.resumeUrl || undefined,
        inboundChannel: formData.inboundChannel as 'YC' | 'PEOPLEOS' | 'COMPANY_SITE' | 'OTHER',
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
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  // Error state
  if (error || !job) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Job Not Found</h1>
            <p className="text-foreground/80 mb-6">
              This job posting may have been removed or is no longer available.
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
            <p className="text-foreground/80 mb-6">
              Thank you for your interest in the {job.title} position at Curacel.
              We have received your application and will review it shortly.
            </p>
            <p className="text-sm text-muted-foreground">
              You will receive a confirmation email at {formData.email}.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)
  const locations = (job.locations as string[]) || []

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center gap-2 text-indigo-200 text-sm mb-4">
            <Building2 className="h-4 w-4" />
            <span>Curacel</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{job.title}</h1>
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
            <Badge className="bg-card/20 hover:bg-card/30 text-white border-0">
              {formatEmploymentType(job.employmentType)}
            </Badge>
          </div>
          {salary && (
            <div className="mt-4 flex items-center gap-2 text-indigo-100">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">{salary}</span>
              {job.salaryFrequency && (
                <span className="text-indigo-200">/ {job.salaryFrequency}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Job Description */}
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

          {/* Quick Info Sidebar */}
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
          </div>
        </div>

        {/* Application Form */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Apply for this position</CardTitle>
            <CardDescription>
              Fill out the form below to submit your application. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Name */}
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

                {/* Email */}
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

                {/* Phone */}
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

                {/* LinkedIn */}
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={formData.linkedinUrl}
                    onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Brief Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us a bit about yourself, your background, and experience..."
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* Cover Letter */}
              <div className="space-y-2">
                <Label htmlFor="coverLetter">
                  Why are you applying? <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Tell us why you're interested in this role and what makes you a great fit..."
                  value={formData.coverLetter}
                  onChange={(e) => handleInputChange('coverLetter', e.target.value)}
                  className={cn('min-h-[150px]', errors.coverLetter && 'border-red-500')}
                />
                {errors.coverLetter && (
                  <p className="text-red-500 text-sm">{errors.coverLetter}</p>
                )}
              </div>

              {/* How did you hear about us */}
              <div className="space-y-2">
                <Label htmlFor="channel">How did you hear about this opportunity?</Label>
                <Select
                  value={formData.inboundChannel}
                  onValueChange={(value) => handleInputChange('inboundChannel', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YC">Y Combinator</SelectItem>
                    <SelectItem value="PEOPLEOS">PeopleOS Careers Page</SelectItem>
                    <SelectItem value="COMPANY_SITE">Company Website</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resume Upload */}
              <div className="space-y-2">
                <Label>Resume/CV (Optional)</Label>
                {uploadedFile ? (
                  <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                      isDragging ? "border-indigo-600 bg-indigo-50" : "hover:border-indigo-400 bg-muted/50",
                      isUploading && "opacity-50 cursor-not-allowed"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('resume-upload')?.click()}
                  >
                    <input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleFileInput}
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <>
                        <Loader2 className="h-8 w-8 mx-auto mb-2 text-indigo-600 animate-spin" />
                        <p className="text-sm text-foreground/80">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-foreground/80">
                          Drag and drop your resume or <span className="text-indigo-600">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, DOC, or DOCX (max 5MB)
                        </p>
                      </>
                    )}
                  </div>
                )}
                {errors.resume && (
                  <p className="text-red-500 text-sm">{errors.resume}</p>
                )}
              </div>

              {/* Consent */}
              <div className="flex items-start space-x-2 pt-4">
                <Checkbox
                  id="consent"
                  checked={consentChecked}
                  onCheckedChange={(checked) => {
                    setConsentChecked(checked === true)
                    if (errors.consent) setErrors(prev => ({ ...prev, consent: '' }))
                  }}
                />
                <Label htmlFor="consent" className="font-normal text-sm leading-relaxed cursor-pointer">
                  I agree to the processing of my personal data for recruitment purposes.
                  I understand that my information will be stored securely and used only
                  for evaluating my application. <span className="text-red-500">*</span>
                </Label>
              </div>
              {errors.consent && (
                <p className="text-red-500 text-sm">{errors.consent}</p>
              )}

              {/* Submit Error */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{errors.submit}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground mt-8 pb-8">
          <p>By submitting this form, you agree to our privacy policy.</p>
          <p className="mt-2">
            Having trouble? Contact us at{' '}
            <a href="mailto:careers@curacel.co" className="text-indigo-600 hover:underline">
              careers@curacel.co
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
