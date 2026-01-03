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
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 bg-success flex-shrink-0">
              <AvatarImage
                src={employee.profileImageUrl || employee.user?.image || ''}
                alt={employee.fullName}
              />
              <AvatarFallback className="bg-success text-white text-2xl">
                {getInitials(employee.fullName)}
              </AvatarFallback>
            </Avatar>

            {/* Info and Actions */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-semibold text-foreground">{employee.fullName}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-sm text-muted-foreground">{employee.personalEmail}</p>
                    <span className="text-muted-foreground">•</span>
                    <p className="text-sm text-muted-foreground">
                      {employee.startDate ? formatDate(employee.startDate) : 'date not specified'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <Badge variant="secondary" className="font-normal">
                      {employee.jobTitle || 'Job title not specified'}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      Apply
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    Update Profile
                  </Button>
                  {activeOffboarding ? (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <Link href={`/offboarding/${existingOffboarding.id}`}>
                        View Offboarding
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
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
                      Start Offboarding
                    </Button>
                  )}
                </div>
              </div>

              {/* Contact Info Row */}
              <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Employment Type</p>
                  <p className="text-sm font-medium mt-1">
                    {employee.employmentType || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="text-sm font-medium mt-1">{employee.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Manager</p>
                  <p className="text-sm font-medium mt-1">
                    {employee.manager?.fullName || 'Manager not specified'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={`mt-1 ${getStatusColor(employee.status)}`}>
                    {employeeStatusLabels[employee.status] || employee.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone number</p>
                  <p className="text-sm font-medium mt-1">
                    {employee.phone || 'phone number not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Home Address</p>
                  <p className="text-sm font-medium mt-1">
                    {[
                      employee.addressStreet,
                      employee.addressCity,
                      employee.addressState,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Nationality</p>
                  <p className="text-sm font-medium mt-1">
                    {employee.nationality || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mobile Phone</p>
                  <p className="text-sm font-medium mt-1">
                    {employee.phone || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Content */}
      <div>
          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList className="flex w-full justify-start gap-6 border-b bg-transparent p-0">
              <TabsTrigger value="personal" className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-primary data-[state=active]:text-primary">
                Personal
              </TabsTrigger>
              <TabsTrigger value="employment" className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-primary data-[state=active]:text-primary">
                Employment
              </TabsTrigger>
              <TabsTrigger value="personality" className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-primary data-[state=active]:text-primary">
                Personality
              </TabsTrigger>
              <TabsTrigger value="contract" className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-primary data-[state=active]:text-primary">
                Contract
              </TabsTrigger>
              <TabsTrigger value="applications" className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-primary data-[state=active]:text-primary">
                Applications
              </TabsTrigger>
            </TabsList>

            {/* Personal Tab */}
            <TabsContent value="personal" className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Personal Information</h2>
              </div>

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
            </TabsContent>

            {/* Employment Tab */}
            <TabsContent value="employment" className="space-y-4">
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
            </TabsContent>

            {/* Personality Tab */}
            <TabsContent value="personality" className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Personality & Values</h2>
              </div>

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
            </TabsContent>

            {/* Contract Tab */}
            <TabsContent value="contract" className="space-y-4">
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
            <TabsContent value="applications" className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Applications</h2>
              </div>

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
            </TabsContent>
          </Tabs>
      </div>

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
