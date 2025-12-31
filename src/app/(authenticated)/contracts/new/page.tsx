'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  const { data: candidates } = trpc.employee.list.useQuery({
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

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = useForm<OfferFormData>({
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
    },
  })

  const watchedSignatureBlock = watch('signatureBlock')
  const watchedOfferDate = watch('offerDate')
  const watchedOfferExpirationDate = watch('offerExpirationDate')

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
    const selectedEmployee = candidates?.employees.find(e => e.id === data.employeeId)
    
    // Format salary based on payment frequency
    const salaryText = data.paymentFrequency === 'MONTHLY' 
      ? `${data.salaryCurrency} ${data.salaryAmount}`
      : `${data.salaryCurrency} ${data.salaryAmount} per ${data.paymentFrequency.toLowerCase()}`
    
    const variables: Record<string, string> = {
      employee_name: selectedEmployee?.fullName || '',
      employment_start_date: data.anticipatedStartDate,
      start_date: data.anticipatedStartDate, // alias for detail view
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
      bonus: data.salaryAmount ? `Performance-based bonus up to ${data.salaryCurrency} ${(parseFloat(data.salaryAmount) * 0.2).toFixed(0)}` : '',
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
      employeeId: data.employeeId,
      candidateName: selectedEmployee?.fullName || '',
      candidateEmail: selectedEmployee?.personalEmail || '',
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
            {/* Candidate */}
            <div className="md:col-span-2">
              <Label htmlFor="employeeId" className="text-sm font-medium">
                Candidate <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 mt-1">
                <Controller
                  name="employeeId"
                  control={control}
                  rules={{ required: 'Candidate is required' }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="ring-border focus:ring-indigo-600">
                        <SelectValue placeholder="Select a candidate" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidates?.employees.map((employee) => (
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
              {errors.employeeId && (
                <p className="text-sm text-red-500 mt-1">{errors.employeeId.message}</p>
              )}
              <p className="text-xs text-muted-foreground italic mt-1">Select from list of candidates with link to add new candidate</p>
            </div>

            {/* Employment Type */}
            <div>
              <Label htmlFor="employmentType" className="text-sm font-medium">
                Employment type <span className="text-red-500">*</span>
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
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full time</SelectItem>
                      <SelectItem value="PART_TIME">Part time</SelectItem>
                      <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                      <SelectItem value="INTERN">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.employmentType && (
                <p className="text-sm text-red-500 mt-1">{errors.employmentType.message}</p>
              )}
            </div>

            {/* Job Title */}
            <div>
              <Label htmlFor="jobTitle" className="text-sm font-medium">
                Job title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="jobTitle"
                {...register('jobTitle', { required: 'Job title is required' })}
                className="ring-border focus:ring-indigo-600 mt-1"
                placeholder="e.g., Senior Software Engineer"
              />
              {errors.jobTitle && (
                <p className="text-sm text-red-500 mt-1">{errors.jobTitle.message}</p>
              )}
            </div>

            {/* Anticipated Start Date */}
            <div>
              <Label htmlFor="anticipatedStartDate" className="text-sm font-medium">
                Anticipated start date <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                id="anticipatedStartDate"
                {...register('anticipatedStartDate', { required: 'Start date is required' })}
                className="mt-1"
              />
              {errors.anticipatedStartDate && (
                <p className="text-sm text-red-500 mt-1">{errors.anticipatedStartDate.message}</p>
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
                Probation end date <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                id="probationEndDate"
                {...register('probationEndDate', { required: 'Probation end date is required' })}
                className="mt-1"
              />
              {errors.probationEndDate && (
                <p className="text-sm text-red-500 mt-1">{errors.probationEndDate.message}</p>
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
                Offer date <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                id="offerDate"
                {...register('offerDate', { required: 'Offer date is required' })}
                className="mt-1"
              />
              {errors.offerDate && (
                <p className="text-sm text-red-500 mt-1">{errors.offerDate.message}</p>
              )}
              <p className="text-xs text-muted-foreground italic mt-1">Date the offer is made to the candidate (default: today)</p>
            </div>

            {/* Offer Expiration Date */}
            <div>
              <Label htmlFor="offerExpirationDate" className="text-sm font-medium">
                Offer expiration date <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                id="offerExpirationDate"
                {...register('offerExpirationDate', { required: 'Expiration date is required' })}
                className="mt-1"
              />
              {errors.offerExpirationDate && (
                <p className="text-sm text-red-500 mt-1">{errors.offerExpirationDate.message}</p>
              )}
              <p className="text-xs text-muted-foreground italic mt-1">Date the offer will expire if it is not accepted (default: 7 days from today)</p>
            </div>

            {/* Supervisor Job Title */}
            <div>
              <Label htmlFor="supervisorJobTitle" className="text-sm font-medium">
                Job title of candidate&apos;s supervisor <span className="text-red-500">*</span>
              </Label>
              <Input
                id="supervisorJobTitle"
                {...register('supervisorJobTitle', { required: 'Supervisor job title is required' })}
                className="ring-border focus:ring-indigo-600 mt-1"
                placeholder="e.g., Engineering Manager"
              />
              {errors.supervisorJobTitle && (
                <p className="text-sm text-red-500 mt-1">{errors.supervisorJobTitle.message}</p>
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
                Legal entity <span className="text-red-500">*</span>
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
                      <SelectContent>
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
                <p className="text-sm text-red-500 mt-1">{errors.legalEntity.message}</p>
              )}
            </div>

            {/* Signature Block */}
            <div>
              <Label htmlFor="signatureBlock" className="text-sm font-medium">
                Signature block <span className="text-red-500">*</span>
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
                      <SelectContent>
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
                <p className="text-sm text-red-500 mt-1">{errors.signatureBlock.message}</p>
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
                Salary amount <span className="text-red-500">*</span>
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
                <p className="text-sm text-red-500 mt-1">{errors.salaryAmount.message}</p>
              )}
            </div>

            {/* Currency */}
            <div>
              <Label htmlFor="salaryCurrency" className="text-sm font-medium">
                Currency <span className="text-red-500">*</span>
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
                    <SelectContent>
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
                <p className="text-sm text-red-500 mt-1">{errors.salaryCurrency.message}</p>
              )}
            </div>

            {/* Payment Frequency */}
            <div>
              <Label htmlFor="paymentFrequency" className="text-sm font-medium">
                Payment frequency <span className="text-red-500">*</span>
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
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                      <SelectItem value="ANNUAL">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentFrequency && (
                <p className="text-sm text-red-500 mt-1">{errors.paymentFrequency.message}</p>
              )}
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
