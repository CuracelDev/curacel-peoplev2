'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Send, X, ExternalLink, FileText, Clock, Pencil } from 'lucide-react'
import { contractStatusLabels, contractStatusColors, formatDate, formatDateTime } from '@/lib/utils'

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.id as string
  const [isEditing, setIsEditing] = useState(false)

  const { data: contract, isLoading, refetch } = trpc.offer.getById.useQuery(contractId)

  const {
    register,
    control,
    handleSubmit,
    reset,
  } = useForm<{
    candidateName: string
    candidateEmail: string
    jobTitle: string
    employmentType: string
    startDate: string
    salaryAmount: string
    salaryCurrency: string
    offerExpirationDate: string
    bonus: string
    probationPeriod: string
    probationGoals: string
    probationGoalsUrl: string
  }>({
    defaultValues: {
      candidateName: '',
      candidateEmail: '',
      jobTitle: '',
      employmentType: 'FULL_TIME',
      startDate: '',
      salaryAmount: '',
      salaryCurrency: 'USD',
      offerExpirationDate: '',
      bonus: '',
      probationPeriod: '',
      probationGoals: '',
      probationGoalsUrl: '',
    },
  })

  const sendContract = trpc.offer.send.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => {
      console.error('Failed to send contract', err)
      alert(err.message || 'Failed to send for signature')
    },
  })

  const resendContract = trpc.offer.resend.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => {
      console.error('Failed to resend contract', err)
      alert(err.message || 'Failed to resend for signature')
    },
  })

  const cancelContract = trpc.offer.cancel.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => {
      console.error('Failed to cancel contract', err)
      alert(err.message || 'Failed to cancel contract')
    },
  })

  const updateContract = trpc.offer.update.useMutation({
    onSuccess: () => {
      setIsEditing(false)
      refetch()
    },
    onError: (err) => {
      console.error('Failed to update contract', err)
      alert(err.message || 'Failed to update contract')
    },
  })

  const variables = useMemo(
    () => (contract?.variables || {}) as Record<string, string>,
    [contract?.variables]
  )
  const variableEntries = useMemo(
    () => Object.entries(variables).filter(([key]) => key !== 'signature_block_image_url'),
    [variables]
  )
  const hasHiddenSignatureImageUrl = Boolean(variables.signature_block_image_url)

  useEffect(() => {
    if (!contract) return
    reset({
      candidateName: contract.candidateName,
      candidateEmail: contract.candidateEmail,
      jobTitle: variables.role || variables.job_title || '',
      employmentType: variables.employment_type || 'FULL_TIME',
      startDate: variables.employment_start_date || variables.start_date || '',
      salaryAmount: variables.salary || variables.salary_amount || '',
      salaryCurrency: variables.currency || variables.salary_currency || 'USD',
      offerExpirationDate: variables.offer_expiration_date || '',
      bonus: variables.bonus || '',
      probationPeriod: variables.probation_period || '',
      probationGoals: variables.probation_goals || '',
      probationGoalsUrl: variables.probation_goals_url || '',
    })
  }, [contract, reset, variables])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Contract not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    )
  }

  const getVariable = (keys: string[], fallback = 'Not specified') => {
    for (const key of keys) {
      const value = variables[key]
      if (value) return value
    }
    return fallback
  }

  const formatVariableDate = (keys: string[]) => {
    const raw = getVariable(keys, '')
    if (!raw) return 'Not specified'
    const parsed = new Date(raw)
    return isNaN(parsed.getTime()) ? raw : formatDate(parsed)
  }

  const compensationValue = (() => {
    const amount = getVariable(['gross_salary', 'salary', 'salary_amount', 'compensation'], '')
    const currency = getVariable(['currency', 'salary_currency'], '')
    if (!amount && !currency) return 'Not specified'
    if (amount && currency) return `${currency} ${amount}`
    return amount || currency
  })()

  const employmentDetails = [
    { label: 'Full name', value: contract.candidateName },
    { label: 'Email', value: contract.candidateEmail },
    { label: 'Job title', value: getVariable(['role', 'job_title', 'title']) },
    { label: 'Employment type', value: getVariable(['employment_type', 'employmentType'], 'Full time') },
    { label: 'Start date', value: formatVariableDate(['employment_start_date', 'start_date', 'startDate']) },
    { label: 'Compensation', value: compensationValue },
    { label: 'Bonus', value: getVariable(['bonus']) },
    { label: 'Probation period', value: getVariable(['probation_period', 'probationPeriod']) },
    { label: 'Probation goals', value: getVariable(['probation_goals', 'probationGoals']) },
    { label: 'Goals document', value: getVariable(['probation_goals_url', 'probationGoalsUrl']) },
  ]

  const contractMetadata = [
    { label: 'Template', value: contract.template.name },
    { label: 'Status', value: contractStatusLabels[contract.status] },
    { label: 'Created', value: formatDateTime(contract.createdAt) },
    contract.esignSentAt && { label: 'Sent', value: formatDateTime(contract.esignSentAt) },
    contract.esignSignedAt && { label: 'Signed', value: formatDateTime(contract.esignSignedAt) },
    contract.esignProvider && { label: 'eSign provider', value: contract.esignProvider },
    contract.esignEnvelopeId && { label: 'Envelope ID', value: contract.esignEnvelopeId },
    contract.signedDocUrl && { label: 'Signed copy', value: 'Available' },
  ].filter(Boolean) as { label: string; value: string }[]

  const canSend = contract.status === 'DRAFT'
  const canResend = ['SENT', 'VIEWED'].includes(contract.status)
  const canCancel = ['DRAFT', 'SENT', 'VIEWED'].includes(contract.status)
  const canEdit = !['SIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED'].includes(contract.status)

  const onSubmitEdit = (data: {
    candidateName: string
    candidateEmail: string
    jobTitle: string
    employmentType: string
    startDate: string
    salaryAmount: string
    salaryCurrency: string
    offerExpirationDate: string
    bonus: string
    probationPeriod: string
    probationGoals: string
    probationGoalsUrl: string
  }) => {
    const salaryText = data.salaryAmount ? `${data.salaryCurrency} ${data.salaryAmount}` : ''
    const updatedVariables: Record<string, string> = {
      ...variables,
      employee_name: data.candidateName,
      role: data.jobTitle,
      job_title: data.jobTitle,
      employment_type: data.employmentType,
      employment_start_date: data.startDate,
      start_date: data.startDate,
      salary: data.salaryAmount,
      salary_amount: data.salaryAmount,
      currency: data.salaryCurrency,
      salary_currency: data.salaryCurrency,
      gross_salary: salaryText,
      offer_expiration_date: data.offerExpirationDate,
      bonus: data.bonus,
      probation_period: data.probationPeriod,
      probation_goals: data.probationGoals,
      probation_goals_url: data.probationGoalsUrl,
    }

    updateContract.mutate({
      offerId: contract.id,
      candidateName: data.candidateName,
      candidateEmail: data.candidateEmail,
      templateId: contract.template.id,
      variables: updatedVariables,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{contract.candidateName}</h1>
            <p className="text-sm text-muted-foreground">{contract.candidateEmail}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={contractStatusColors[contract.status]}>
            {contractStatusLabels[contract.status]}
          </Badge>
          {contract.employee && (
            <Link href={`/employees/${contract.employee.id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View employee
              </Button>
            </Link>
          )}
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelContract.mutate(contract.id)}
              disabled={cancelContract.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              {cancelContract.isPending ? 'Cancelling...' : 'Cancel'}
            </Button>
          )}
          {canSend && (
            <Button
              size="sm"
              onClick={() => sendContract.mutate({ offerId: contract.id })}
              disabled={sendContract.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {sendContract.isPending ? 'Sending...' : 'Send for signature'}
            </Button>
          )}
          {canResend && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => resendContract.mutate({ offerId: contract.id })}
              disabled={resendContract.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {resendContract.isPending ? 'Resending...' : 'Resend email'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const link = `${window.location.origin}/offer/${contract.id}/sign`
              navigator.clipboard.writeText(link).then(
                () => alert('Signing link copied'),
                () => alert('Failed to copy link')
              )
            }}
          >
            Copy signing link
          </Button>
          {canEdit && !isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.8fr,1fr]">
        <div className="space-y-6">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit contract details</CardTitle>
                <CardDescription>Allowed until the contract is signed.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmitEdit)}>
                  <div className="md:col-span-2">
                    <Label htmlFor="candidateName">Candidate name</Label>
                    <Input id="candidateName" {...register('candidateName', { required: true })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="candidateEmail">Candidate email</Label>
                    <Input
                      id="candidateEmail"
                      type="email"
                      {...register('candidateEmail', { required: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="jobTitle">Job title</Label>
                    <Input id="jobTitle" {...register('jobTitle', { required: true })} />
                  </div>
                  <div>
                    <Label>Employment type</Label>
                    <Controller
                      name="employmentType"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
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
                  </div>
                  <div>
                    <Label>Start date</Label>
                    <Controller
                      name="startDate"
                      control={control}
                      render={({ field }) => <DatePicker {...field} />}
                    />
                  </div>
                  <div>
                    <Label>Salary amount</Label>
                    <Input type="number" step="0.01" {...register('salaryAmount')} />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Controller
                      name="salaryCurrency"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="NGN">NGN</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="KSH">KSH</SelectItem>
                            <SelectItem value="ZAR">ZAR</SelectItem>
                            <SelectItem value="GHS">GHS</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Offer expiration</Label>
                    <Controller
                      name="offerExpirationDate"
                      control={control}
                      render={({ field }) => <DatePicker {...field} />}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bonus">Bonus details</Label>
                    <Input id="bonus" {...register('bonus')} />
                  </div>
                  <div>
                    <Label htmlFor="probationPeriod">Probation period</Label>
                    <Input id="probationPeriod" {...register('probationPeriod')} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="probationGoals">Probation goals</Label>
                    <Input id="probationGoals" {...register('probationGoals')} placeholder="e.g. Complete core training" />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="probationGoalsUrl">Link to goals document / template</Label>
                    <Input id="probationGoalsUrl" {...register('probationGoalsUrl')} placeholder="https://docs.google.com/..." />
                  </div>
                  <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateContract.isPending}>
                      {updateContract.isPending ? 'Saving...' : 'Save changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Employment details</CardTitle>
                <CardDescription>Quick snapshot of what was sent to the candidate.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {employmentDetails.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    {item.label === 'Goals document' && item.value.startsWith('http') ? (
                      <a
                        href={item.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {item.value} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <div
                        className="font-medium prose prose-sm max-w-none prose-p:my-0 prose-ul:my-1 prose-li:my-0"
                        dangerouslySetInnerHTML={{ __html: item.value }}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Contract details</CardTitle>
              <CardDescription>Signature status, template, and key timestamps.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {contractMetadata.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-3">Variables</p>
                <div className="space-y-2">
                  {variableEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="grid grid-cols-[180px,minmax(0,1fr)] gap-4 rounded-md border border-border bg-card/60 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-foreground/80 capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <div
                        className="min-w-0 text-sm text-foreground leading-6 whitespace-pre-wrap break-words prose prose-sm max-w-none prose-p:my-0 prose-ul:my-1 prose-li:my-0 prose-strong:text-foreground"
                        dangerouslySetInnerHTML={{ __html: value }}
                      />
                    </div>
                  ))}
                  {hasHiddenSignatureImageUrl && (
                    <p className="text-xs text-muted-foreground">
                      Signature block image URL hidden (too long).
                    </p>
                  )}
                  {variableEntries.length === 0 && (
                    <p className="text-muted-foreground">No variables provided for this contract.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contract letter
              </CardTitle>
              <CardDescription>The exact HTML sent for signature.</CardDescription>
            </CardHeader>
            <CardContent>
              {contract.renderedHtml ? (
                <div className="prose prose-sm max-w-none border rounded-lg bg-card shadow-inner overflow-auto">
                  <div className="min-h-[300px] p-6" dangerouslySetInnerHTML={{ __html: contract.renderedHtml }} />
                </div>
              ) : (
                <p className="text-muted-foreground">No preview available</p>
              )}
              {contract.signedDocUrl && (
                <div className="mt-4">
                  <a
                    href={contract.signedDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Download signed copy
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
              <CardDescription>Latest activity for this contract.</CardDescription>
            </CardHeader>
            <CardContent>
              {contract.events.length === 0 ? (
                <p className="text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-4">
                  {contract.events.map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                        />
                        {index < contract.events.length - 1 && (
                          <div className="w-0.5 flex-1 bg-muted my-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium capitalize">{event.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(event.occurredAt)}
                        </p>
                        {event.description && (
                          <p className="text-sm text-foreground/80 mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
