'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import Link from 'next/link'

interface OnboardingFormData {
  employeeId: string
  startDate: string
  managerId: string
  emailProvider: 'PERSONAL' | 'GOOGLE_WORKSPACE' | 'CUSTOM'
  workEmail: string
  department?: string
  bonus?: string
  probationPeriod?: string
  jiraBoardId?: string
  jiraManager?: boolean
}

export default function NewOnboardingPage() {
  const router = useRouter()
  const [workEmailTouched, setWorkEmailTouched] = useState(false)
  const [departmentTouched, setDepartmentTouched] = useState(false)

  const { data: candidates } = trpc.employee.list.useQuery({
    limit: 500,
  })

  const { data: employees } = trpc.employee.list.useQuery({
    status: 'ACTIVE',
    limit: 100,
  })
  const { data: departments } = trpc.employee.getDepartments.useQuery()
  const { data: apps } = trpc.integration.listApps.useQuery()
  const { data: rules } = trpc.integration.listRules.useQuery()
  const jiraApp = apps?.find((app) => app.type === 'JIRA')
  type ProvisioningRule = NonNullable<typeof rules>[number]

  const startOnboarding = trpc.onboarding.startNew.useMutation({
    onSuccess: (data) => {
      router.push(`/onboarding/${data.id}`)
    },
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
      emailProvider: 'GOOGLE_WORKSPACE',
      workEmail: '',
      department: '',
      jiraBoardId: '',
      jiraManager: false,
    },
  })

  const selectedCandidateId = watch('employeeId')
  const selectedCandidate = candidates?.employees.find(e => e.id === selectedCandidateId)
  const selectedProvider = watch('emailProvider')
  const selectedDepartment = watch('department') || ''
  const selectedJiraBoardId = watch('jiraBoardId')
  const selectedJiraManager = watch('jiraManager')
  const hasDepartmentSelection = Boolean(selectedDepartment || selectedCandidate?.department)

  const departmentField = register('department')
  const workEmailField = register('workEmail')

  const companyDomain = process.env.NEXT_PUBLIC_COMPANY_DOMAIN || 'curacel.ai'

  const getSuggestedWorkEmail = (candidate?: { fullName?: string; personalEmail?: string } | null) => {
    if (!candidate) return ''
    const fullName = (candidate.fullName || '').trim()
    if (!fullName) {
      const personalEmail = candidate.personalEmail || ''
      return personalEmail ? personalEmail.replace(/@.+$/, `@${companyDomain}`) : ''
    }
    const parts = fullName.split(/\s+/)
    const first = parts[0].toLowerCase()
    const lastInitial = parts.length > 1 ? parts[parts.length - 1][0]?.toLowerCase() : ''
    const localPart = lastInitial ? `${first}.${lastInitial}` : first
    return `${localPart}@${companyDomain}`
  }

  const suggestedWorkEmail = useMemo(
    () => getSuggestedWorkEmail(selectedCandidate),
    [selectedCandidate, companyDomain]
  )

  const inferDepartment = (candidate?: { jobTitle?: string | null; department?: string | null }) => {
    if (!candidate) return ''
    if (candidate.department) return candidate.department
    const title = (candidate.jobTitle || '').toLowerCase()
    if (title.includes('engineer')) return 'Engineering'
    return ''
  }

  // Auto-fill work email based on provider
  const handleProviderChange = (value: OnboardingFormData['emailProvider']) => {
    if (value === 'PERSONAL' && selectedCandidate) {
      setWorkEmailTouched(false)
      setValue('workEmail', selectedCandidate.personalEmail || '')
      return
    }
    if (selectedCandidate && !workEmailTouched) {
      setValue('workEmail', getSuggestedWorkEmail(selectedCandidate))
      return
    }
    if (!selectedCandidate) {
      setValue('workEmail', '')
    }
  }

  useEffect(() => {
    setWorkEmailTouched(false)
    setDepartmentTouched(false)
  }, [selectedCandidateId])

  useEffect(() => {
    if (!selectedCandidate) return

    if (!departmentTouched) {
      const inferred = inferDepartment(selectedCandidate)
      if (inferred) {
        setValue('department', inferred)
      } else if (!selectedDepartment) {
        setValue('department', '')
      }
    }

    if (selectedProvider === 'PERSONAL') {
      setWorkEmailTouched(false)
      setValue('workEmail', selectedCandidate.personalEmail || '')
      return
    }

    if (!workEmailTouched) {
      setValue('workEmail', getSuggestedWorkEmail(selectedCandidate))
    }
  }, [
    selectedCandidateId,
    selectedCandidate,
    selectedProvider,
    selectedDepartment,
    departmentTouched,
    workEmailTouched,
    setValue,
  ])

  const effectiveEmployeeForRules = useMemo(() => {
    if (!selectedCandidate) return null
    const meta =
      selectedCandidate.meta && typeof selectedCandidate.meta === 'object' && !Array.isArray(selectedCandidate.meta)
        ? { ...(selectedCandidate.meta as Record<string, unknown>) }
        : {}
    if (selectedJiraBoardId) {
      meta.jiraBoardId = selectedJiraBoardId
    }
    if (selectedJiraManager) {
      meta.jiraManager = true
    }
    return {
      ...selectedCandidate,
      department: selectedDepartment || selectedCandidate.department,
      meta,
    }
  }, [selectedCandidate, selectedDepartment, selectedJiraBoardId, selectedJiraManager])

  const matchesProvisioningCondition = (
    employee: Record<string, unknown>,
    condition: Record<string, unknown>
  ) => {
    const meta =
      employee.meta && typeof employee.meta === 'object' && !Array.isArray(employee.meta)
        ? (employee.meta as Record<string, unknown>)
        : {}

    for (const [key, value] of Object.entries(condition)) {
      if (value === undefined || value === null) continue
      const employeeValue =
        employee[key] !== undefined ? employee[key] : meta[key]

      if (typeof employeeValue === 'string' && typeof value === 'string') {
        if (employeeValue.toLowerCase() !== value.toLowerCase()) return false
        continue
      }

      if (employeeValue !== value) return false
    }

    return true
  }

  const rulesByAppId = useMemo(() => {
    const map = new Map<string, ProvisioningRule[]>()
    if (!rules) return map
    for (const rule of rules) {
      if (!rule.isActive) continue
      const bucket = map.get(rule.appId) || []
      bucket.push(rule)
      map.set(rule.appId, bucket)
    }
    return map
  }, [rules])

  const appsWithRules = useMemo(() => {
    return (apps ?? []).filter((app) => (rulesByAppId.get(app.id) || []).length > 0)
  }, [apps, rulesByAppId])

  const matchedApps = useMemo(() => {
    if (!effectiveEmployeeForRules) return []
    return appsWithRules.filter((app) => {
      const appRules = rulesByAppId.get(app.id) || []
      return appRules.some((rule) =>
        matchesProvisioningCondition(effectiveEmployeeForRules, rule.condition as Record<string, unknown>)
      )
    })
  }, [appsWithRules, rulesByAppId, effectiveEmployeeForRules])

  const unmatchedApps = useMemo(() => {
    if (!effectiveEmployeeForRules) return []
    return appsWithRules.filter((app) => !matchedApps.some((matched) => matched.id === app.id))
  }, [appsWithRules, matchedApps, effectiveEmployeeForRules])

  const jiraRules = useMemo(() => {
    if (!jiraApp) return []
    return rulesByAppId.get(jiraApp.id) || []
  }, [jiraApp, rulesByAppId])

  const jiraNeedsBoard = jiraRules.some((rule) =>
    Object.prototype.hasOwnProperty.call(rule.condition as Record<string, unknown>, 'jiraBoardId')
  )
  const jiraNeedsManager = jiraRules.some((rule) =>
    Object.prototype.hasOwnProperty.call(rule.condition as Record<string, unknown>, 'jiraManager')
  )
  const showJiraAccess = jiraRules.length > 0 && (jiraNeedsBoard || jiraNeedsManager)

  const jiraBoardsQuery = trpc.integration.listJiraBoards.useQuery(jiraApp?.id, {
    enabled: Boolean(jiraApp?.id && showJiraAccess && jiraNeedsBoard),
  })

  const onSubmit = async (data: OnboardingFormData) => {
    try {
      await startOnboarding.mutateAsync({
        employeeId: data.employeeId,
        startDate: data.startDate,
        managerId: data.managerId || undefined,
        department: data.department || undefined,
        bonus: data.bonus || undefined,
        probationPeriod: data.probationPeriod || undefined,
        workEmail: data.workEmail || undefined,
        emailProvider: data.emailProvider,
        jiraBoardId: data.jiraBoardId || undefined,
        jiraManager: Boolean(data.jiraManager),
      })
    } catch (error) {
      console.error('Failed to start onboarding:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Onboard new employee</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Employee details</CardTitle>
            <CardDescription>Fill out the employee details here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Candidate */}
            <div>
              <Label htmlFor="employeeId" className="text-sm font-medium">
                Candidate <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="employeeId"
                control={control}
                rules={{ required: 'Candidate is required' }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select the candidate you are onboarding" />
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
              {errors.employeeId && (
                <p className="text-sm text-destructive mt-1">{errors.employeeId.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                You can add a new candidate <Link href="/employees?action=create" className="text-blue-600 hover:underline">here</Link>.
              </p>
            </div>

            {/* Start Date */}
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium">
                Start date
              </Label>
              <DatePicker
                id="startDate"
                {...register('startDate')}
                className="mt-1"
              />
            </div>

            {/* Line Manager */}
            <div>
              <Label htmlFor="managerId" className="text-sm font-medium">
                Line manager
              </Label>
              <Controller
                name="managerId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select line manager for this candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.fullName} {employee.jobTitle ? `- ${employee.jobTitle}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Department */}
            <div>
              <Label htmlFor="department" className="text-sm font-medium">
                Department
              </Label>
              <Input
                id="department"
                list="department-options"
                className="mt-1"
                placeholder="Select or type department"
                {...departmentField}
                onChange={(event) => {
                  setDepartmentTouched(true)
                  departmentField.onChange(event)
                }}
              />
              <datalist id="department-options">
                {(departments || []).map((department) => (
                  <option key={department} value={department} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-suggested from job title. You can adjust this if needed.
              </p>
            </div>

            {/* Contract Variables */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bonus" className="text-sm font-medium">
                  Bonus details
                </Label>
                <Input
                  id="bonus"
                  {...register('bonus')}
                  className="mt-1"
                  placeholder="e.g. Performance-based up to NGN 120,000"
                />
              </div>
              <div>
                <Label htmlFor="probationPeriod" className="text-sm font-medium">
                  Probation period
                </Label>
                <Input
                  id="probationPeriod"
                  {...register('probationPeriod')}
                  className="mt-1"
                  placeholder="e.g. 6 months"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work email</CardTitle>
            <CardDescription>Set up official email for the new employee.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Provider */}
            <div>
              <Label htmlFor="emailProvider" className="text-sm font-medium">
                Select email provider <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="emailProvider"
                control={control}
                rules={{ required: 'Email provider is required' }}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      handleProviderChange(value as OnboardingFormData['emailProvider'])
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select email provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOGLE_WORKSPACE">Google Workspace email</SelectItem>
                      <SelectItem value="PERSONAL">Personal email (use candidate email)</SelectItem>
                      <SelectItem value="CUSTOM">Custom email address</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.emailProvider && (
                <p className="text-sm text-destructive mt-1">{errors.emailProvider.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Personal uses the candidate&apos;s existing email. Google Workspace creates a company mailbox.
                Custom lets you edit the address.
              </p>
            </div>

            {/* Work Email Address */}
            <div>
              <Label htmlFor="workEmail" className="text-sm font-medium">
                Work email address
              </Label>
              <Input
                id="workEmail"
                type="email"
                {...workEmailField}
                onChange={(event) => {
                  setWorkEmailTouched(true)
                  workEmailField.onChange(event)
                }}
                className="mt-1"
                placeholder={suggestedWorkEmail || `name@${companyDomain}`}
                disabled={selectedProvider === 'PERSONAL'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Suggested format: first name + last initial (e.g. {suggestedWorkEmail || `jane.d@${companyDomain}`}).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>App provisioning</CardTitle>
            <CardDescription>
              Apps are selected automatically from provisioning rules based on the employee&apos;s attributes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selectedCandidate ? (
              <p className="text-sm text-muted-foreground">Select a candidate to preview provisioning.</p>
            ) : appsWithRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No provisioning rules have been configured yet.</p>
            ) : !hasDepartmentSelection ? (
              <p className="text-sm text-muted-foreground">Select a department to see which apps will be provisioned.</p>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">WILL PROVISION</p>
                  {matchedApps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No matched apps yet. Select a department to match provisioning rules.
                    </p>
                  ) : (
                    matchedApps.map((app) => (
                      <div key={app.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{app.name}</p>
                          <p className="text-xs text-muted-foreground">Matches provisioning rules</p>
                        </div>
                        <Badge variant="info">Will provision</Badge>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">NOT MATCHED</p>
                  {unmatchedApps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">All rule-based apps match this candidate.</p>
                  ) : (
                    unmatchedApps.map((app) => (
                      <div key={app.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{app.name}</p>
                          <p className="text-xs text-muted-foreground">No matching rule for this candidate</p>
                        </div>
                        <Badge variant="outline" className="text-foreground/80">Not provisioned</Badge>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {showJiraAccess && (
          <Card>
            <CardHeader>
              <CardTitle>Jira access</CardTitle>
              <CardDescription>
                Only shown when Jira provisioning rules require board or manager selection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!jiraApp ? (
                <p className="text-sm text-muted-foreground">Connect Jira in Settings to enable board selection.</p>
              ) : jiraNeedsBoard && jiraBoardsQuery.data?.error ? (
                <p className="text-sm text-destructive">{jiraBoardsQuery.data.error}</p>
              ) : (
                <>
                  {jiraNeedsBoard && (
                    <div>
                      <Label className="text-sm font-medium">Engineering team board</Label>
                      <Controller
                        name="jiraBoardId"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select Jira board" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No board</SelectItem>
                              {(jiraBoardsQuery.data?.boards || []).map((board) => (
                                <SelectItem key={board.id} value={String(board.id)}>
                                  {board.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Board selection is used by Jira provisioning rules to grant access.
                      </p>
                    </div>
                  )}

                  {jiraNeedsManager && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                      <div>
                        <Label className="text-sm font-medium">Manager access</Label>
                        <p className="text-xs text-muted-foreground">
                          Adds managers to all boards based on Jira rules.
                        </p>
                      </div>
                      <Controller
                        name="jiraManager"
                        control={control}
                        render={({ field }) => (
                          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={startOnboarding.isPending}>
            {startOnboarding.isPending ? 'Onboarding...' : 'Onboard new employee'}
          </Button>
        </div>
      </form>
    </div>
  )
}
