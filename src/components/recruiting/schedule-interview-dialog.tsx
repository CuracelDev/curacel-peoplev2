'use client'

import { useState, useMemo } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Clock,
  Loader2,
  User,
  Users,
  X,
  Video,
} from 'lucide-react'
import { format } from 'date-fns'

// Interview types configuration (will be moved to DB in Phase 4)
const INTERVIEW_TYPES = [
  {
    id: 'people-chat',
    name: 'People Chat',
    stage: 'HR_SCREEN',
    duration: 45,
    description: 'Initial HR screening call'
  },
  {
    id: 'team-chat',
    name: 'Team Chat',
    stage: 'TEAM_CHAT',
    duration: 60,
    description: 'Interview with potential teammates'
  },
  {
    id: 'advisor-chat',
    name: 'Advisor Chat',
    stage: 'ADVISOR_CHAT',
    duration: 45,
    description: 'Interview with company advisors'
  },
  {
    id: 'ceo-chat',
    name: 'CEO Chat',
    stage: 'CEO_CHAT',
    duration: 60,
    description: 'Final interview with CEO'
  },
]

interface ScheduleInterviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateId?: string
  jobId?: string
  onSuccess?: () => void
}

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  candidateId: preselectedCandidateId,
  jobId,
  onSuccess,
}: ScheduleInterviewDialogProps) {
  // Form state
  const [selectedCandidateId, setSelectedCandidateId] = useState(preselectedCandidateId || '')
  const [interviewType, setInterviewType] = useState('')
  const [selectedInterviewers, setSelectedInterviewers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState(60)
  const [meetingLink, setMeetingLink] = useState('')
  const [notes, setNotes] = useState('')

  // Popover states
  const [candidateOpen, setCandidateOpen] = useState(false)
  const [interviewerOpen, setInterviewerOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [interviewerSearch, setInterviewerSearch] = useState('')

  // Fetch candidates
  const { data: candidatesData, isLoading: candidatesLoading } = trpc.job.getAllCandidates.useQuery({
    search: candidateSearch || undefined,
    limit: 20,
  })

  // Fetch employees for interviewers
  const { data: employeesData, isLoading: employeesLoading } = trpc.employee.list.useQuery({
    search: interviewerSearch || undefined,
    status: 'ACTIVE',
    limit: 20,
  })

  // Schedule interview mutation
  const utils = trpc.useUtils()
  const scheduleMutation = trpc.interview.schedule.useMutation({
    onSuccess: () => {
      utils.interview.list.invalidate()
      utils.interview.getCounts.invalidate()
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    },
  })

  // Get selected candidate info
  const selectedCandidate = useMemo(() => {
    return candidatesData?.candidates?.find(c => c.id === selectedCandidateId)
  }, [candidatesData, selectedCandidateId])

  // Get selected interview type info
  const selectedType = useMemo(() => {
    return INTERVIEW_TYPES.find(t => t.id === interviewType)
  }, [interviewType])

  // Update duration when interview type changes
  const handleInterviewTypeChange = (value: string) => {
    setInterviewType(value)
    const type = INTERVIEW_TYPES.find(t => t.id === value)
    if (type) {
      setDuration(type.duration)
    }
  }

  // Add interviewer
  const addInterviewer = (employee: { id: string; fullName: string; workEmail?: string | null }) => {
    if (!selectedInterviewers.find(i => i.id === employee.id)) {
      setSelectedInterviewers([
        ...selectedInterviewers,
        { id: employee.id, name: employee.fullName, email: employee.workEmail || '' },
      ])
    }
    setInterviewerOpen(false)
    setInterviewerSearch('')
  }

  // Remove interviewer
  const removeInterviewer = (id: string) => {
    setSelectedInterviewers(selectedInterviewers.filter(i => i.id !== id))
  }

  // Reset form
  const resetForm = () => {
    setSelectedCandidateId(preselectedCandidateId || '')
    setInterviewType('')
    setSelectedInterviewers([])
    setDate(undefined)
    setTime('10:00')
    setDuration(60)
    setMeetingLink('')
    setNotes('')
    setCandidateSearch('')
    setInterviewerSearch('')
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedCandidateId || !interviewType || !date || selectedInterviewers.length === 0) {
      return
    }

    const selectedTypeInfo = INTERVIEW_TYPES.find(t => t.id === interviewType)
    if (!selectedTypeInfo) return

    // Combine date and time
    const [hours, minutes] = time.split(':').map(Number)
    const scheduledAt = new Date(date)
    scheduledAt.setHours(hours, minutes, 0, 0)

    await scheduleMutation.mutateAsync({
      candidateId: selectedCandidateId,
      stage: selectedTypeInfo.stage as any,
      scheduledAt,
      duration,
      interviewers: selectedInterviewers.map(i => ({ name: i.name, email: i.email })),
      meetingLink: meetingLink || undefined,
      notes: notes || undefined,
    })
  }

  const isValid = selectedCandidateId && interviewType && date && selectedInterviewers.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Schedule a new interview for a candidate. All interviewers will receive a calendar invite.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Candidate Selection */}
          <div className="grid gap-2">
            <Label htmlFor="candidate">Candidate *</Label>
            <Popover open={candidateOpen} onOpenChange={setCandidateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={candidateOpen}
                  className="justify-between"
                  disabled={!!preselectedCandidateId}
                >
                  {selectedCandidate ? (
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedCandidate.name} - {selectedCandidate.job?.title}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select candidate...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search candidates..."
                    value={candidateSearch}
                    onValueChange={setCandidateSearch}
                  />
                  <CommandList>
                    {candidatesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No candidates found.</CommandEmpty>
                        <CommandGroup>
                          {candidatesData?.candidates?.map((candidate) => (
                            <CommandItem
                              key={candidate.id}
                              value={candidate.id}
                              onSelect={() => {
                                setSelectedCandidateId(candidate.id)
                                setCandidateOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCandidateId === candidate.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{candidate.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {candidate.job?.title} • {candidate.stageDisplayName}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Interview Type */}
          <div className="grid gap-2">
            <Label htmlFor="type">Interview Type *</Label>
            <Select value={interviewType} onValueChange={handleInterviewTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select interview type..." />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex flex-col">
                      <span>{type.name}</span>
                      <span className="text-xs text-muted-foreground">{type.duration} min</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          {/* Interviewers */}
          <div className="grid gap-2">
            <Label>Interviewers *</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedInterviewers.map((interviewer) => (
                <Badge key={interviewer.id} variant="secondary" className="gap-1">
                  {interviewer.name}
                  <button
                    type="button"
                    onClick={() => removeInterviewer(interviewer.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Popover open={interviewerOpen} onOpenChange={setInterviewerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Add interviewer...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search employees..."
                    value={interviewerSearch}
                    onValueChange={setInterviewerSearch}
                  />
                  <CommandList>
                    {employeesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No employees found.</CommandEmpty>
                        <CommandGroup>
                          {employeesData?.employees
                            ?.filter(e => !selectedInterviewers.find(i => i.id === e.id))
                            .map((employee) => (
                              <CommandItem
                                key={employee.id}
                                value={employee.id}
                                onSelect={() => addInterviewer(employee)}
                              >
                                <div className="flex flex-col">
                                  <span>{employee.fullName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {employee.jobTitle || 'Employee'}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Date *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d)
                      setCalendarOpen(false)
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="grid gap-2">
            <Label htmlFor="duration">Duration</Label>
            <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Meeting Link */}
          <div className="grid gap-2">
            <Label htmlFor="meetingLink">Meeting Link (optional)</Label>
            <div className="relative">
              <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="meetingLink"
                placeholder="https://meet.google.com/..."
                className="pl-9"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to auto-generate a Google Meet link (requires Google Workspace integration)
            </p>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions or topics to cover..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || scheduleMutation.isPending}
          >
            {scheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule Interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
