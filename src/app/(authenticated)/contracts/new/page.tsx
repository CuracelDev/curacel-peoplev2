'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Plus } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import Link from 'next/link'

interface OfferFormData {
  // Employment Details
  employeeId: string
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN'
  jobTitle: string
  anticipatedStartDate: string
  anticipatedLastDay?: string
  primaryDuties?: string
  probationEndDate: string

  // Offer Contract Details
  offerDate: string
  offerExpirationDate: string
  supervisorJobTitle: string
  workingHours?: string
  additionalBenefits?: string
  legalEntity: string
  signatureBlock: string
  scheduleSignatureRequestDate?: string

  // Compensation
  salaryAmount: string
  salaryCurrency: string
  paymentFrequency: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'ANNUAL'
  bonus?: string
  probationPeriod?: string
  probationGoals?: string
  probationGoalsUrl?: string
}

const DEFAULT_PRIMARY_DUTIES = `- Perform assigned tasks and responsibilities
- Collaborate with team members
- Meet project deadlines
- Maintain professional standards`

const DEFAULT_ADDITIONAL_BENEFITS = `- Health insurance
- Paid time off
- Professional development opportunities
- Flexible work arrangements`

export default function NewContractPage() {
  const router = useRouter()
  const [showAddCandidate, setShowAddCandidate] = useState(false)
  const [showAddSignatureBlock, setShowAddSignatureBlock] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<'candidates' | 'employees'>('candidates')
  const { data: hiringSettings } = trpc.hiringSettings.get.useQuery()

  // Get candidates in OFFER stage
  const { data: offerCandidates } = trpc.offer.getCandidatesInOfferStage.useQuery()

  // Get existing employees
  const { data: employees } = trpc.employee.list.useQuery({
    limit: 100,
  })

  const { data: legalEntities } = trpc.legalEntity.list.useQuery()

  const { data: signatureBlocks } = trpc.signature.list.useQuery(undefined, {
    enabled: true,
  })

  const createOffer = trpc.offer.create.useMutation({
    onSuccess: (offer) => {
      router.push(`/contracts/${offer.id}`)
    },
  })

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors, dirtyFields } } = useForm<OfferFormData>({
    defaultValues: {
      offerDate: new Date().toISOString().split('T')[0],
      offerExpirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      workingHours: '8:00am to 5:00pm',
      primaryDuties: DEFAULT_PRIMARY_DUTIES,
      additionalBenefits: DEFAULT_ADDITIONAL_BENEFITS,
      salaryCurrency: 'USD',
      paymentFrequency: 'MONTHLY',
      legalEntity: '',
      signatureBlock: '',
      bonus: '',
      probationPeriod: '',
      probationGoals: '',
      probationGoalsUrl: '',
    },
  })

  const watchedSignatureBlock = watch('signatureBlock')
  const watchedOfferDate = watch('offerDate')
  const watchedOfferExpirationDate = watch('offerExpirationDate')
  const watchedStartDate = watch('anticipatedStartDate')
  const watchedEmploymentType = watch('employmentType')

  // Get templates filtered by employment type
  const employmentType = watch('employmentType')
  const { data: templates } = trpc.offerTemplate.list.useQuery(
    employmentType ? { employmentType } : undefined,
    {
      enabled: true,
    }
  )

  // Auto-select template when employment type changes
  useEffect(() => {
    if (employmentType && templates && templates.length > 0) {
      const matchingTemplate = templates.find(t => t.employmentType === employmentType)
      if (matchingTemplate) {
        // Template is automatically selected based on employment type
        // The template will be used in onSubmit
      }
    }
  }, [employmentType, templates])

  // Set default signature block when data loads
  useEffect(() => {
    if (signatureBlocks && signatureBlocks.length > 0 && !watchedSignatureBlock) {
      const defaultBlock = signatureBlocks.find((sb) => (sb as any).isDefault) || signatureBlocks[0]
      setValue('signatureBlock', defaultBlock.id)
    }
  }, [signatureBlocks, setValue, watchedSignatureBlock])

  useEffect(() => {
    if (!legalEntities || legalEntities.length === 0) return
    if (!getValues('legalEntity')) {
      setValue('legalEntity', legalEntities[0].name)
    }
  }, [legalEntities, getValues, setValue])

  useEffect(() => {
    // Set default expiration date if not set
    if (watchedOfferDate && !watchedOfferExpirationDate) {
      const expirationDate = new Date(watchedOfferDate)
      expirationDate.setDate(expirationDate.getDate() + 7)
      setValue('offerExpirationDate', expirationDate.toISOString().split('T')[0])
    }
  }, [setValue, watchedOfferDate, watchedOfferExpirationDate])

  useEffect(() => {
    if (!watchedStartDate || dirtyFields.probationEndDate) return
    const monthsByType = {
      FULL_TIME: hiringSettings?.probationLengthFullTimeMonths ?? 3,
      PART_TIME: hiringSettings?.probationLengthPartTimeMonths ?? 3,
      CONTRACTOR: hiringSettings?.probationLengthContractorMonths ?? 3,
      INTERN: hiringSettings?.probationLengthInternMonths ?? 3,
    }
    const months = monthsByType[watchedEmploymentType || 'FULL_TIME']
    const startDate = new Date(`${watchedStartDate}T00:00:00`)
    const probationDate = new Date(startDate)
    probationDate.setMonth(probationDate.getMonth() + months)
    setValue('probationEndDate', probationDate.toISOString().split('T')[0], { shouldDirty: false })
  }, [dirtyFields.probationEndDate, hiringSettings, setValue, watchedEmploymentType, watchedStartDate])

  // Pre-fill form when candidate is selected
  useEffect(() => {
    if (selectedCandidateId && offerCandidates) {
      const candidate = offerCandidates.find(c => c.id === selectedCandidateId)
      if (candidate) {
        // Pre-fill employment type
        if (candidate.job.employmentType) {
          setValue('employmentType', candidate.job.employmentType as 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN')
        }

        // Pre-fill job title
        if (candidate.job.title) {
          setValue('jobTitle', candidate.job.title)
        }

        // Pre-fill salary
        if (candidate.salaryExpMax) {
          setValue('salaryAmount', candidate.salaryExpMax.toString())
        }

        if (candidate.salaryExpCurrency) {
          setValue('salaryCurrency', candidate.salaryExpCurrency)
        }

        // Calculate and set estimated start date
        if (candidate.noticePeriod) {
          const noticeDays = parseInt(candidate.noticePeriod.match(/(\d+)/)?.[0] || '30')
          const estimatedStartDate = new Date()
          estimatedStartDate.setDate(estimatedStartDate.getDate() + noticeDays)
          setValue('anticipatedStartDate', estimatedStartDate.toISOString().split('T')[0])
        }
      }
    }
  }, [selectedCandidateId, offerCandidates, setValue])

  const onSubmit = (data: OfferFormData) => {
    // Find the selected signature block
    const selectedSignatureBlock = signatureBlocks?.find(sb => sb.id === data.signatureBlock)
    const signatureBlockText = selectedSignatureBlock
      ? `${selectedSignatureBlock.signatoryName}, ${selectedSignatureBlock.signatoryTitle}`
      : data.signatureBlock

    // Find the appropriate template based on employment type
    const selectedTemplate = templates?.find(t => t.employmentType === data.employmentType) || templates?.[0]

    if (!selectedTemplate) {
      alert('No template found for this employment type. Please create a template first.')
      return
    }

    // Map form data to template variables (matching the template placeholders exactly)
    let selectedEmployee = employees?.employees.find(e => e.id === data.employeeId)
    let selectedCandidate = selectedCandidateId ? offerCandidates?.find(c => c.id === selectedCandidateId) : null

    // If selecting from candidates, use candidate data
    const candidateName = selectedCandidate?.name || selectedEmployee?.fullName || ''
    const candidateEmail = selectedCandidate?.email || selectedEmployee?.personalEmail || ''

    // Format salary based on payment frequency
    const salaryText = data.paymentFrequency === 'MONTHLY'
      ? `${data.salaryCurrency} ${data.salaryAmount}`
      : `${data.salaryCurrency} ${data.salaryAmount} per ${data.paymentFrequency.toLowerCase()}`

    const variables: Record<string, string> = {
      employee_name: candidateName,
      employment_start_date: data.anticipatedStartDate,
      start_date: data.anticipatedStartDate, // alias for detail view
      probation_end_date: data.probationEndDate,
      job_title: data.jobTitle,
      supervisor_title: data.supervisorJobTitle,
      duties: data.primaryDuties || DEFAULT_PRIMARY_DUTIES,
      gross_salary: salaryText,
      salary: data.salaryAmount,
      salary_amount: data.salaryAmount,
      currency: data.salaryCurrency,
      salary_currency: data.salaryCurrency,
      employment_type: data.employmentType,
      benefits: data.additionalBenefits || DEFAULT_ADDITIONAL_BENEFITS,
      bonus: data.bonus || (data.salaryAmount ? `Performance-based bonus up to ${data.salaryCurrency} ${(parseFloat(data.salaryAmount) * 0.2).toFixed(0)}` : ''),
      probation_period: data.probationPeriod || '',
      probation_goals: data.probationGoals || '',
      probation_goals_url: data.probationGoalsUrl || '',
      offer_expiration_date: data.offerExpirationDate,
      signature_block_id: selectedSignatureBlock?.id || '',
      signature_block_name: selectedSignatureBlock?.signatoryName || '',
      signature_block_title: selectedSignatureBlock?.signatoryTitle || '',
      signature_block_image_url: selectedSignatureBlock?.signatureImageUrl || '',
      signature_block_text: signatureBlockText || '',
    }

    if (data.anticipatedLastDay) {
      variables.employment_end_date = data.anticipatedLastDay
    }

    createOffer.mutate({
      employeeId: selectedCandidate?.employee?.id || data.employeeId,
      candidateId: selectedCandidateId || undefined,
      candidateName,
      candidateEmail,
      templateId: selectedTemplate.id,
      variables,
    })
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Create New Contract</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1: Employment Details */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Employment Details</h2>
            <p className="text-sm text-muted-foreground mt-1">Basic employment information</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            {/* Candidate Selector with Tabs */}
            <div className="md:col-span-2 space-y-3">
              <Label className="text-sm font-medium">
                Candidate <span className="text-destructive">*</span>
              </Label>

              {/* Tab Buttons */}
              <div className="flex gap-2 border-b border-border">
                <button
                  type="button"
                  onClick={() => setSelectedSource('candidates')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${selectedSource === 'candidates'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Candidates in Offer Stage {offerCandidates?.length ? `(${offerCandidates.length})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSource('employees')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${selectedSource === 'employees'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Existing Employees
                </button>
              </div>

              {/* Candidate List */}
              {selectedSource === 'candidates' && (
                <div className="space-y-2">
                  {offerCandidates && offerCandidates.length > 0 ? (
                    <div className="space-y-2">
                      {offerCandidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          onClick={() => setSelectedCandidateId(candidate.id)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedCandidateId === candidate.id
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                            : 'border-border hover:border-indigo-300 hover:bg-accent'
                            }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="font-medium text-foreground">{candidate.name}</h4>
                              <p className="text-sm text-muted-foreground">{candidate.email}</p>
                              <div className="flex gap-2 mt-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">
                                  {candidate.job.title}
                                </span>
                                {candidate.job.department && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">
                                    {candidate.job.department}
                                  </span>
                                )}
                              </div>
                            </div>
                            {candidate.employee?.offers && candidate.employee.offers.length > 0 && (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                                Has Offer
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic p-4 border border-dashed border-border rounded-lg">
                      No candidates in OFFER stage. Move candidates to OFFER stage to create offers for them.
                    </p>
                  )}
                </div>
              )}

              {/* Employee List */}
              {selectedSource === 'employees' && (
                <div className="flex gap-2">
                  <Controller
                    name="employeeId"
                    control={control}
                    rules={{ required: selectedSource === 'employees' ? 'Candidate is required' : false }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(value) => {
                        field.onChange(value)
                        setSelectedCandidateId(null)
                      }}>
                        <SelectTrigger className="ring-border focus:ring-indigo-600">
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                        <SelectContent side="bottom" sideOffset={4} avoidCollisions={false}>
                          {employees?.employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.fullName} ({employee.personalEmail})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/employees?action=create')}
                    className="whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                  </Button>
                </div>
              )}

              {errors.employeeId && selectedSource === 'employees' && (
                <p className="text-sm text-destructive mt-1">{errors.employeeId.message}</p>
              )}
              {selectedSource === 'candidates' && !selectedCandidateId && (
                <p className="text-sm text-destructive mt-1">Please select a candidate</p>
              )}
            </div>

            {/* Employment Type */}
            <div>
              <Label htmlFor="employmentType" className="text-sm font-medium">
                Employment type <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="employmentType"
                control={control}
                rules={{ required: 'Employment type is required' }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="ring-border focus:ring-indigo-600 mt-1">
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent side="bottom" sideOffset={4} avoidCollisions={false}>
                      <SelectItem value="FULL_TIME">Full time</SelectItem>
                      <SelectItem value="PART_TIME">Part time</SelectItem>
                      <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                      <SelectItem value="INTERN">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.employmentType && (
                <p className="text-sm text-destructive mt-1">{errors.employmentType.message}</p>
              )}
            </div>

            {/* Job Title */}
            <div>
              <Label htmlFor="jobTitle" className="text-sm font-medium">
                Job title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="jobTitle"
                {...register('jobTitle', { required: 'Job title is required' })}
                className="ring-border focus:ring-indigo-600 mt-1"
                placeholder="e.g., Senior Software Engineer"
              />
              {errors.jobTitle && (
                <p className="text-sm text-destructive mt-1">{errors.jobTitle.message}</p>
              )}
            </div>

            {/* Anticipated Start Date */}
            <div>
              <Label htmlFor="anticipatedStartDate" className="text-sm font-medium">
                Anticipated start date <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                id="anticipatedStartDate"
                {...register('anticipatedStartDate', { required: 'Start date is required' })}
                className="mt-1"
              />
              {errors.anticipatedStartDate && (
                <p className="text-sm text-destructive mt-1">{errors.anticipatedStartDate.message}</p>
              )}
              <p className="text-xs text-muted-foreground italic mt-1">Date the candidate is expected to resume</p>
            </div>

            {/* Anticipated Last Day (conditional) */}
            {(employmentType === 'CONTRACTOR' || employmentType === 'INTERN') && (
              <div>
                <Label htmlFor="anticipatedLastDay" className="text-sm font-medium">
                  Anticipated last day of employment
                </Label>
                <DatePicker
                  id="anticipatedLastDay"
                  {...register('anticipatedLastDay')}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground italic mt-1">
                  Date the contract is ending or due for renewal (applicable for contractor and internship roles)
                </p>
              </div>
            )}

            {/* Probation End Date */}
            <div>
              <Label htmlFor="probationEndDate" className="text-sm font-medium">
                Probation end date <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                id="probationEndDate"
                {...register('probationEndDate', { required: 'Probation end date is required' })}
                className="mt-1"
              />
              {errors.probationEndDate && (
                <p className="text-sm text-destructive mt-1">{errors.probationEndDate.message}</p>
              )}
              <p className="text-xs text-muted-foreground italic mt-1">When the candidate&apos;s probation period end</p>
            </div>
          </div>

          {/* Primary Duties */}
          <div>
            <Label htmlFor="primaryDuties" className="text-sm font-medium">
              Primary Duties
            </Label>
            <Controller
              name="primaryDuties"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  {...field}
                  placeholder={DEFAULT_PRIMARY_DUTIES}
                  className="mt-1"
                />
              )}
            />
            <p className="text-xs text-muted-foreground italic mt-1">Default text if left blank provided</p>
          </div>
        </div>

        {/* Section 2: Offer Contract Details */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Offer Contract Details</h2>
            <p className="text-sm text-muted-foreground mt-1">Contract and offer specifics</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            {/* Offer Date */}
            <div>
              <Label htmlFor="offerDate" className="text-sm font-medium">
                Offer date <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                id="offerDate"
                {...register('offerDate', { required: 'Offer date is required' })}
                className="mt-1"
              />
              {errors.offerDate && (
                <p className="text-sm text-destructive mt-1">{errors.offerDate.message}</p>
              )}
              <p className="text-xs text-muted-foreground italic mt-1">Date the offer is made to the candidate (default: today)</p>
            </div>

            {/* Offer Expiration Date */}
            <div>
              <Label htmlFor="offerExpirationDate" className="text-sm font-medium">
                Offer expiration date <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                id="offerExpirationDate"
                {...register('offerExpirationDate', { required: 'Expiration date is required' })}
                className="mt-1"
              />
              {errors.offerExpirationDate && (
                <p className="text-sm text-destructive mt-1">{errors.offerExpirationDate.message}</p>
              )}
              <p className="text-xs text-muted-foreground italic mt-1">Date the offer will expire if it is not accepted (default: 7 days from today)</p>
            </div>

            {/* Supervisor Job Title */}
            <div>
              <Label htmlFor="supervisorJobTitle" className="text-sm font-medium">
                Job title of candidate&apos;s supervisor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="supervisorJobTitle"
                {...register('supervisorJobTitle', { required: 'Supervisor job title is required' })}
                className="ring-border focus:ring-indigo-600 mt-1"
                placeholder="e.g., Engineering Manager"
              />
              {errors.supervisorJobTitle && (
                <p className="text-sm text-destructive mt-1">{errors.supervisorJobTitle.message}</p>
              )}
            </div>

            {/* Working Hours */}
            <div>
              <Label htmlFor="workingHours" className="text-sm font-medium">
                Working hours
              </Label>
              <Input
                id="workingHours"
                {...register('workingHours')}
                className="ring-border focus:ring-indigo-600 mt-1"
                placeholder="8:00am to 5:00pm"
              />
              <p className="text-xs text-muted-foreground italic mt-1">Default &quot;8:00am to 5:00pm&quot;</p>
            </div>

            {/* Legal Entity */}
            <div>
              <Label htmlFor="legalEntity" className="text-sm font-medium">
                Legal entity <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2 mt-1">
                <Controller
                  name="legalEntity"
                  control={control}
                  rules={{ required: 'Legal entity is required' }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="ring-border focus:ring-indigo-600">
                        <SelectValue placeholder="Select legal entity" />
                      </SelectTrigger>
                      <SelectContent side="bottom" sideOffset={4} avoidCollisions={false}>
                        {legalEntities?.map((entity) => (
                          <SelectItem key={entity.id} value={entity.name}>
                            {entity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/settings/legal-entities')}
                  className="whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </div>
              {errors.legalEntity && (
                <p className="text-sm text-destructive mt-1">{errors.legalEntity.message}</p>
              )}
            </div>

            {/* Signature Block */}
            <div>
              <Label htmlFor="signatureBlock" className="text-sm font-medium">
                Signature block <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2 mt-1">
                <Controller
                  name="signatureBlock"
                  control={control}
                  rules={{ required: 'Signature block is required' }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="ring-border focus:ring-indigo-600">
                        <SelectValue placeholder="Select signature block" />
                      </SelectTrigger>
                      <SelectContent side="bottom" sideOffset={4} avoidCollisions={false}>
                        {signatureBlocks?.map((block) => (
                          <SelectItem key={block.id} value={block.id}>
                            {block.signatoryName} - {block.signatoryTitle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/settings/signatures')}
                  className="whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </div>
              {errors.signatureBlock && (
                <p className="text-sm text-destructive mt-1">{errors.signatureBlock.message}</p>
              )}
            </div>

            {/* Schedule Signature Request Date */}
            <div>
              <Label htmlFor="scheduleSignatureRequestDate" className="text-sm font-medium">
                Schedule signature request date
              </Label>
              <DatePicker
                id="scheduleSignatureRequestDate"
                {...register('scheduleSignatureRequestDate')}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground italic mt-1">Auto-send date</p>
            </div>
          </div>

          {/* Additional Benefits */}
          <div>
            <Label htmlFor="additionalBenefits" className="text-sm font-medium">
              Additional Benefits
            </Label>
            <Controller
              name="additionalBenefits"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  {...field}
                  placeholder={DEFAULT_ADDITIONAL_BENEFITS}
                  className="mt-1"
                />
              )}
            />
            <p className="text-xs text-muted-foreground italic mt-1">Default text provided</p>
          </div>
        </div>

        {/* Section 3: Compensation */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Compensation</h2>
            <p className="text-sm text-muted-foreground mt-1">Salary and payment details</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
            {/* Salary Amount */}
            <div>
              <Label htmlFor="salaryAmount" className="text-sm font-medium">
                Salary amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="salaryAmount"
                type="number"
                step="0.01"
                {...register('salaryAmount', { required: 'Salary amount is required' })}
                className="ring-border focus:ring-indigo-600 mt-1"
                placeholder="100000"
              />
              {errors.salaryAmount && (
                <p className="text-sm text-destructive mt-1">{errors.salaryAmount.message}</p>
              )}
            </div>

            {/* Currency */}
            <div>
              <Label htmlFor="salaryCurrency" className="text-sm font-medium">
                Currency <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="salaryCurrency"
                control={control}
                rules={{ required: 'Currency is required' }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="ring-border focus:ring-indigo-600 mt-1">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent side="bottom" sideOffset={4} avoidCollisions={false}>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="NGN">NGN</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="KSH">KSH</SelectItem>
                      <SelectItem value="ZAR">ZAR</SelectItem>
                      <SelectItem value="GHS">GHS</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.salaryCurrency && (
                <p className="text-sm text-destructive mt-1">{errors.salaryCurrency.message}</p>
              )}
            </div>

            {/* Payment Frequency */}
            <div>
              <Label htmlFor="paymentFrequency" className="text-sm font-medium">
                Payment frequency <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="paymentFrequency"
                control={control}
                rules={{ required: 'Payment frequency is required' }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="ring-border focus:ring-indigo-600 mt-1">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent side="bottom" sideOffset={4} avoidCollisions={false}>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                      <SelectItem value="ANNUAL">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentFrequency && (
                <p className="text-sm text-destructive mt-1">{errors.paymentFrequency.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 pt-6 border-t border-border">
            {/* Bonus Details */}
            <div>
              <Label htmlFor="bonus" className="text-sm font-medium">
                Bonus details
              </Label>
              <Input
                id="bonus"
                {...register('bonus')}
                className="ring-border focus:ring-indigo-600 mt-1"
                placeholder="e.g. Performance-based up to NGN 120,000"
              />
              <p className="text-xs text-muted-foreground italic mt-1">Leaves blank to use auto-generated calculated bonus</p>
            </div>

            {/* Probation Period */}
            <div>
              <Label htmlFor="probationPeriod" className="text-sm font-medium">
                Probation period
              </Label>
              <Input
                id="probationPeriod"
                {...register('probationPeriod')}
                className="ring-border focus:ring-indigo-600 mt-1"
                placeholder="e.g. 6 months"
              />
              <p className="text-xs text-muted-foreground italic mt-1">Textual description for the contract</p>
              <div className="md:col-span-2">
                <Label htmlFor="probationGoals" className="text-sm font-medium">
                  Probation Goals / Template
                </Label>
                <Textarea
                  id="probationGoals"
                  {...register('probationGoals')}
                  className="mt-1"
                  placeholder="e.g., Complete onboarding, deliver first project, etc."
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="probationGoalsUrl" className="text-sm font-medium">
                  Link to Goals Document / Template
                </Label>
                <Input
                  id="probationGoalsUrl"
                  {...register('probationGoalsUrl')}
                  className="mt-1"
                  placeholder="e.g., https://docs.google.com/document/d/..."
                />
                <p className="text-xs text-muted-foreground italic mt-1">URL to a Google Doc or other shared resource</p>
              </div>
            </div>

          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createOffer.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createOffer.isPending ? 'Creating...' : 'Create Contract'}
          </Button>
        </div>
      </form>
    </div>
  )
}
