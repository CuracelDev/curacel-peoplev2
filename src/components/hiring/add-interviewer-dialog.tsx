'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown, Loader2, User, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

interface AddInterviewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interviewId: string
  onSuccess?: () => void
}

export function AddInterviewerDialog({
  open,
  onOpenChange,
  interviewId,
  onSuccess,
}: AddInterviewerDialogProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal')

  // Internal interviewer state
  const [employeeOpen, setEmployeeOpen] = useState(false)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string
    fullName: string
    workEmail: string | null
    jobTitle: string | null
  } | null>(null)

  // External interviewer state
  const [externalName, setExternalName] = useState('')
  const [externalEmail, setExternalEmail] = useState('')
  const [externalRole, setExternalRole] = useState('')

  // Common state
  const [generateToken, setGenerateToken] = useState(true)
  const [tokenExpiry, setTokenExpiry] = useState('7')

  // Fetch employees for internal interviewer selection
  const { data: employeesData, isLoading: employeesLoading } = trpc.employee.list.useQuery(
    {
      search: employeeSearch || undefined,
      status: 'ACTIVE',
      limit: 20,
    },
    { enabled: open && activeTab === 'internal' }
  )

  // Fetch interview details to get hiring team
  const { data: interview } = trpc.interview.get.useQuery(
    { id: interviewId },
    { enabled: open }
  )

  const hiringTeam = useMemo(() => {
    if (!interview?.candidate?.job) return []

    const job = interview.candidate.job
    const team: any[] = []

    if (job.hiringManager) {
      team.push({
        id: job.hiringManager.id,
        fullName: job.hiringManager.fullName,
        workEmail: job.hiringManager.workEmail,
        jobTitle: job.hiringManager.jobTitle,
        isHiringManager: true,
      })
    }

    if (job.followers) {
      job.followers.forEach((f: any) => {
        if (f.employee.id !== job.hiringManager?.id) {
          team.push({
            ...f.employee,
            isFollower: true,
          })
        }
      })
    }

    return team
  }, [interview])

  // Add interviewer mutation
  const utils = trpc.useUtils()
  const addInterviewerMutation = trpc.interview.addInterviewer.useMutation({
    onSuccess: (data) => {
      const interviewerName = activeTab === 'internal'
        ? selectedEmployee?.fullName
        : externalName

      toast.success('Interviewer added', {
        description: `${interviewerName} has been added as an interviewer`,
      })

      if (data.token) {
        // Copy token URL to clipboard
        const tokenUrl = `${window.location.origin}/interview/${data.token.token}`
        navigator.clipboard.writeText(tokenUrl)
        toast.info('Link copied to clipboard', {
          description: 'Share this link with the interviewer',
        })
      }

      utils.interview.get.invalidate({ id: interviewId })
      utils.interview.getInterviewerTokens.invalidate({ interviewId })
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to add interviewer', {
        description: error.message,
      })
    },
  })

  const resetForm = () => {
    setActiveTab('internal')
    setSelectedEmployee(null)
    setEmployeeSearch('')
    setExternalName('')
    setExternalEmail('')
    setExternalRole('')
    setGenerateToken(true)
    setTokenExpiry('7')
  }

  const handleSubmit = async () => {
    if (activeTab === 'internal') {
      if (!selectedEmployee) {
        toast.error('Please select an employee')
        return
      }

      await addInterviewerMutation.mutateAsync({
        interviewId,
        employeeId: selectedEmployee.id,
        name: selectedEmployee.fullName,
        email: selectedEmployee.workEmail || '',
        role: selectedEmployee.jobTitle || 'Employee',
        generateToken,
        tokenExpiresInDays: parseInt(tokenExpiry),
      })
    } else {
      if (!externalName.trim()) {
        toast.error('Please enter the interviewer name')
        return
      }
      if (!externalEmail.trim()) {
        toast.error('Please enter the interviewer email')
        return
      }

      await addInterviewerMutation.mutateAsync({
        interviewId,
        name: externalName.trim(),
        email: externalEmail.trim(),
        role: externalRole.trim() || 'External Interviewer',
        generateToken,
        tokenExpiresInDays: parseInt(tokenExpiry),
      })
    }
  }

  const isValid = activeTab === 'internal'
    ? !!selectedEmployee
    : externalName.trim() && externalEmail.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Interviewer</DialogTitle>
          <DialogDescription>
            Add an internal employee or external person as an interviewer.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'internal' | 'external')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="internal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Internal
            </TabsTrigger>
            <TabsTrigger value="external" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              External
            </TabsTrigger>
          </TabsList>

          <TabsContent value="internal" className="mt-4 space-y-4">
            <div className="grid gap-2">
              <Label>Select Employee *</Label>
              <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeeOpen}
                    className="justify-between"
                  >
                    {selectedEmployee ? (
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {selectedEmployee.fullName}
                        {selectedEmployee.jobTitle && (
                          <span className="text-muted-foreground">
                            - {selectedEmployee.jobTitle}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Search employees...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search by name or email..."
                      value={employeeSearch}
                      onValueChange={setEmployeeSearch}
                    />
                    <CommandList>
                      {employeesLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No employees found.</CommandEmpty>

                          {hiringTeam.length > 0 && !employeeSearch && (
                            <CommandGroup heading="Hiring Team (Suggested)">
                              {hiringTeam.map((member) => (
                                <CommandItem
                                  key={member.id}
                                  value={`${member.fullName} ${member.workEmail}`}
                                  onSelect={() => {
                                    setSelectedEmployee({
                                      id: member.id,
                                      fullName: member.fullName,
                                      workEmail: member.workEmail,
                                      jobTitle: member.jobTitle,
                                    })
                                    setEmployeeOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedEmployee?.id === member.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span>{member.fullName}</span>
                                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                        {member.isHiringManager ? 'Hiring Manager' : 'Team Member'}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {member.jobTitle || 'Employee'} • {member.workEmail}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}

                          <CommandGroup heading={hiringTeam.length > 0 && !employeeSearch ? "All Employees" : ""}>
                            {employeesData?.employees?.map((employee) => (
                              // Filter out team members if they are already shown above to avoid duplicates when not searching
                              (!employeeSearch && hiringTeam.some(m => m.id === employee.id)) ? null : (
                                <CommandItem
                                  key={employee.id}
                                  value={`${employee.fullName} ${employee.workEmail}`}
                                  onSelect={() => {
                                    setSelectedEmployee({
                                      id: employee.id,
                                      fullName: employee.fullName,
                                      workEmail: employee.workEmail,
                                      jobTitle: employee.jobTitle,
                                    })
                                    setEmployeeOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedEmployee?.id === employee.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{employee.fullName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {employee.jobTitle || 'Employee'} • {employee.workEmail}
                                    </span>
                                  </div>
                                </CommandItem>
                              )
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </TabsContent>

          <TabsContent value="external" className="mt-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="externalName">Full Name *</Label>
              <Input
                id="externalName"
                placeholder="Enter interviewer name"
                value={externalName}
                onChange={(e) => setExternalName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="externalEmail">Email *</Label>
              <Input
                id="externalEmail"
                type="email"
                placeholder="interviewer@company.com"
                value={externalEmail}
                onChange={(e) => setExternalEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="externalRole">Role (optional)</Label>
              <Input
                id="externalRole"
                placeholder="e.g., Advisor, Industry Expert"
                value={externalRole}
                onChange={(e) => setExternalRole(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Token generation options */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Generate Feedback Link</Label>
              <p className="text-sm text-muted-foreground">
                Create a unique link for the interviewer to submit feedback
              </p>
            </div>
            <Switch
              checked={generateToken}
              onCheckedChange={setGenerateToken}
            />
          </div>

          {generateToken && (
            <div className="grid gap-2">
              <Label htmlFor="tokenExpiry">Link Expiry</Label>
              <Select value={tokenExpiry} onValueChange={setTokenExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || addInterviewerMutation.isPending}
          >
            {addInterviewerMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Add Interviewer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
