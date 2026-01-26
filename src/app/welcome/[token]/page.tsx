'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, User, CheckCircle2, BookOpen, Shield, Building2, Heart, Sparkles, ChevronRight, ChevronLeft, Upload, Briefcase, Brain } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { DocumentUpload } from '@/components/ui/document-upload'
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog'
import { formatDate, getInitials, cn } from '@/lib/utils'
import { useForm } from 'react-hook-form'

// MBTI Types
const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

// Life Values with descriptions
const LIFE_VALUES = [
  { name: 'Family', description: 'To spend quality time with my family' },
  { name: 'Financial Resources', description: 'To secure the resources to support my short and long-term financial goals' },
  { name: 'Friends', description: 'To build, strengthen and preserve personal friendships' },
  { name: 'Health and Fitness', description: 'To be healthy and physically fit' },
  { name: 'Home and Place', description: 'To make my home in a location and community that supports my desired lifestyle and personal values' },
  { name: 'Leadership', description: 'To play an important role in the leadership of a group, a company, or an organization' },
  { name: 'Leisure Pursuits', description: 'To pursue hobbies, sports, and interests outside of work and family' },
  { name: 'Personal Growth', description: 'To constantly learn new things, to expand my horizons' },
  { name: 'Public Service', description: 'To make a contribution to my community or society as a whole' },
  { name: 'Spirituality', description: 'To explore and develop the spiritual side of my life' },
  { name: 'Work Satisfaction', description: 'To do work that is enjoyable and stimulating' },
]

// "What you should know about me" questions
const KNOW_ABOUT_ME_QUESTIONS = [
  'In the next 3 to 5 years I hope to...',
  'Ideally I would like to work with our startup until...',
  'The following are the biggest priorities in my life right now...',
  'I work best when...',
  'My ideal work environment is...',
  'I feel most appreciated when...',
  'I like to celebrate successes by...',
  'For fun I like to...',
  'When there is a conflict I prefer to',
  'It irritates, angers or annoys me when',
  'I am most happy when...',
  'It is important that my work includes...',
  'When I am under pressure I',
  'When I am happy',
  'When I am upset, frustrated and/or angry i',
  'When someone is giving me feedback I appreciate if...',
  'I define success as...',
  'I define failure as...',
  'Some important things you need to know about me are',
]

interface ProfileFormData {
  // Profile Photo
  profileImageUrl: string

  // Personal Details
  gender: string
  maritalStatus: string
  dateOfBirth: string
  nationality: string
  taxId: string

  // Contact & Address
  phone: string
  addressStreet: string
  addressCity: string
  addressState: string
  addressPostal: string
  addressCountry: string

  // Bank Details
  bankName: string
  accountName: string
  accountNumber: string
  accountSortCode: string

  // Emergency Contact
  emergencyContactName: string
  emergencyContactRelation: string
  emergencyContactPhone: string

  // Former Employment (full-time only)
  formerOfferLetterUrl: string
  formerLastPayslipUrl: string
  formerResignationLetterUrl: string
  formerResignationConfirmUrl: string
  formerHrContactName: string
  formerHrContactPhone: string
  formerHrContactEmail: string
  formerCompanyAddress: string
}

type Step = 'profile' | 'former-employment' | 'values' | 'personality' | 'complete'

interface PriorityHierarchy {
  mostImportant: string      // non-negotiable
  important: string           // slightly negotiable
  somewhatImportant: string  // negotiable
  notImportant: string       // highly negotiable/doesn't matter
}

export default function OnboardingSelfServicePage() {
  const params = useParams()
  const token = params.token as string
  const [saved, setSaved] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('profile')
  const [priorityHierarchy, setPriorityHierarchy] = useState<PriorityHierarchy>({
    mostImportant: '',
    important: '',
    somewhatImportant: '',
    notImportant: '',
  })
  const [knowAboutMe, setKnowAboutMe] = useState<Record<string, string>>({})
  const [mbtiType, setMbtiType] = useState<string>('')
  const [mbtiImageUrl, setMbtiImageUrl] = useState<string>('')
  const [bigFiveUrl, setBigFiveUrl] = useState<string>('')
  const [bigFiveImageUrl, setBigFiveImageUrl] = useState<string>('')
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)

  const { data: workflow, isLoading, error } = trpc.onboarding.getByToken.useQuery(token)
  const { data: companyName } = trpc.organization.getName.useQuery()
  const [uploadError, setUploadError] = useState<string | null>(null)

  const updateInfo = trpc.onboarding.updateEmployeeInfo.useMutation({
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const { register, handleSubmit, reset, setValue, watch } = useForm<ProfileFormData>({
    defaultValues: {
      profileImageUrl: '',
      gender: '',
      maritalStatus: '',
      dateOfBirth: '',
      nationality: '',
      taxId: '',
      phone: '',
      addressStreet: '',
      addressCity: '',
      addressState: '',
      addressPostal: '',
      addressCountry: '',
      bankName: '',
      accountName: '',
      accountNumber: '',
      accountSortCode: '',
      emergencyContactName: '',
      emergencyContactRelation: '',
      emergencyContactPhone: '',
      formerOfferLetterUrl: '',
      formerLastPayslipUrl: '',
      formerResignationLetterUrl: '',
      formerResignationConfirmUrl: '',
      formerHrContactName: '',
      formerHrContactPhone: '',
      formerHrContactEmail: '',
      formerCompanyAddress: '',
    },
  })

  const onSubmit = (data: ProfileFormData) => {
    updateInfo.mutate({ token, ...data })
  }

  const employee = workflow?.employee
  const profileImagePreview = watch('profileImageUrl')

  useEffect(() => {
    if (!employee) return
    reset({
      profileImageUrl: employee.profileImageUrl || '',
      gender: employee.gender || '',
      maritalStatus: employee.maritalStatus || '',
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      nationality: employee.nationality || '',
      taxId: employee.taxId || '',
      phone: employee.phone || '',
      addressStreet: employee.addressStreet || '',
      addressCity: employee.addressCity || '',
      addressState: employee.addressState || '',
      addressPostal: employee.addressPostal || '',
      addressCountry: employee.addressCountry || '',
      bankName: employee.bankName || '',
      accountName: employee.accountName || '',
      accountNumber: employee.accountNumber || '',
      accountSortCode: employee.accountSortCode || '',
      emergencyContactName: employee.emergencyContactName || '',
      emergencyContactRelation: employee.emergencyContactRelation || '',
      emergencyContactPhone: employee.emergencyContactPhone || '',
      formerOfferLetterUrl: employee.formerOfferLetterUrl || '',
      formerLastPayslipUrl: employee.formerLastPayslipUrl || '',
      formerResignationLetterUrl: employee.formerResignationLetterUrl || '',
      formerResignationConfirmUrl: employee.formerResignationConfirmUrl || '',
      formerHrContactName: employee.formerHrContactName || '',
      formerHrContactPhone: employee.formerHrContactPhone || '',
      formerHrContactEmail: employee.formerHrContactEmail || '',
      formerCompanyAddress: employee.formerCompanyAddress || '',
    })

    // Load existing values data
    if (employee.lifeValues) {
      const values = employee.lifeValues as any
      if (typeof values.mostImportant === 'string') {
        setPriorityHierarchy(values as PriorityHierarchy)
      }
    }
    if (employee.knowAboutMe) {
      const answers: Record<string, string> = {}
        ; (employee.knowAboutMe as Array<{ question: string; answer: string }>).forEach(item => {
          answers[item.question] = item.answer
        })
      setKnowAboutMe(answers)
    }

    // Load existing personality data
    if (employee.mbtiType) setMbtiType(employee.mbtiType)
    if (employee.mbtiImageUrl) setMbtiImageUrl(employee.mbtiImageUrl)
    if (employee.bigFiveUrl) setBigFiveUrl(employee.bigFiveUrl)
    if (employee.bigFiveImageUrl) setBigFiveImageUrl(employee.bigFiveImageUrl)

    // If personality is already completed, go to complete step
    if (employee.personalityCompleted) {
      setCurrentStep('complete')
    }

    setUploadError(null)
  }, [employee, reset])

  const handleProfileImage = async (file?: File) => {
    setUploadError(null)
    if (!file) {
      setValue('profileImageUrl', '')
      return
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (PNG, JPG).')
      return
    }
    const maxSizeMb = 2
    if (file.size > maxSizeMb * 1024 * 1024) {
      setUploadError(`Max file size is ${maxSizeMb}MB.`)
      return
    }
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`
    setValue('profileImageUrl', dataUrl)
  }

  const handleKnowAboutMeAnswer = (question: string, answer: string) => {
    setKnowAboutMe(prev => ({ ...prev, [question]: answer }))
  }

  const saveValues = () => {
    const answersArray = Object.entries(knowAboutMe)
      .filter(([, answer]) => answer.trim())
      .map(([question, answer]) => ({ question, answer }))

    updateInfo.mutate({
      token,
      lifeValues: priorityHierarchy,
      knowAboutMe: answersArray,
    })
  }

  const savePersonality = () => {
    updateInfo.mutate({
      token,
      mbtiType: mbtiType || undefined,
      mbtiImageUrl: mbtiImageUrl || undefined,
      bigFiveUrl: bigFiveUrl || undefined,
      bigFiveImageUrl: bigFiveImageUrl || undefined,
      personalityCompleted: true,
    })
  }

  const isFullTime = employee?.employmentType === 'FULL_TIME'

  const goToNextStep = () => {
    if (currentStep === 'profile') {
      // Full-time goes to former-employment, part-time skips to values
      setCurrentStep(isFullTime ? 'former-employment' : 'values')
    } else if (currentStep === 'former-employment') {
      setCurrentStep('values')
    } else if (currentStep === 'values') {
      setCurrentStep('personality')
    } else if (currentStep === 'personality') {
      setCurrentStep('complete')
    }
  }

  const goToPrevStep = () => {
    if (currentStep === 'values') {
      setCurrentStep(isFullTime ? 'former-employment' : 'profile')
    } else if (currentStep === 'former-employment') {
      setCurrentStep('profile')
    } else if (currentStep === 'personality') {
      setCurrentStep('values')
    } else if (currentStep === 'complete') {
      setCurrentStep('personality')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !workflow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Link Invalid or Expired</CardTitle>
            <CardDescription>
              This onboarding link is no longer valid. Please contact HR for assistance.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!employee) {
    return null
  }

  const steps = isFullTime
    ? [
      { id: 'profile', label: 'Personal Details', icon: User },
      { id: 'former-employment', label: 'Former Employment', icon: Briefcase },
      { id: 'values', label: 'Values', icon: Heart },
      { id: 'personality', label: 'Personality', icon: Brain },
      { id: 'complete', label: 'Complete', icon: CheckCircle2 },
    ]
    : [
      { id: 'profile', label: 'Personal Details', icon: User },
      { id: 'values', label: 'Values', icon: Heart },
      { id: 'personality', label: 'Personality', icon: Brain },
      { id: 'complete', label: 'Complete', icon: CheckCircle2 },
    ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to {companyName || process.env.NEXT_PUBLIC_COMPANY_NAME || 'Curacel'}!
          </h1>
          <p className="text-foreground/80 mt-2">
            Complete your onboarding to get started, {employee.fullName.split(' ')[0]}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = index < currentStepIndex
              const isClickable = isCompleted || isActive
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => isClickable && setCurrentStep(step.id as Step)}
                    disabled={!isClickable}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all',
                      isActive && 'bg-primary text-primary-foreground',
                      isCompleted && 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer',
                      !isActive && !isCompleted && 'bg-muted text-muted-foreground cursor-not-allowed'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60 mx-1" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 'profile' && (
          <>
            {/* Welcome Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">
                        {employee.startDate ? formatDate(employee.startDate) : 'To be confirmed'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="font-medium">{employee.department || 'TBD'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Job Title</p>
                      <p className="font-medium">{employee.jobTitle || 'TBD'}</p>
                    </div>
                  </div>
                  {employee.manager && (
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Manager</p>
                        <p className="font-medium">{employee.manager.fullName}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Profile Form */}
            <Card>
              <CardHeader>
                <CardTitle>Complete Your Profile</CardTitle>
                <CardDescription>
                  Please provide the following information to complete your onboarding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <input type="hidden" {...register('profileImageUrl')} />

                  {/* Profile Photo */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Profile Photo</h3>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={profileImagePreview || ''} alt={employee.fullName} />
                          <AvatarFallback className="text-sm">
                            {getInitials(employee.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleProfileImage(e.target.files?.[0])}
                            className="hidden"
                            id="profile-photo-upload"
                          />
                          <label htmlFor="profile-photo-upload">
                            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('profile-photo-upload')?.click()}>
                              {profileImagePreview ? 'Change Photo' : 'Upload Photo'}
                            </Button>
                          </label>
                          {uploadError && (
                            <p className="text-sm text-destructive">{uploadError}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Personal Details */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Personal Details</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <Select
                          value={watch('gender')}
                          onValueChange={(value) => setValue('gender', value)}
                        >
                          <SelectTrigger id="gender">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Non-binary">Non-binary</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="maritalStatus">Marital Status</Label>
                        <Select
                          value={watch('maritalStatus')}
                          onValueChange={(value) => setValue('maritalStatus', value)}
                        >
                          <SelectTrigger id="maritalStatus">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Married">Married</SelectItem>
                            <SelectItem value="Divorced">Divorced</SelectItem>
                            <SelectItem value="Widowed">Widowed</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          {...register('dateOfBirth')}
                        />
                      </div>

                      <div>
                        <Label htmlFor="nationality">Nationality</Label>
                        <Input
                          id="nationality"
                          {...register('nationality')}
                          placeholder="e.g., Nigerian"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="taxId">Tax ID / National ID Number</Label>
                        <Input
                          id="taxId"
                          {...register('taxId')}
                          placeholder="e.g., TIN or National ID"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Contact & Phone */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          {...register('phone')}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Address */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Home Address</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Label htmlFor="addressStreet">Street Address</Label>
                        <Input
                          id="addressStreet"
                          {...register('addressStreet')}
                          placeholder="123 Main St"
                        />
                      </div>
                      <div>
                        <Label htmlFor="addressCity">City</Label>
                        <Input
                          id="addressCity"
                          {...register('addressCity')}
                          placeholder="San Francisco"
                        />
                      </div>
                      <div>
                        <Label htmlFor="addressState">State/Province</Label>
                        <Input
                          id="addressState"
                          {...register('addressState')}
                          placeholder="CA"
                        />
                      </div>
                      <div>
                        <Label htmlFor="addressPostal">Postal Code</Label>
                        <Input
                          id="addressPostal"
                          {...register('addressPostal')}
                          placeholder="94102"
                        />
                      </div>
                      <div>
                        <Label htmlFor="addressCountry">Country</Label>
                        <Input
                          id="addressCountry"
                          {...register('addressCountry')}
                          placeholder="United States"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Bank Details</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          {...register('bankName')}
                          placeholder="Bank name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="accountName">Account Name</Label>
                        <Input
                          id="accountName"
                          {...register('accountName')}
                          placeholder="Account name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          {...register('accountNumber')}
                          placeholder="Account number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="accountSortCode">Sort Code</Label>
                        <Input
                          id="accountSortCode"
                          {...register('accountSortCode')}
                          placeholder="Sort code"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Emergency Contact */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Emergency Contact</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Label htmlFor="emergencyContactName">Contact Name</Label>
                        <Input
                          id="emergencyContactName"
                          {...register('emergencyContactName')}
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyContactRelation">Relationship</Label>
                        <Input
                          id="emergencyContactRelation"
                          {...register('emergencyContactRelation')}
                          placeholder="Spouse"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyContactPhone">Phone Number</Label>
                        <Input
                          id="emergencyContactPhone"
                          type="tel"
                          {...register('emergencyContactPhone')}
                          placeholder="+1 (555) 987-6543"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" onClick={goToNextStep}>
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                      {saved && (
                        <div className="flex items-center gap-2 text-primary text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Saved!</span>
                        </div>
                      )}
                    </div>
                    <Button type="submit" disabled={updateInfo.isPending}>
                      {updateInfo.isPending ? 'Saving...' : 'Save & Continue'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {currentStep === 'former-employment' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Former Employment
              </CardTitle>
              <CardDescription>
                Please provide documentation and referencing details from your previous employer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Document Uploads */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Document Uploads</h3>
                  <p className="text-sm text-foreground/80 mb-4">
                    Upload or provide links to the following documents from your previous employer
                  </p>
                  <div className="space-y-4">
                    <DocumentUpload
                      label="Offer Letter from Previous Employer"
                      helpText="Upload a PDF/image or paste a link to your offer letter"
                      value={watch('formerOfferLetterUrl')}
                      onChange={(url) => setValue('formerOfferLetterUrl', url)}
                    />

                    <DocumentUpload
                      label="Last Payslip"
                      helpText="Upload a PDF/image or paste a link to your last payslip"
                      value={watch('formerLastPayslipUrl')}
                      onChange={(url) => setValue('formerLastPayslipUrl', url)}
                    />

                    <DocumentUpload
                      label="Letter of Resignation"
                      helpText="Upload a PDF/image or paste a link to your resignation letter"
                      value={watch('formerResignationLetterUrl')}
                      onChange={(url) => setValue('formerResignationLetterUrl', url)}
                    />

                    <DocumentUpload
                      label="Resignation Confirmation Letter (on company letterhead)"
                      helpText="Upload a PDF/image or paste a link to the resignation confirmation from your employer"
                      value={watch('formerResignationConfirmUrl')}
                      onChange={(url) => setValue('formerResignationConfirmUrl', url)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Employment Referencing */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Employment Referencing</h3>
                  <p className="text-sm text-foreground/80 mb-4">
                    Please provide contact details for your HR department or manager for employment verification
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label htmlFor="formerHrContactName">Full Name of HR Contact</Label>
                      <Input
                        id="formerHrContactName"
                        {...register('formerHrContactName')}
                        placeholder="e.g., Jane Smith"
                      />
                    </div>

                    <div>
                      <Label htmlFor="formerHrContactPhone">Phone Number of HR Contact</Label>
                      <Input
                        id="formerHrContactPhone"
                        type="tel"
                        {...register('formerHrContactPhone')}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div>
                      <Label htmlFor="formerHrContactEmail">Email Address of HR Contact</Label>
                      <Input
                        id="formerHrContactEmail"
                        type="email"
                        {...register('formerHrContactEmail')}
                        placeholder="hr@company.com"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="formerCompanyAddress">Company Address</Label>
                      <Textarea
                        id="formerCompanyAddress"
                        {...register('formerCompanyAddress')}
                        placeholder="Full company address including street, city, state, and postal code"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" onClick={goToPrevStep}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button type="button" variant="outline" onClick={goToNextStep}>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                    {saved && (
                      <div className="flex items-center gap-2 text-primary text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Saved!</span>
                      </div>
                    )}
                  </div>
                  <Button type="submit">
                    Save & Continue
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {currentStep === 'values' && (
          <Card className="max-w-[70vw] mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Values
              </CardTitle>
              <CardDescription>
                Share your values and what's important to you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Section 1: What you should know about me */}
              <div>
                <h3 className="text-lg font-semibold mb-4">What You Should Know About Me</h3>
                <p className="text-sm text-foreground/80 mb-4">
                  Help your teammates understand how you work best. Answer as many or as few as you'd like.
                </p>
                <div className="space-y-6">
                  {KNOW_ABOUT_ME_QUESTIONS.map((question, index) => (
                    <div key={index}>
                      <Label className="text-sm font-medium">{question}</Label>
                      <Textarea
                        value={knowAboutMe[question] || ''}
                        onChange={(e) => handleKnowAboutMeAnswer(question, e.target.value)}
                        placeholder="Your answer..."
                        className="mt-2"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Section 2: Priority Hierarchy */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Priority Hierarchy</h3>
                <p className="text-sm text-foreground/80 mb-4">
                  Organize your life values by priority in each of the four boxes below.
                </p>

                {/* Priority Matrix - 2x2 Grid with Text Boxes */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Most Important (non-negotiable) */}
                  <div>
                    <Label htmlFor="mostImportant" className="text-sm font-semibold text-primary">
                      Most important (non-negotiable)
                    </Label>
                    <Textarea
                      id="mostImportant"
                      value={priorityHierarchy.mostImportant}
                      onChange={(e) => setPriorityHierarchy(prev => ({ ...prev, mostImportant: e.target.value }))}
                      placeholder="e.g., Family, Health and Fitness, Personal Growth..."
                      className="mt-2 min-h-[120px]"
                      rows={5}
                    />
                  </div>

                  {/* Important (slightly negotiable) */}
                  <div>
                    <Label htmlFor="important" className="text-sm font-semibold text-blue-700">
                      Important (slightly negotiable)
                    </Label>
                    <Textarea
                      id="important"
                      value={priorityHierarchy.important}
                      onChange={(e) => setPriorityHierarchy(prev => ({ ...prev, important: e.target.value }))}
                      placeholder="e.g., Work Satisfaction, Financial Resources..."
                      className="mt-2 min-h-[120px]"
                      rows={5}
                    />
                  </div>

                  {/* Somewhat important (negotiable) */}
                  <div>
                    <Label htmlFor="somewhatImportant" className="text-sm font-semibold text-warning">
                      Somewhat important (negotiable)
                    </Label>
                    <Textarea
                      id="somewhatImportant"
                      value={priorityHierarchy.somewhatImportant}
                      onChange={(e) => setPriorityHierarchy(prev => ({ ...prev, somewhatImportant: e.target.value }))}
                      placeholder="e.g., Leisure Pursuits, Leadership..."
                      className="mt-2 min-h-[120px]"
                      rows={5}
                    />
                  </div>

                  {/* Not Important (highly negotiable/doesn't matter) */}
                  <div>
                    <Label htmlFor="notImportant" className="text-sm font-semibold text-foreground/80">
                      Not Important (highly negotiable/doesn't matter)
                    </Label>
                    <Textarea
                      id="notImportant"
                      value={priorityHierarchy.notImportant}
                      onChange={(e) => setPriorityHierarchy(prev => ({ ...prev, notImportant: e.target.value }))}
                      placeholder="e.g., Public Service, Spirituality..."
                      className="mt-2 min-h-[120px]"
                      rows={5}
                    />
                  </div>
                </div>

                {/* Life Values Legend */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                  <h4 className="font-semibold text-sm mb-3">Life Values List (for reference)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {LIFE_VALUES.map((value) => (
                      <div key={value.name} className="flex items-start gap-2">
                        <span className="font-medium text-sm">{value.name}:</span>
                        <span className="text-xs text-foreground/80">{value.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={goToPrevStep}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  {saved && (
                    <div className="flex items-center gap-2 text-primary text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Saved!</span>
                    </div>
                  )}
                </div>
                <Button onClick={() => { saveValues(); goToNextStep(); }} disabled={updateInfo.isPending}>
                  {updateInfo.isPending ? 'Saving...' : 'Next'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'personality' && (
          <Card className="max-w-[70vw] mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                Personality
              </CardTitle>
              <CardDescription>
                Share your personality type to help your team understand you better
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* MBTI Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">1. Myers-Briggs Type Indicator (MBTI)</h3>
                <p className="text-sm text-foreground/80 mb-4">
                  If you don't know your type, take the test at{' '}
                  <a
                    href="https://www.16personalities.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    16personalities.com
                  </a>
                </p>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="mbtiType">MBTI Type</Label>
                    <Select
                      value={mbtiType}
                      onValueChange={setMbtiType}
                    >
                      <SelectTrigger id="mbtiType" className="mt-2">
                        <SelectValue placeholder="Select your MBTI type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MBTI_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="mbtiImage">Upload Result Image (Optional)</Label>
                    <DocumentUpload
                      label=""
                      value={mbtiImageUrl}
                      onChange={setMbtiImageUrl}
                      accept="image/*"
                    />
                    {mbtiImageUrl && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="mt-2"
                        onClick={() => setPreviewImage({ src: mbtiImageUrl, alt: 'MBTI Result' })}
                      >
                        Preview Image
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sample Image */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-foreground/80 mb-2">Example MBTI result:</p>
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ src: '/samples/mbti-example.png', alt: 'MBTI Example' })}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <Image
                      src="/samples/mbti-example.png"
                      alt="MBTI Example"
                      width={320}
                      height={200}
                      className="max-w-xs rounded border cursor-pointer"
                    />
                  </button>
                </div>
              </div>

              <Separator />

              {/* Big Five Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">2. Big Five Personality Test</h3>
                <p className="text-sm text-foreground/80 mb-4">
                  If you don't know your results, take the test at{' '}
                  <a
                    href="https://bigfive-test.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    bigfive-test.com
                  </a>
                </p>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="bigFiveUrl">Results URL</Label>
                    <Input
                      id="bigFiveUrl"
                      type="url"
                      value={bigFiveUrl}
                      onChange={(e) => setBigFiveUrl(e.target.value)}
                      placeholder="https://bigfive-test.com/result/..."
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bigFiveImage">Upload Result Image (Optional)</Label>
                    <DocumentUpload
                      label=""
                      value={bigFiveImageUrl}
                      onChange={setBigFiveImageUrl}
                      accept="image/*"
                    />
                    {bigFiveImageUrl && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="mt-2"
                        onClick={() => setPreviewImage({ src: bigFiveImageUrl, alt: 'Big Five Result' })}
                      >
                        Preview Image
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sample Image */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-foreground/80 mb-2">Example Big Five result:</p>
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ src: '/samples/bigfive-example.png', alt: 'Big Five Example' })}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <Image
                      src="/samples/bigfive-example.png"
                      alt="Big Five Example"
                      width={320}
                      height={200}
                      className="max-w-xs rounded border cursor-pointer"
                    />
                  </button>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={goToPrevStep}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  {saved && (
                    <div className="flex items-center gap-2 text-primary text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Saved!</span>
                    </div>
                  )}
                </div>
                <Button onClick={() => { savePersonality(); goToNextStep(); }} disabled={updateInfo.isPending}>
                  {updateInfo.isPending ? 'Saving...' : 'Complete Onboarding'}
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Image Preview Dialog */}
        {previewImage && (
          <ImagePreviewDialog
            open={!!previewImage}
            onOpenChange={(open) => !open && setPreviewImage(null)}
            imageSrc={previewImage.src}
            imageAlt={previewImage.alt}
          />
        )}

        {currentStep === 'complete' && (
          <>
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Onboarding Complete!</CardTitle>
                <CardDescription className="text-base">
                  Thank you for completing your profile, {employee.fullName.split(' ')[0]}.
                  Your team is excited to work with you!
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Resources
                </CardTitle>
                <CardDescription>
                  Helpful information to get you started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <a
                    href="#"
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Employee Handbook</p>
                      <p className="text-sm text-muted-foreground">Company policies and guidelines</p>
                    </div>
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <Shield className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium">IT Security Policy</p>
                      <p className="text-sm text-muted-foreground">Security best practices</p>
                    </div>
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <Building2 className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium">Benefits Guide</p>
                      <p className="text-sm text-muted-foreground">Health, retirement, and perks</p>
                    </div>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Onboarding Tasks Status */}
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Progress</CardTitle>
                <CardDescription>
                  Track the status of your onboarding tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workflow.tasks.map((task) => (
                    <div key={task.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span>{task.name}</span>
                      <Badge
                        variant={task.status === 'SUCCESS' ? 'success' : 'secondary'}
                      >
                        {task.status === 'SUCCESS' ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setCurrentStep('profile')}>
                Edit My Profile
              </Button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Have any questions? Ask the people team</p>
        </div>
      </div>
    </div>
  )
}
