'use client'

import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Trash2,
  Edit,
  Cloud,
  MessageSquare,
  UserMinus,
  ExternalLink,
  FileText,
  Sparkles,
  Activity,
  Mail,
  Calendar,
  Star,
  Check,
  AlertCircle,
  TrendingUp,
  Target,
  Users,
  Brain,
  Award,
} from 'lucide-react'
import Link from 'next/link'
import {
  employeeStatusLabels,
  formatDate,
  getInitials,
} from '@/lib/utils'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

type EditEmployeeFormData = {
  fullName: string
  personalEmail: string
  workEmail: string
  jobTitle: string
  department: string
  location: string
  managerId: string
  status: string
  employmentType: string
  startDate: string
  endDate: string
  addressStreet: string
  addressCity: string
  addressState: string
  addressPostal: string
  addressCountry: string
  phone: string
  bankName: string
  accountName: string
  accountNumber: string
  accountSortCode: string
  emergencyContactName: string
  emergencyContactRelation: string
  emergencyContactPhone: string
  emergencyContactEmail: string
  profileImageUrl: string
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string

  const { data: employee, isLoading, refetch } = trpc.employee.getById.useQuery(employeeId)
  const { data: existingOffboarding } = trpc.offboarding.getByEmployee.useQuery(employeeId)
  const { data: journeyData } = trpc.employee.getEmployeeJourney.useQuery(employeeId, {
    enabled: !!employeeId,
  })

  const [offboardingOpen, setOffboardingOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [isImmediate, setIsImmediate] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [googleDeleteAccount, setGoogleDeleteAccount] = useState(false)
  const [googleTransferToEmail, setGoogleTransferToEmail] = useState('')
  const [googleTransferApps, setGoogleTransferApps] = useState<string[]>(['drive', 'calendar'])
  const [googleAliasToEmail, setGoogleAliasToEmail] = useState('')
  const [googleAliasSearch, setGoogleAliasSearch] = useState('')
  const [aliasDropdownOpen, setAliasDropdownOpen] = useState(false)
  const [transferDropdownOpen, setTransferDropdownOpen] = useState(false)
  const [transferSearch, setTransferSearch] = useState('')
  const [transferEnabled, setTransferEnabled] = useState(true)
  const [profileUploadError, setProfileUploadError] = useState<string | null>(null)

  const updateEmployee = trpc.employee.update.useMutation({
    onSuccess: () => {
      setEditDialogOpen(false)
      refetch()
    },
  })

  const startOffboarding = trpc.offboarding.start.useMutation({
    onSuccess: (workflow) => {
      setOffboardingOpen(false)
      router.push(`/offboarding/${workflow.id}`)
    },
  })
  const { data: organization } = trpc.organization.get.useQuery()
  const { data: activeEmployees } = trpc.employee.list.useQuery({
    status: 'ACTIVE',
    limit: 200,
  })
  const { data: teams } = trpc.team.listForSelect.useQuery()
  const googleUsersQuery = trpc.integration.listGoogleWorkspaceUsers.useQuery()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditEmployeeFormData>({
    defaultValues: {
      fullName: '',
      personalEmail: '',
      workEmail: '',
      jobTitle: '',
      department: '',
      location: '',
      managerId: 'none',
      status: 'ACTIVE',
      employmentType: '',
      startDate: '',
      endDate: '',
      addressStreet: '',
      addressCity: '',
      addressState: '',
      addressPostal: '',
      addressCountry: '',
      phone: '',
      bankName: '',
      accountName: '',
      accountNumber: '',
      accountSortCode: '',
      emergencyContactName: '',
      emergencyContactRelation: '',
      emergencyContactPhone: '',
      emergencyContactEmail: '',
      profileImageUrl: '',
    },
  })

  const googleUsers = googleUsersQuery.data?.users ?? []
  const filteredGoogleUsers = googleUsers
    .filter((user) => user.email !== employee?.workEmail)
    .filter((user) => {
      const query = googleAliasSearch.trim().toLowerCase()
      if (!query) return true
      return user.email.toLowerCase().includes(query) || user.name.toLowerCase().includes(query)
    })
  const filteredTransferUsers = googleUsers
    .filter((user) => user.email !== employee?.workEmail)
    .filter((user) => {
      const query = transferSearch.trim().toLowerCase()
      if (!query) return true
      return user.email.toLowerCase().includes(query) || user.name.toLowerCase().includes(query)
    })

  const statusValue = watch('status')
  const employmentTypeValue = watch('employmentType')
  const managerValue = watch('managerId')
  const departmentValue = watch('department')
  const profileImagePreview = watch('profileImageUrl')

  const toDateInputValue = (value?: string | Date | null) => {
    if (!value) return ''
    const dateValue = typeof value === 'string' ? new Date(value) : value
    if (Number.isNaN(dateValue.getTime())) return ''
    return dateValue.toISOString().slice(0, 10)
  }

  useEffect(() => {
    if (!editDialogOpen || !employee) return
    reset({
      fullName: employee.fullName || '',
      personalEmail: employee.personalEmail || '',
      workEmail: employee.workEmail || '',
      jobTitle: employee.jobTitle || '',
      department: employee.department || '',
      location: employee.location || '',
      managerId: employee.managerId || 'none',
      status: employee.status || 'ACTIVE',
      employmentType: employee.employmentType || '',
      startDate: toDateInputValue(employee.startDate),
      endDate: toDateInputValue(employee.endDate),
      addressStreet: employee.addressStreet || '',
      addressCity: employee.addressCity || '',
      addressState: employee.addressState || '',
      addressPostal: employee.addressPostal || '',
      addressCountry: employee.addressCountry || '',
      phone: employee.phone || '',
      bankName: employee.bankName || '',
      accountName: employee.accountName || '',
      accountNumber: employee.accountNumber || '',
      accountSortCode: employee.accountSortCode || '',
      emergencyContactName: employee.emergencyContactName || '',
      emergencyContactRelation: employee.emergencyContactRelation || '',
      emergencyContactPhone: employee.emergencyContactPhone || '',
      emergencyContactEmail: employee.emergencyContactEmail || '',
      profileImageUrl: employee.profileImageUrl || '',
    })
    setProfileUploadError(null)
  }, [editDialogOpen, employee, reset])

  const handleProfileImage = async (file?: File) => {
    setProfileUploadError(null)
    if (!file) {
      setValue('profileImageUrl', '')
      return
    }
    if (!file.type.startsWith('image/')) {
      setProfileUploadError('Please upload an image file (PNG, JPG).')
      return
    }
    const maxSizeMb = 2
    if (file.size > maxSizeMb * 1024 * 1024) {
      setProfileUploadError(`Max file size is ${maxSizeMb}MB.`)
      return
    }
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`
    setValue('profileImageUrl', dataUrl)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Employee not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success/10 text-success'
      case 'OFFBOARDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'EXITED':
        return 'bg-muted text-foreground'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const activeOffboarding =
    existingOffboarding && ['PENDING', 'IN_PROGRESS'].includes(existingOffboarding.status)

  const onUpdateEmployee = (values: EditEmployeeFormData) => {
    if (!employee) return

    const emptyToNull = (value: string) => {
      const trimmed = value.trim()
      return trimmed ? trimmed : null
    }
    const profileImageValue = values.profileImageUrl ? values.profileImageUrl.trim() : ''

    updateEmployee.mutate({
      id: employee.id,
      fullName: values.fullName.trim(),
      personalEmail: values.personalEmail.trim(),
      workEmail: emptyToNull(values.workEmail),
      jobTitle: emptyToNull(values.jobTitle),
      department: emptyToNull(values.department),
      location: emptyToNull(values.location),
      managerId: values.managerId === 'none' ? null : values.managerId,
      status: (values.status || undefined) as "CANDIDATE" | "OFFER_SENT" | "OFFER_SIGNED" | "HIRED_PENDING_START" | "ACTIVE" | "OFFBOARDING" | "EXITED" | undefined,
      employmentType: (values.employmentType || undefined) as "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | undefined,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      addressStreet: emptyToNull(values.addressStreet),
      addressCity: emptyToNull(values.addressCity),
      addressState: emptyToNull(values.addressState),
      addressPostal: emptyToNull(values.addressPostal),
      addressCountry: emptyToNull(values.addressCountry),
      phone: emptyToNull(values.phone),
      bankName: emptyToNull(values.bankName),
      accountName: emptyToNull(values.accountName),
      accountNumber: emptyToNull(values.accountNumber),
      accountSortCode: emptyToNull(values.accountSortCode),
      emergencyContactName: emptyToNull(values.emergencyContactName),
      emergencyContactRelation: emptyToNull(values.emergencyContactRelation),
      emergencyContactPhone: emptyToNull(values.emergencyContactPhone),
      emergencyContactEmail: emptyToNull(values.emergencyContactEmail),
      profileImageUrl: profileImageValue || null,
    })
  }

  return (
    <div className="py-3 sm:py-6 -mx-3 sm:-mx-4 md:-mx-6 px-2 sm:px-3 md:px-4">
      {/* Header Card */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Avatar */}
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-success flex-shrink-0">
              <AvatarImage
                src={employee.profileImageUrl || employee.user?.image || ''}
                alt={employee.fullName}
                className="rounded-xl"
              />
              <AvatarFallback className="bg-success text-white text-xl sm:text-2xl font-semibold rounded-xl">
                {getInitials(employee.fullName)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl font-semibold">{employee.fullName}</h1>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3">
                {employee.workEmail && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{employee.workEmail}</span>
                  </span>
                )}
                {employee.startDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    {formatDate(employee.startDate)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {employee.jobTitle && (
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs">{employee.jobTitle}</Badge>
                )}
                <Badge className="bg-success/10 text-success hover:bg-success/10 text-xs">
                  {employeeStatusLabels[employee.status] || employee.status}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex sm:flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="flex-1 sm:flex-none w-full text-xs sm:text-sm rounded-full border-border/60 px-4 py-2 hover:bg-muted/40"
              >
                <Edit className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Update Profile</span>
              </Button>
              {activeOffboarding ? (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10 flex-1 sm:flex-none w-full text-xs sm:text-sm rounded-full px-4 py-2"
                >
                  <Link href={`/offboarding/${existingOffboarding.id}`}>
                    <UserMinus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">View Offboarding</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10 flex-1 sm:flex-none w-full text-xs sm:text-sm rounded-full px-4 py-2"
                  onClick={() => {
                    setIsImmediate(false)
                    setEndDate(employee.endDate ? new Date(employee.endDate).toISOString().slice(0, 10) : '')
                    setReason('')
                    setNotes('')
                    setGoogleDeleteAccount(false)
                    setGoogleTransferToEmail(organization?.googleWorkspaceTransferToEmail || 'admin@curacel.ai')
                    setTransferSearch(organization?.googleWorkspaceTransferToEmail || 'admin@curacel.ai')
                    setTransferEnabled(true)
                    setGoogleTransferApps(['drive', 'calendar'])
                    setGoogleAliasToEmail('')
                    setOffboardingOpen(true)
                  }}
                  disabled={employee.status === 'EXITED'}
                >
                  <UserMinus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Start Offboarding</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mb-6">
        <div className="overflow-x-auto">
          <TabsList className="flex w-full justify-start gap-6 border-b bg-transparent p-0">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-xs sm:text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 data-[state=active]:border-primary data-[state=active]:text-primary">
              Overview
            </TabsTrigger>
            <TabsTrigger value="personal" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-xs sm:text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 data-[state=active]:border-primary data-[state=active]:text-primary">
              Personal
            </TabsTrigger>
            <TabsTrigger value="employment" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-xs sm:text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 data-[state=active]:border-primary data-[state=active]:text-primary">
              Employment
            </TabsTrigger>
            <TabsTrigger value="personality" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-xs sm:text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 data-[state=active]:border-primary data-[state=active]:text-primary">
              Personality
            </TabsTrigger>
            <TabsTrigger value="auntypelz" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-xs sm:text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 data-[state=active]:border-primary data-[state=active]:text-primary">
              AuntyPelz
            </TabsTrigger>
            <TabsTrigger value="contract" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-xs sm:text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 data-[state=active]:border-primary data-[state=active]:text-primary">
              Contract
            </TabsTrigger>
            <TabsTrigger value="applications" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-xs sm:text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 data-[state=active]:border-primary data-[state=active]:text-primary">
              Applications
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Main Column */}
            <div className="space-y-4">
              {/* AuntyPelz Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    AuntyPelz Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    AI-powered employee summary coming soon.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Column */}
            <div className="space-y-4">
              {/* Employee Progression */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Stage Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {journeyData && journeyData.timeline.length > 0 ? (
                    <div className="relative space-y-0">
                      {journeyData.timeline.map((event, index) => {
                        const isLast = index === journeyData.timeline.length - 1
                        const isCompleted = event.status === 'COMPLETED' || event.type === 'application' || event.type === 'hire' || event.type === 'promotion'
                        const isCurrent = index === journeyData.timeline.length - 1

                        return (
                          <div key={event.id} className="relative flex items-start gap-4 pb-8 last:pb-0">
                            {/* Vertical line */}
                            {!isLast && (
                              <div className="absolute left-6 top-12 w-0.5 h-full -ml-px bg-border" />
                            )}

                            {/* Circle with checkmark */}
                            <div
                              className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
                                isCurrent
                                  ? 'bg-indigo-600 shadow-lg shadow-indigo-200'
                                  : isCompleted
                                  ? 'bg-muted'
                                  : 'bg-muted'
                              }`}
                            >
                              <Check
                                className={`h-5 w-5 ${
                                  isCurrent ? 'text-white' : 'text-foreground'
                                }`}
                              />
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-1.5">
                              <p className="font-medium text-base text-foreground">
                                {event.title}
                              </p>
                              {event.date && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {formatDate(event.date)}
                                </p>
                              )}
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {event.description}
                                </p>
                              )}
                              {event.score && (
                                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-success/10 rounded text-xs font-medium text-success">
                                  Score: {event.score}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {journeyData?.candidateData
                        ? 'Loading employee journey...'
                        : 'Employee was not hired through the recruiting system. Progression tracking starts from hire date.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal" className="mt-6">
          <div className="space-y-4">
              {/* Personal Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Details</CardTitle>
                  <CardDescription>Employee&apos;s personal details and information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="text-sm font-medium">{employee.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.gender || 'Gender not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Marital Status</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.maritalStatus || 'Marital status not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.dateOfBirth ? formatDate(employee.dateOfBirth) : 'Date of birth not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nationality</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.nationality || 'Nationality not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tax ID</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.taxId || 'Tax ID not specified'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Details</CardTitle>
                  <CardDescription>Address and emergency contact information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Home Address</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {[
                          employee.addressStreet,
                          employee.addressCity,
                          employee.addressState,
                          employee.addressPostal,
                          employee.addressCountry,
                        ]
                          .filter(Boolean)
                          .join(', ') || 'home address not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Personal Email</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.personalEmail || 'personal email not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mobile Phone</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.phone || 'phone number not specified'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-semibold mb-2">Emergency Contact</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="text-sm font-medium text-muted-foreground">
                            {employee.emergencyContactName || 'contact name not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="text-sm font-medium text-muted-foreground">
                            {employee.emergencyContactPhone || 'contact phone number not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Relationship</p>
                          <p className="text-sm font-medium text-muted-foreground">
                            {employee.emergencyContactRelation || 'relationship not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="text-sm font-medium text-muted-foreground">
                            {employee.emergencyContactEmail || 'contact email not specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bank Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Bank Details</CardTitle>
                  <CardDescription>Employee&apos;s banks details and information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Name</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.bankName || 'Bank name not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account name</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.accountName || 'Account name not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account number</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.accountNumber || 'Account number not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account sort code</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.accountSortCode || 'Sort code not specified'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
          </div>
        </TabsContent>

        {/* Employment Tab */}
        <TabsContent value="employment" className="mt-6">
          <div className="space-y-4">
              {/* Employment Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                  <CardDescription>Employment details and terms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Job Title</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.jobTitle || 'job title not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Manager</p>
                      <p className="text-sm font-medium">
                        {employee.manager?.fullName || 'Manager not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Start date</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.startDate ? formatDate(employee.startDate) : 'start date not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contract end date</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.endDate ? formatDate(employee.endDate) : 'end date not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Probation end</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        probation date not specified
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Employment Type</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {employee.employmentType || 'employment type not specified'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(employee.status)}>
                        {employeeStatusLabels[employee.status] || employee.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contract Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Contract Details</CardTitle>
                  <CardDescription>Employment contract details and terms</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-4">No contract offer found</p>
                </CardContent>
              </Card>

              {/* Former Employment (for full-time employees) */}
              {employee.employmentType === 'FULL_TIME' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Former Employment</CardTitle>
                    <CardDescription>Previous employment documentation and references</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {employee.formerEmploymentSubmittedAt ? (
                      <>
                        {/* Documents */}
                        {(employee.formerOfferLetterUrl || employee.formerLastPayslipUrl ||
                          employee.formerResignationLetterUrl || employee.formerResignationConfirmUrl) && (
                          <div>
                            <h4 className="font-semibold text-sm mb-3">Employment Documents</h4>
                            <div className="grid gap-3 md:grid-cols-2">
                              {employee.formerOfferLetterUrl && (
                                <a
                                  href={employee.formerOfferLetterUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors"
                                >
                                  <FileText className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm flex-1">Offer Letter</span>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </a>
                              )}
                              {employee.formerLastPayslipUrl && (
                                <a
                                  href={employee.formerLastPayslipUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors"
                                >
                                  <FileText className="h-4 w-4 text-success" />
                                  <span className="text-sm flex-1">Last Payslip</span>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </a>
                              )}
                              {employee.formerResignationLetterUrl && (
                                <a
                                  href={employee.formerResignationLetterUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors"
                                >
                                  <FileText className="h-4 w-4 text-amber-600" />
                                  <span className="text-sm flex-1">Resignation Letter</span>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </a>
                              )}
                              {employee.formerResignationConfirmUrl && (
                                <a
                                  href={employee.formerResignationConfirmUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors"
                                >
                                  <FileText className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm flex-1">Resignation Confirmation</span>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* HR Contact Details */}
                        {(employee.formerHrContactName || employee.formerHrContactPhone ||
                          employee.formerHrContactEmail || employee.formerCompanyAddress) && (
                          <div>
                            <h4 className="font-semibold text-sm mb-3">HR Contact for Employment Verification</h4>
                            <div className="grid gap-3 md:grid-cols-2">
                              {employee.formerHrContactName && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Contact Name</p>
                                  <p className="text-sm font-medium">{employee.formerHrContactName}</p>
                                </div>
                              )}
                              {employee.formerHrContactPhone && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Phone Number</p>
                                  <p className="text-sm font-medium">{employee.formerHrContactPhone}</p>
                                </div>
                              )}
                              {employee.formerHrContactEmail && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Email Address</p>
                                  <p className="text-sm font-medium">{employee.formerHrContactEmail}</p>
                                </div>
                              )}
                              {employee.formerCompanyAddress && (
                                <div className="md:col-span-2">
                                  <p className="text-xs text-muted-foreground">Company Address</p>
                                  <p className="text-sm font-medium whitespace-pre-wrap">{employee.formerCompanyAddress}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Show message if no documents or contacts were provided */}
                        {!employee.formerOfferLetterUrl && !employee.formerLastPayslipUrl &&
                          !employee.formerResignationLetterUrl && !employee.formerResignationConfirmUrl &&
                          !employee.formerHrContactName && !employee.formerHrContactPhone &&
                          !employee.formerHrContactEmail && !employee.formerCompanyAddress && (
                          <p className="text-center text-muted-foreground py-4">No former employment documents or contacts provided</p>
                        )}
                      </>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No former employment data submitted yet</p>
                    )}
                  </CardContent>
                </Card>
              )}
          </div>
        </TabsContent>

        {/* Personality Tab */}
        <TabsContent value="personality" className="mt-6">
          <div className="space-y-4">
              {/* MBTI */}
              <Card>
                <CardHeader>
                  <CardTitle>Myers-Briggs Type Indicator (MBTI)</CardTitle>
                  <CardDescription>Personality type and test results</CardDescription>
                </CardHeader>
                <CardContent>
                  {employee.mbtiType || employee.mbtiImageUrl ? (
                    <div className="space-y-4">
                      {employee.mbtiType && (
                        <div>
                          <p className="text-sm text-muted-foreground">MBTI Type</p>
                          <p className="text-2xl font-bold text-primary">{employee.mbtiType}</p>
                        </div>
                      )}
                      {employee.mbtiImageUrl && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Test Result</p>
                          <a
                            href={employee.mbtiImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <img
                              src={employee.mbtiImageUrl}
                              alt="MBTI Test Result"
                              className="max-w-sm rounded border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No MBTI data recorded yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Big Five */}
              <Card>
                <CardHeader>
                  <CardTitle>Big Five Personality Test</CardTitle>
                  <CardDescription>Big Five test results and analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {employee.bigFiveUrl || employee.bigFiveImageUrl ? (
                    <div className="space-y-4">
                      {employee.bigFiveUrl && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Test Results</p>
                          <a
                            href={employee.bigFiveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View Full Results
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      )}
                      {employee.bigFiveImageUrl && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Result Screenshot</p>
                          <a
                            href={employee.bigFiveImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <img
                              src={employee.bigFiveImageUrl}
                              alt="Big Five Test Result"
                              className="max-w-sm rounded border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No Big Five data recorded yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Priority Hierarchy */}
              <Card>
                <CardHeader>
                  <CardTitle>Priority Hierarchy</CardTitle>
                  <CardDescription>Life values organized by priority</CardDescription>
                </CardHeader>
                <CardContent>
                  {employee.lifeValues && typeof (employee.lifeValues as any).mostImportant === 'string' ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Most Important */}
                      {((employee.lifeValues as any).mostImportant || '').trim() && (
                        <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
                          <h4 className="font-semibold text-sm mb-2 text-primary">Most important (non-negotiable)</h4>
                          <p className="text-sm whitespace-pre-wrap">{(employee.lifeValues as any).mostImportant}</p>
                        </div>
                      )}

                      {/* Important */}
                      {((employee.lifeValues as any).important || '').trim() && (
                        <div className="border-2 border-blue-400 rounded-lg p-4 bg-blue-50">
                          <h4 className="font-semibold text-sm mb-2 text-blue-700">Important (slightly negotiable)</h4>
                          <p className="text-sm whitespace-pre-wrap">{(employee.lifeValues as any).important}</p>
                        </div>
                      )}

                      {/* Somewhat Important */}
                      {((employee.lifeValues as any).somewhatImportant || '').trim() && (
                        <div className="border-2 border-warning/30 rounded-lg p-4 bg-warning/10">
                          <h4 className="font-semibold text-sm mb-2 text-warning">Somewhat important (negotiable)</h4>
                          <p className="text-sm whitespace-pre-wrap">{(employee.lifeValues as any).somewhatImportant}</p>
                        </div>
                      )}

                      {/* Not Important */}
                      {((employee.lifeValues as any).notImportant || '').trim() && (
                        <div className="border-2 border-border rounded-lg p-4 bg-muted/50">
                          <h4 className="font-semibold text-sm mb-2 text-foreground/80">Not Important (highly negotiable/doesn't matter)</h4>
                          <p className="text-sm whitespace-pre-wrap">{(employee.lifeValues as any).notImportant}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No priority hierarchy recorded yet</p>
                  )}
                </CardContent>
              </Card>

              {/* What You Should Know About Me */}
              <Card>
                <CardHeader>
                  <CardTitle>What You Should Know About Me</CardTitle>
                  <CardDescription>Work style preferences and communication tips</CardDescription>
                </CardHeader>
                <CardContent>
                  {employee.knowAboutMe && (employee.knowAboutMe as Array<{ question: string; answer: string }>).length > 0 ? (
                    <div className="space-y-4">
                      {(employee.knowAboutMe as Array<{ question: string; answer: string }>).map((item, index) => (
                        <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                          <p className="text-sm font-medium text-foreground">{item.question}</p>
                          <p className="text-sm text-foreground/80 mt-1">{item.answer}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No work style preferences recorded yet</p>
                  )}
                </CardContent>
              </Card>

            {!employee.personalityCompleted && (
              <div className="text-center text-sm text-muted-foreground py-4">
                This employee has not completed their personality profile during onboarding.
              </div>
            )}
          </div>
        </TabsContent>

        {/* AuntyPelz Analysis Tab */}
        <TabsContent value="auntypelz" className="mt-6">
          <div className="space-y-4">
              {/* Overall Assessment */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-indigo-600" />
                    Overall Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {employee.fullName} is a {employee.jobTitle?.toLowerCase() || 'team member'} in the {employee.department || 'organization'} who has been with the company since {employee.startDate ? formatDate(employee.startDate) : 'their start date'}.
                    {employee.mbtiType && ` With an ${employee.mbtiType} personality type, they bring unique strengths to their role.`}
                    {' '}AI-powered comprehensive analysis will provide deeper insights into their career trajectory, performance, and team dynamics.
                  </p>
                </CardContent>
              </Card>

              {/* Career Trajectory & Growth */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Career Trajectory & Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Progression Path</h4>
                      <div className="space-y-3">
                        {employee.startDate && (
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <Check className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Joined as {employee.jobTitle || 'Team Member'}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(employee.startDate)}</p>
                            </div>
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          <p>Career progression data and promotion history will be tracked here. Analysis includes:</p>
                          <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                            <li>Time to promotion relative to peers</li>
                            <li>Skills acquisition rate</li>
                            <li>Leadership development trajectory</li>
                            <li>Cross-functional experience</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-2">Growth Indicators</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 border rounded-lg">
                          <p className="text-xs text-muted-foreground">Tenure</p>
                          <p className="text-lg font-bold text-foreground">
                            {employee.startDate ? Math.floor((new Date().getTime() - new Date(employee.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0} months
                          </p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <p className="text-xs text-muted-foreground">Team Size</p>
                          <p className="text-lg font-bold text-foreground">
                            {employee._count?.directReports || 0} {employee._count?.directReports === 1 ? 'report' : 'reports'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strengths & Achievements */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Strengths & Key Contributions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {employee.mbtiType && (
                      <div className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Personality Type: {employee.mbtiType}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Brings structured thinking and strategic perspective to problem-solving
                          </p>
                        </div>
                      </div>
                    )}

                    {employee.department && (
                      <div className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Department Expertise</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Deep knowledge in {employee.department} domain
                          </p>
                        </div>
                      </div>
                    )}

                    {employee.employmentType === 'FULL_TIME' && (
                      <div className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Commitment & Dedication</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Full-time contributor with strong organizational alignment
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-2">Future AI Analysis Will Include:</p>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>Specific achievements and delivered projects</li>
                        <li>Performance review highlights</li>
                        <li>Peer feedback and 360 review insights</li>
                        <li>Technical or domain expertise demonstrated</li>
                        <li>Leadership and mentorship contributions</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills Development */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    Skills & Development
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Current Skill Profile</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Skills will be tracked from application, training completions, and performance assessments.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-3">Skill Gaps & Development Needs</h4>
                      <div className="space-y-2">
                        <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg">
                          <p className="text-xs font-medium text-amber-900 mb-1">Recommended Focus Areas</p>
                          <p className="text-xs text-amber-800">
                            AI will analyze role requirements vs current skills to identify development opportunities
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-3">Learning & Development</h4>
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-2">Integration with Learning Platforms:</p>
                        <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                          <li>Courses completed and certifications earned</li>
                          <li>Training hours and learning velocity</li>
                          <li>Skill acquisition timeline</li>
                          <li>Recommended learning paths</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Areas for Development */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-600" />
                    Areas for Development
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-foreground/80">
                      AuntyPelz will identify growth opportunities based on:
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Performance Feedback</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Recurring themes from 1-on-1s and performance reviews
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Skill Gaps</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Comparison with role requirements and career goals
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Growth Opportunities</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Leadership, technical depth, or cross-functional experience
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 mb-1">Personalized Development Plan</p>
                      <p className="text-xs text-blue-800">
                        AI-generated recommendations for courses, projects, and experiences to accelerate growth
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Fit & Collaboration */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Team Fit & Collaboration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {employee.lifeValues && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Values Alignment</h4>
                        <p className="text-sm text-muted-foreground">
                          Analysis of life values and company culture fit based on onboarding survey responses.
                        </p>
                      </div>
                    )}

                    {employee.knowAboutMe && (employee.knowAboutMe as any[]).length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Work Style Preferences</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Insights from "What You Should Know About Me" responses help team members collaborate effectively.
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold text-sm mb-3">Collaboration Metrics</h4>
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-2">Integration with Slack & Communication Tools:</p>
                        <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                          <li>Cross-team collaboration patterns</li>
                          <li>Communication frequency and channels</li>
                          <li>Response times and engagement levels</li>
                          <li>Network centrality and influence</li>
                        </ul>
                      </div>
                    </div>

                    {employee.manager && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Reporting Structure</h4>
                        <div className="p-3 border rounded-lg">
                          <p className="text-xs text-muted-foreground">Reports to</p>
                          <p className="text-sm font-medium">{employee.manager.fullName}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Insights (Placeholder) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Performance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-foreground/80">
                      Comprehensive performance analysis will be available upon integration with performance management systems.
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <h5 className="text-xs font-semibold mb-2">Performance Review Integration</h5>
                        <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                          <li>Goal achievement rates and progress</li>
                          <li>Performance rating trends over time</li>
                          <li>Manager and peer feedback themes</li>
                          <li>Improvement areas and action plans</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <h5 className="text-xs font-semibold mb-2">Productivity Metrics</h5>
                        <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                          <li>Project delivery timeline accuracy</li>
                          <li>Code quality and review metrics (for engineers)</li>
                          <li>Customer satisfaction scores (for customer-facing roles)</li>
                          <li>Innovation and initiative contributions</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analysis Status */}
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-indigo-900 mb-1">Comprehensive AI Analysis Coming Soon</h4>
                    <p className="text-xs text-indigo-800">
                      AuntyPelz will automatically analyze {employee.fullName}'s complete employee profile, including:
                    </p>
                    <ul className="text-xs text-indigo-800 mt-2 space-y-1 ml-4 list-disc">
                      <li>Career progression from candidacy to current role</li>
                      <li>Skills development and training history</li>
                      <li>Performance trends and feedback analysis</li>
                      <li>Team collaboration and communication patterns</li>
                      <li>Personalized growth recommendations</li>
                    </ul>
                  </div>
                </div>
              </div>
          </div>
        </TabsContent>

        {/* Contract Tab */}
        <TabsContent value="contract" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
              <CardDescription>Employment contract details and terms</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-4">No contract offer found</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="mt-6">
          <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Provisioned applications</CardTitle>
                  <CardDescription>Provisioned accounts and status</CardDescription>
                </CardHeader>
                <CardContent>
                  {employee.appAccounts && employee.appAccounts.length > 0 ? (
                    <div className="space-y-4">
                      {employee.appAccounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4 flex-1">
                            {account.app.type === 'GOOGLE_WORKSPACE' ? (
                              <Cloud className="h-8 w-8 text-blue-500" />
                            ) : account.app.type === 'SLACK' ? (
                              <MessageSquare className="h-8 w-8 text-purple-500" />
                            ) : (
                              <Cloud className="h-8 w-8 text-muted-foreground" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{account.app.name}</p>
                              <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                {account.provisionedAt && (
                                  <span>Created: {formatDate(account.provisionedAt)}</span>
                                )}
                                {account.deprovisionedAt && (
                                  <span className="text-destructive">
                                    Deprovisioned: {formatDate(account.deprovisionedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {account.deprovisionedAt && (
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No provisioned applications</p>
                  )}
                </CardContent>
              </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <form onSubmit={handleSubmit(onUpdateEmployee)}>
            <DialogHeader>
              <DialogTitle>Update employee profile</DialogTitle>
              <DialogDescription>Update personal and employment details for {employee.fullName}.</DialogDescription>
            </DialogHeader>
            <input type="hidden" {...register('profileImageUrl')} />
            {updateEmployee.error ? (
              <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {updateEmployee.error.message}
              </div>
            ) : null}
            <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-6 py-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Basic details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Full name *</Label>
                    <Input
                      id="fullName"
                      {...register('fullName', { required: 'Full name is required' })}
                    />
                    {errors.fullName ? (
                      <p className="text-xs text-destructive">{errors.fullName.message}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="personalEmail">Personal email *</Label>
                    <Input
                      id="personalEmail"
                      type="email"
                      {...register('personalEmail', { required: 'Personal email is required' })}
                    />
                    {errors.personalEmail ? (
                      <p className="text-xs text-destructive">{errors.personalEmail.message}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="workEmail">Work email</Label>
                    <Input id="workEmail" type="email" {...register('workEmail')} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Profile photo</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profileImagePreview || ''} alt={employee.fullName} />
                        <AvatarFallback className="text-xs">
                          {getInitials(employee.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleProfileImage(e.target.files?.[0])}
                          className="text-sm"
                        />
                        {profileUploadError ? (
                          <p className="text-xs text-destructive">{profileUploadError}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Max file size 2MB.</p>
                        )}
                        {profileImagePreview ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setValue('profileImageUrl', '')}
                          >
                            Remove photo
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Employment</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="jobTitle">Job title</Label>
                    <Input id="jobTitle" {...register('jobTitle')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="department">Team / Department</Label>
                    <Select value={departmentValue || 'none'} onValueChange={(value) => setValue('department', value === 'none' ? '' : value)}>
                      <SelectTrigger id="department">
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
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" {...register('location')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="managerId">Manager</Label>
                    <Select value={managerValue} onValueChange={(value) => setValue('managerId', value)}>
                      <SelectTrigger id="managerId">
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No manager</SelectItem>
                        {(activeEmployees?.employees || [])
                          .filter((manager) => manager.id !== employee.id)
                          .map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.fullName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusValue} onValueChange={(value) => setValue('status', value)}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(employeeStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="employmentType">Employment type</Label>
                    <Select value={employmentTypeValue} onValueChange={(value) => setValue('employmentType', value)}>
                      <SelectTrigger id="employmentType">
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full time</SelectItem>
                        <SelectItem value="PART_TIME">Part time</SelectItem>
                        <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start date</Label>
                    <Input id="startDate" type="date" {...register('startDate')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End date</Label>
                    <Input id="endDate" type="date" {...register('endDate')} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Contact</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 grid gap-2">
                    <Label htmlFor="addressStreet">Street address</Label>
                    <Input id="addressStreet" {...register('addressStreet')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="addressCity">City</Label>
                    <Input id="addressCity" {...register('addressCity')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="addressState">State/Province</Label>
                    <Input id="addressState" {...register('addressState')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="addressPostal">Postal code</Label>
                    <Input id="addressPostal" {...register('addressPostal')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="addressCountry">Country</Label>
                    <Input id="addressCountry" {...register('addressCountry')} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input id="phone" type="tel" {...register('phone')} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Bank details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="bankName">Bank name</Label>
                    <Input id="bankName" {...register('bankName')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accountName">Account name</Label>
                    <Input id="accountName" {...register('accountName')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accountNumber">Account number</Label>
                    <Input id="accountNumber" {...register('accountNumber')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accountSortCode">Sort code</Label>
                    <Input id="accountSortCode" {...register('accountSortCode')} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Emergency contact</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="emergencyContactName">Contact name</Label>
                    <Input id="emergencyContactName" {...register('emergencyContactName')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContactRelation">Relationship</Label>
                    <Input id="emergencyContactRelation" {...register('emergencyContactRelation')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContactPhone">Phone number</Label>
                    <Input id="emergencyContactPhone" type="tel" {...register('emergencyContactPhone')} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="emergencyContactEmail">Email</Label>
                    <Input id="emergencyContactEmail" type="email" {...register('emergencyContactEmail')} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateEmployee.isPending}>
                {updateEmployee.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={offboardingOpen} onOpenChange={setOffboardingOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Start offboarding</DialogTitle>
            <DialogDescription>Schedule or start immediate offboarding for {employee.fullName}.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium">Immediate offboarding</Label>
                    <p className="text-xs text-muted-foreground">Run automated tasks immediately.</p>
                  </div>
                  <Switch checked={isImmediate} onCheckedChange={setIsImmediate} />
                </div>

                {!isImmediate ? (
                  <div>
                    <Label htmlFor="endDate" className="text-sm font-medium">Last day (optional)</Label>
                    <DatePicker
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                ) : null}

                <div>
                  <Label htmlFor="reason" className="text-sm font-medium">Reason</Label>
                  <Input
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                    placeholder="Optional reason (e.g. resignation, termination)"
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                    placeholder="Optional internal notes"
                  />
                </div>

                <div className="rounded-lg border p-4 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Google Workspace offboarding</Label>
                    <p className="text-xs text-muted-foreground">
                      Delete the account, transfer Drive ownership, and optionally map the email as an alias.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-sm font-medium">Delete Google account</Label>
                      <p className="text-xs text-muted-foreground">Deletes the user after transfer (instead of suspending).</p>
                    </div>
                    <Switch checked={googleDeleteAccount} onCheckedChange={setGoogleDeleteAccount} />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Map email as alias to</Label>
                    <div className="relative mt-2">
                      <Input
                        value={googleAliasSearch}
                        onChange={(e) => {
                          setGoogleAliasSearch(e.target.value)
                          setAliasDropdownOpen(true)
                        }}
                        onFocus={() => setAliasDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setAliasDropdownOpen(false), 150)}
                        placeholder="Search and select Google user"
                      />
                      {aliasDropdownOpen && (
                        <div className="absolute z-20 mt-2 w-full rounded-md border bg-card shadow-sm max-h-64 overflow-auto">
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setGoogleAliasToEmail('')
                              setGoogleAliasSearch('')
                              setAliasDropdownOpen(false)
                            }}
                          >
                            No alias mapping
                          </button>
                          {googleUsersQuery.isLoading ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Loading Google Workspace users...</div>
                          ) : googleUsersQuery.data?.error ? (
                            <div className="px-3 py-2 text-sm text-destructive">{googleUsersQuery.data.error}</div>
                          ) : filteredGoogleUsers.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No matching users</div>
                          ) : (
                            filteredGoogleUsers.map((user) => (
                              <button
                                key={user.email}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => {
                                  setGoogleAliasToEmail(user.email)
                                  setGoogleAliasSearch(`${user.name} (${user.email})`)
                                  setAliasDropdownOpen(false)
                                }}
                              >
                                {user.name} ({user.email})
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {!googleUsersQuery.isLoading && !googleUsersQuery.data?.error ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {filteredGoogleUsers.length} user{filteredGoogleUsers.length === 1 ? '' : 's'} found
                      </p>
                    ) : null}
                    {!googleDeleteAccount && googleAliasToEmail ? (
                      <p className="text-xs text-warning mt-1">
                        Alias mapping requires deleting the Google account.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-medium">Data in other apps</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${transferEnabled ? 'border-blue-600 text-blue-600' : 'border-border text-muted-foreground'}`}
                      onClick={() => setTransferEnabled(true)}
                    >
                      Transfer
                    </button>
                    <button
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${!transferEnabled ? 'border-blue-600 text-blue-600' : 'border-border text-muted-foreground'}`}
                      onClick={() => {
                        setTransferEnabled(false)
                        setGoogleTransferToEmail('')
                        setTransferSearch('')
                      }}
                    >
                      Don’t transfer data
                    </button>
                  </div>
                </div>

                {transferEnabled && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Select the user who should receive the offboarded employee’s data.
                    </p>
                    <div className="relative">
                      <Input
                        value={transferSearch}
                        onChange={(e) => {
                          setTransferSearch(e.target.value)
                          setTransferDropdownOpen(true)
                        }}
                        onFocus={() => setTransferDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setTransferDropdownOpen(false), 150)}
                        placeholder="Search for a user"
                      />
                      {transferDropdownOpen && (
                        <div className="absolute z-20 mt-2 w-full rounded-md border bg-card shadow-sm max-h-64 overflow-auto">
                          {googleUsersQuery.isLoading ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Loading Google Workspace users...</div>
                          ) : googleUsersQuery.data?.error ? (
                            <div className="px-3 py-2 text-sm text-destructive">{googleUsersQuery.data.error}</div>
                          ) : filteredTransferUsers.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No matching users</div>
                          ) : (
                            filteredTransferUsers.map((user) => (
                              <button
                                key={user.email}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => {
                                  setGoogleTransferToEmail(user.email)
                                  setTransferSearch(`${user.name} (${user.email})`)
                                  setTransferDropdownOpen(false)
                                }}
                              >
                                {user.name} ({user.email})
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {!googleUsersQuery.isLoading && !googleUsersQuery.data?.error ? (
                      <p className="text-xs text-muted-foreground">
                        {filteredTransferUsers.length} user{filteredTransferUsers.length === 1 ? '' : 's'} found
                      </p>
                    ) : null}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Select data to transfer</Label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={googleTransferApps.includes('drive')}
                          onChange={(e) => {
                            setGoogleTransferApps((prev) =>
                              e.target.checked ? [...prev, 'drive'] : prev.filter((app) => app !== 'drive')
                            )
                          }}
                        />
                        Drive and Docs
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={googleTransferApps.includes('calendar')}
                          onChange={(e) => {
                            setGoogleTransferApps((prev) =>
                              e.target.checked ? [...prev, 'calendar'] : prev.filter((app) => app !== 'calendar')
                            )
                          }}
                        />
                        Calendar
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOffboardingOpen(false)}
              disabled={startOffboarding.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                startOffboarding.mutate({
                  employeeId,
                  isImmediate,
                  endDate: !isImmediate && endDate ? endDate : undefined,
                  reason: reason.trim() || undefined,
                  notes: notes.trim() || undefined,
                  googleDeleteAccount,
                  googleTransferToEmail: transferEnabled ? googleTransferToEmail.trim() || undefined : undefined,
                  googleTransferApps: transferEnabled ? googleTransferApps : [],
                  googleAliasToEmail: googleAliasToEmail.trim() || undefined,
                })
              }
              disabled={startOffboarding.isPending}
            >
              {startOffboarding.isPending ? 'Starting…' : 'Start offboarding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
