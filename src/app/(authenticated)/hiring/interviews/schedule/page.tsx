'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
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
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  CalendarIcon,
  Check,
  Clock,
  Loader2,
  Search,
  Users,
  X,
  Video,
  Sparkles,
  AlertCircle,
  Calendar as CalendarCheckIcon,
  MessageSquare,
  Plus,
  Star,
  BookOpen,
} from 'lucide-react'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'
import { toast } from 'sonner'
import { AIQuestionGenerator } from '@/components/hiring/ai-question-generator'
import { InterviewerQuestionAssignment } from '@/components/hiring/interviewer-question-assignment'

interface AvailableSlot {
  start: Date
  end: Date
  allAvailable: boolean
}

interface SelectedQuestion {
  id?: string
  text: string
  category: string
  followUp?: string
  isCustom: boolean
  saveToBank: boolean
  isRequired: boolean
}

const categoryConfig: Record<string, { name: string; color: string }> = {
  situational: { name: 'Situational', color: 'bg-indigo-100 text-indigo-700' },
  behavioral: { name: 'Behavioral', color: 'bg-success/10 text-success' },
  motivational: { name: 'Motivational', color: 'bg-amber-100 text-amber-700' },
  technical: { name: 'Technical', color: 'bg-pink-100 text-pink-700' },
  culture: { name: 'Culture', color: 'bg-cyan-100 text-cyan-700' },
}

export default function ScheduleInterviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedCandidateId = searchParams.get('candidateId') || ''

  // Step management
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Interview Details Form State
  const [selectedCandidateId, setSelectedCandidateId] = useState(preselectedCandidateId)
  const [interviewTypeId, setInterviewTypeId] = useState('')
  const [selectedInterviewers, setSelectedInterviewers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState(60)
  const [meetingLink, setMeetingLink] = useState('')
  const [notes, setNotes] = useState('')
  const [createGoogleMeet, setCreateGoogleMeet] = useState(true)
  const [syncToCalendar, setSyncToCalendar] = useState(true)

  // Availability state
  const [schedulingMode, setSchedulingMode] = useState<'manual' | 'suggested'>('suggested')
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [dateRangeStart, setDateRangeStart] = useState<Date>(() => startOfDay(new Date()))
  const [dateRangeEnd, setDateRangeEnd] = useState<Date>(() => endOfDay(addDays(new Date(), 7)))

  // Step 2: Question Selection State
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([])
  const [customQuestionText, setCustomQuestionText] = useState('')
  const [customQuestionCategory, setCustomQuestionCategory] = useState('behavioral')
  const [saveCustomToBank, setSaveCustomToBank] = useState(false)
  const [questionSearch, setQuestionSearch] = useState('')

  // Step 3: Interviewer Question Assignments (questionIndex -> interviewerId)
  const [questionAssignments, setQuestionAssignments] = useState<Record<string, string>>({})

  // Popover states
  const [interviewerOpen, setInterviewerOpen] = useState(false)
  const [candidateOpen, setCandidateOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [interviewerSearch, setInterviewerSearch] = useState('')

  // Check if calendar is configured
  const { data: calendarConfig } = trpc.interview.isCalendarConfigured.useQuery()

  // Fetch interview types from database
  const { data: interviewTypesData, isLoading: typesLoading } = trpc.interviewType.list.useQuery()

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

  // Fetch advisors for interviewers
  const { data: advisorsData, isLoading: advisorsLoading } = trpc.advisor.list.useQuery({
    search: interviewerSearch || undefined,
    isActive: true,
    limit: 20,
  })

  // Find available slots for selected interviewers
  const interviewerEmails = selectedInterviewers.map(i => i.email).filter(Boolean)
  const {
    data: slotsData,
    isLoading: slotsLoading,
    refetch: refetchSlots,
  } = trpc.interview.findAvailableSlots.useQuery({
    interviewerEmails,
    duration,
    dateFrom: dateRangeStart.toISOString(),
    dateTo: dateRangeEnd.toISOString(),
    workingHoursStart: 9,
    workingHoursEnd: 19, // 7pm - extended hours for busy periods
  }, {
    enabled: calendarConfig?.configured && interviewerEmails.length > 0 && schedulingMode === 'suggested',
  })

  // Extract slots and calendar errors from response
  const availableSlots = slotsData?.slots || []
  const calendarErrors = slotsData?.calendarErrors || {}
  const hasCalendarErrors = Object.keys(calendarErrors).length > 0

  // Get selected interview type info
  const selectedType = useMemo(() => {
    return interviewTypesData?.find(t => t.id === interviewTypeId)
  }, [interviewTypesData, interviewTypeId])

  // Get selected candidate info
  const selectedCandidate = useMemo(() => {
    return candidatesData?.candidates?.find(c => c.id === selectedCandidateId)
  }, [candidatesData?.candidates, selectedCandidateId])

  // Fetch questions filtered by interview type's categories
  const questionCategories = selectedType?.questionCategories || []
  const { data: questionsData, isLoading: questionsLoading } = trpc.question.list.useQuery({
    search: questionSearch || undefined,
    limit: 50,
  }, {
    enabled: currentStep === 2,
  })

  // Filter questions by interview type categories
  const filteredQuestions = useMemo(() => {
    if (!questionsData?.questions) return []
    if (questionCategories.length === 0) return questionsData.questions
    return questionsData.questions.filter(q => questionCategories.includes(q.category))
  }, [questionsData, questionCategories])

  // Helper to parse validation errors into user-friendly messages
  const parseValidationError = (error: { message: string }): string => {
    try {
      // Try to parse as JSON (Zod validation errors come as JSON arrays)
      const parsed = JSON.parse(error.message)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstError = parsed[0]
        const path = firstError.path?.join(' → ') || ''
        const message = firstError.message || 'Validation failed'

        // Special case handling for common errors
        if (path.includes('interviewers') && path.includes('email')) {
          const interviewerIndex = firstError.path?.[1]
          const interviewer = selectedInterviewers[interviewerIndex]
          if (interviewer) {
            return `${interviewer.name} has an invalid or missing email address. Please select a different interviewer or update their profile.`
          }
          return 'One or more interviewers have invalid email addresses. Please check their profiles.'
        }

        if (message === 'Invalid email') {
          return 'Invalid email address. Please check the interviewer email addresses.'
        }

        // Return formatted path + message for other errors
        return path ? `${path}: ${message}` : message
      }
    } catch {
      // Not JSON, return as-is
    }
    return error.message
  }

  // Schedule interview mutation
  const utils = trpc.useUtils()
  const scheduleMutation = trpc.interview.schedule.useMutation({
    onSuccess: async (data) => {
      // If calendar sync is enabled and configured, create calendar event
      if (syncToCalendar && calendarConfig?.configured) {
        try {
          await syncCalendarMutation.mutateAsync({
            interviewId: data.id,
            createGoogleMeet: createGoogleMeet && !meetingLink,
          })
        } catch {
          toast.warning('Interview scheduled but calendar sync failed')
        }
      }

      utils.interview.list.invalidate()
      utils.interview.getCounts.invalidate()
      toast.success('Interview scheduled successfully')
      router.push('/hiring/interviews')
    },
    onError: (error) => {
      const friendlyMessage = parseValidationError(error)
      toast.error('Failed to schedule interview', {
        description: friendlyMessage,
      })
    },
  })

  // Sync to calendar mutation
  const syncCalendarMutation = trpc.interview.syncInterviewToCalendar.useMutation()

  // Update duration when interview type changes
  const handleInterviewTypeChange = (value: string) => {
    setInterviewTypeId(value)
    const type = interviewTypesData?.find(t => t.id === value)
    if (type) {
      setDuration(type.defaultDuration)
    }
  }

  // When a suggested slot is selected, update date and time
  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot)
    setDate(slot.start)
    const hours = slot.start.getHours().toString().padStart(2, '0')
    const minutes = slot.start.getMinutes().toString().padStart(2, '0')
    setTime(`${hours}:${minutes}`)
  }

  // Add interviewer (handles both employees with workEmail and advisors with email)
  // Only workEmail is used for calendar availability - personal emails don't have calendar access
  const addInterviewer = (person: { id: string; fullName: string; workEmail?: string | null; email?: string }) => {
    if (!selectedInterviewers.find(i => i.id === person.id)) {
      // workEmail for employees (Google Workspace calendar access), email for advisors
      const interviewerEmail = person.workEmail || person.email || ''
      setSelectedInterviewers([
        ...selectedInterviewers,
        { id: person.id, name: person.fullName, email: interviewerEmail },
      ])
      // Clear selected slot when interviewers change - availability needs to be rechecked
      setSelectedSlot(null)
    }
    setInterviewerOpen(false)
    setInterviewerSearch('')
  }

  // Remove interviewer
  const removeInterviewer = (id: string) => {
    setSelectedInterviewers(selectedInterviewers.filter(i => i.id !== id))
    setSelectedSlot(null)
  }

  // Add question from bank
  const addQuestion = (question: { id: string; text: string; category: string; followUp?: string | null }) => {
    if (!selectedQuestions.find(q => q.id === question.id)) {
      setSelectedQuestions([
        ...selectedQuestions,
        {
          id: question.id,
          text: question.text,
          category: question.category,
          followUp: question.followUp || undefined,
          isCustom: false,
          saveToBank: false,
          isRequired: false,
        },
      ])
    }
  }

  // Remove question
  const removeQuestion = (index: number) => {
    setSelectedQuestions(selectedQuestions.filter((_, i) => i !== index))
  }

  // Toggle question required
  const toggleQuestionRequired = (index: number) => {
    setSelectedQuestions(selectedQuestions.map((q, i) =>
      i === index ? { ...q, isRequired: !q.isRequired } : q
    ))
  }

  // Add custom question
  const addCustomQuestion = () => {
    if (!customQuestionText.trim()) return
    setSelectedQuestions([
      ...selectedQuestions,
      {
        text: customQuestionText.trim(),
        category: customQuestionCategory,
        isCustom: true,
        saveToBank: saveCustomToBank,
        isRequired: false,
      },
    ])
    setCustomQuestionText('')
    setSaveCustomToBank(false)
  }

  // Check if Step 1 is valid
  const isStep1Valid = selectedCandidateId && interviewTypeId && date && selectedInterviewers.length > 0

  // Check if Step 3 should be shown (only if 2+ interviewers)
  const showStep3 = selectedInterviewers.length >= 2 && selectedQuestions.length > 0

  // Total steps based on whether Step 3 should be shown
  const totalSteps = showStep3 ? 3 : 2

  // Handle next step
  const handleNext = () => {
    if (currentStep === 1 && isStep1Valid) {
      setCurrentStep(2)
    } else if (currentStep === 2 && showStep3) {
      setCurrentStep(3)
    }
  }

  // Handle back
  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    } else if (currentStep === 3) {
      setCurrentStep(2)
    }
  }

  // Handle skip step 3
  const handleSkipStep3 = () => {
    handleSubmit(false) // Submit with current questions but no assignments
  }

  // Handle submit
  const handleSubmit = async (skipQuestions = false) => {
    if (!selectedCandidateId || !interviewTypeId || !date || selectedInterviewers.length === 0) {
      return
    }

    // Combine date and time
    const [hours, minutes] = time.split(':').map(Number)
    const scheduledAt = new Date(date)
    scheduledAt.setHours(hours, minutes, 0, 0)

    const questionIds = skipQuestions ? [] : selectedQuestions.filter(q => !q.isCustom).map(q => q.id!)

    // Build custom questions with interviewer assignments
    const customQuestions = skipQuestions ? [] : selectedQuestions.filter(q => q.isCustom).map((q, idx) => {
      const questionKey = `question-${selectedQuestions.indexOf(q)}`
      const assignedInterviewerId = questionAssignments[questionKey]
      const assignedInterviewer = assignedInterviewerId
        ? selectedInterviewers.find(i => i.id === assignedInterviewerId)
        : null

      return {
        text: q.text,
        category: q.category,
        isRequired: q.isRequired,
        saveToBank: q.saveToBank,
        assignedToInterviewerId: assignedInterviewerId || undefined,
        assignedToInterviewerName: assignedInterviewer?.name || undefined,
      }
    })

    // Build question assignments for bank questions
    const questionAssignmentsData: Record<string, { interviewerId: string; interviewerName: string }> = {}
    selectedQuestions.forEach((q, idx) => {
      if (!q.isCustom && q.id) {
        const questionKey = `question-${idx}`
        const assignedInterviewerId = questionAssignments[questionKey]
        if (assignedInterviewerId) {
          const assignedInterviewer = selectedInterviewers.find(i => i.id === assignedInterviewerId)
          if (assignedInterviewer) {
            questionAssignmentsData[q.id] = {
              interviewerId: assignedInterviewerId,
              interviewerName: assignedInterviewer.name,
            }
          }
        }
      }
    })

    try {
      await scheduleMutation.mutateAsync({
        candidateId: selectedCandidateId,
        interviewTypeId,
        scheduledAt: scheduledAt.toISOString(),
        duration,
        interviewers: selectedInterviewers.map(i => ({
          employeeId: i.id,
          name: i.name,
          email: i.email,
        })),
        meetingLink: meetingLink || undefined,
        notes: notes || undefined,
        questionIds: questionIds.length > 0 ? questionIds : undefined,
        customQuestions: customQuestions.length > 0 ? customQuestions : undefined,
        questionAssignments: Object.keys(questionAssignmentsData).length > 0 ? questionAssignmentsData : undefined,
      })
    } catch {
      // Error is already handled by onError callback in the mutation
    }
  }

  // Effect to refetch slots when interviewers, duration, or date range changes
  // Using JSON.stringify to create a stable dependency for the emails array
  const interviewerEmailsKey = JSON.stringify(interviewerEmails.sort())
  const isCalendarConfigured = calendarConfig?.configured ?? false
  useEffect(() => {
    if (isCalendarConfigured && interviewerEmails.length > 0 && schedulingMode === 'suggested') {
      // Small delay to ensure state is updated before refetching
      const timer = setTimeout(() => {
        refetchSlots()
      }, 100)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, dateRangeStart, dateRangeEnd, interviewerEmailsKey, schedulingMode, isCalendarConfigured])

  // Group available slots by date
  const slotsByDate = useMemo(() => {
    if (!availableSlots) return {}

    const grouped: Record<string, AvailableSlot[]> = {}
    availableSlots.forEach((slot: AvailableSlot) => {
      const dateKey = format(new Date(slot.start), 'yyyy-MM-dd')
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(slot)
    })
    return grouped
  }, [availableSlots]);

  return (
    <div className={cn("px-1 sm:px-2 py-2", (currentStep === 2 || currentStep === 3) ? "max-w-7xl mx-auto" : "")}>
      {/* Step 1: Interview Details */}
      {currentStep === 1 && (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle>Interview Details</CardTitle>
            <CardDescription>
              Select the candidate, interview type, interviewers, and schedule time.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            {/* Row 1: Candidate & Interview Type */}
            {/* Candidate Selection */}
            <div className="grid gap-1">
              <Label>Candidate *</Label>
              {selectedCandidate ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1 py-1.5 px-3">
                    <span>{selectedCandidate.name}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-muted-foreground text-xs">{selectedCandidate.job?.title || 'No position'}</span>
                    {!preselectedCandidateId && (
                      <button
                        type="button"
                        onClick={() => setSelectedCandidateId('')}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                </div>
              ) : (
                <Popover open={candidateOpen} onOpenChange={setCandidateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start"
                      disabled={!!preselectedCandidateId}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      {candidatesLoading ? 'Loading...' : 'Select candidate...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
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
                                <div
                                  key={candidate.id}
                                  onClick={() => {
                                    setSelectedCandidateId(candidate.id)
                                    setCandidateOpen(false)
                                    setCandidateSearch('')
                                  }}
                                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                >
                                  <div className="flex flex-col">
                                    <span>{candidate.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {candidate.job?.title || 'No position'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Interview Type (Row 1 - Right) */}
            <div className="grid gap-1">
              <Label htmlFor="type">Interview Type *</Label>
              <Select value={interviewTypeId} onValueChange={handleInterviewTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder={typesLoading ? "Loading types..." : "Select interview type..."} />
                </SelectTrigger>
                <SelectContent>
                  {interviewTypesData?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                  {(!interviewTypesData || interviewTypesData.length === 0) && !typesLoading && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No interview types configured. Add them in Settings.
                    </div>
                  )}
                </SelectContent>
              </Select>
              {selectedType && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedType.questionCategories?.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {categoryConfig[cat]?.name || cat}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Row 2: Interviewers & Duration */}
            {/* Interviewers (Row 2 - Left) */}
            <div className="grid gap-1">
              <Label>Interviewers *</Label>
              <div className="flex flex-wrap gap-1 mb-1">
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
                      placeholder="Search employees or advisors..."
                      value={interviewerSearch}
                      onValueChange={setInterviewerSearch}
                    />
                    <CommandList>
                      {employeesLoading && advisorsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No interviewers found.</CommandEmpty>
                          {/* Employees Section */}
                          {employeesData?.employees && employeesData.employees.length > 0 && (
                            <CommandGroup heading="Employees">
                              {employeesData.employees
                                .filter(e => !selectedInterviewers.find(i => i.id === e.id))
                                .map((employee) => (
                                  <div
                                    key={employee.id}
                                    onClick={() => addInterviewer(employee)}
                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  >
                                    <div className="flex flex-col">
                                      <span>{employee.fullName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {employee.jobTitle || 'Employee'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </CommandGroup>
                          )}
                          {/* Advisors Section */}
                          {advisorsData?.advisors && advisorsData.advisors.length > 0 && (
                            <CommandGroup heading="Advisors (no calendar access)">
                              {advisorsData.advisors
                                .filter(a => !selectedInterviewers.find(i => i.id === a.id))
                                .map((advisor) => (
                                  <div
                                    key={advisor.id}
                                    onClick={() => addInterviewer({
                                      id: advisor.id,
                                      fullName: advisor.fullName,
                                      email: advisor.email,
                                    })}
                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  >
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1">
                                        <span>{advisor.fullName}</span>
                                        <Badge variant="outline" className="text-[10px] px-1 py-0">Advisor</Badge>
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {advisor.title || advisor.company || 'External Advisor'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </CommandGroup>
                          )}
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Duration (Row 2 - Right) */}
            <div className="grid gap-1">
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

            {/* Row 3: Date & Time Selection (Full Width) */}
            {calendarConfig?.configured && selectedInterviewers.length > 0 ? (
              <div className="md:col-span-2 grid gap-1">
                <Label>Schedule Time *</Label>
                <Tabs value={schedulingMode} onValueChange={(v) => setSchedulingMode(v as 'manual' | 'suggested')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="suggested">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Smart Scheduling
                    </TabsTrigger>
                    <TabsTrigger value="manual">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Manual
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="suggested" className="mt-4">
                    {/* Date Range Selector */}
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(dateRangeStart, "PP")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRangeStart}
                              onSelect={(d) => d && setDateRangeStart(startOfDay(d))}
                              disabled={(d) => d < startOfDay(new Date())}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(dateRangeEnd, "PP")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRangeEnd}
                              onSelect={(d) => d && setDateRangeEnd(endOfDay(d))}
                              disabled={(d) => d < dateRangeStart}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Calendar Access Errors - Block smart scheduling */}
                    {hasCalendarErrors ? (
                      <div className="flex flex-col items-center justify-center py-8 border border-warning/20 rounded-lg bg-warning/5">
                        <AlertCircle className="h-8 w-8 text-warning mb-3" />
                        <p className="text-sm font-medium text-warning-foreground dark:text-warning">Cannot access all calendars</p>
                        <div className="text-xs text-warning-foreground/80 dark:text-warning/80 mt-2 text-center max-w-sm">
                          <p className="mb-2">The following interviewers have inaccessible calendars:</p>
                          <ul className="space-y-1">
                            {Object.entries(calendarErrors).map(([email]) => (
                              <li key={email} className="font-medium">{email}</li>
                            ))}
                          </ul>
                          <p className="mt-3">
                            Smart scheduling requires calendar access for all interviewers.
                            Please use <strong>Manual</strong> scheduling instead, or remove interviewers without calendar access.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => setSchedulingMode('manual')}
                        >
                          Switch to Manual Scheduling
                        </Button>
                      </div>
                    ) : slotsLoading ? (
                      <div className="flex items-center justify-center py-8 border rounded-lg bg-muted/30">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Finding available times...</span>
                      </div>
                    ) : availableSlots && availableSlots.length > 0 ? (
                      <ScrollArea className="h-[200px] border rounded-lg p-3">
                        <div className="space-y-4">
                          {Object.entries(slotsByDate).map(([dateKey, slots]) => (
                            <div key={dateKey}>
                              <h4 className="font-medium text-sm mb-2">
                                {format(new Date(dateKey), 'EEEE, MMMM d')}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {(slots as AvailableSlot[]).map((slot, idx) => {
                                  const slotStart = new Date(slot.start)
                                  const isSelected = selectedSlot &&
                                    new Date(selectedSlot.start).getTime() === slotStart.getTime()
                                  return (
                                    <Button
                                      key={idx}
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      className={cn(
                                        "gap-1",
                                        !slot.allAvailable && "border-dashed opacity-70"
                                      )}
                                      onClick={() => handleSlotSelect(slot)}
                                    >
                                      <Clock className="h-3 w-3" />
                                      {format(slotStart, 'h:mm a')}
                                      {isSelected && <Check className="h-3 w-3 ml-1" />}
                                    </Button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 border rounded-lg bg-muted/30">
                        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No available slots found</p>
                        <p className="text-xs text-muted-foreground mt-1">Try a different date range or use manual scheduling</p>
                      </div>
                    )}

                    {selectedSlot && (
                      <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                        <div className="flex items-center gap-2 text-success">
                          <Check className="h-4 w-4" />
                          <span className="font-medium">Selected: </span>
                          <span>{format(new Date(selectedSlot.start), 'EEEE, MMMM d \'at\' h:mm a')}</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="manual" className="mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
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
                              onSelect={(d: Date | undefined) => {
                                setDate(d)
                                setCalendarOpen(false)
                              }}
                              disabled={(d: Date) => d < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="time">Time *</Label>
                        <Input
                          id="time"
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="md:col-span-2 grid gap-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
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
                          onSelect={(d: Date | undefined) => {
                            setDate(d)
                            setCalendarOpen(false)
                          }}
                          disabled={(d: Date) => d < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>
                {selectedInterviewers.length > 0 && !calendarConfig?.configured && (
                  <div className="flex items-start gap-1 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-amber-800">
                      <p className="font-medium">Smart scheduling unavailable</p>
                      <p className="text-xs mt-0.5">
                        Configure Google Workspace integration in Settings to enable automatic availability checking.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Row 4: Meeting Link (Full Width) */}
            {(!calendarConfig?.configured || !syncToCalendar || !createGoogleMeet) ? (
              <div className="md:col-span-2 grid gap-1">
                <Label htmlFor="meetingLink">Meeting Link</Label>
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
              </div>
            ) : (
              <div className="md:col-span-2 flex items-center gap-1 p-2 bg-success/10 dark:bg-green-900/20 border border-success/20 dark:border-success/30 rounded-lg text-sm">
                <Video className="h-4 w-4 text-success dark:text-success" />
                <span className="text-success dark:text-success">Google Meet link will be auto-generated</span>
              </div>
            )}

            {/* Row 5: Calendar Integration Options (Full Width) */}
            {calendarConfig?.configured && (
              <div className="md:col-span-2 space-y-2 p-2 border rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <CalendarCheckIcon className="h-4 w-4" />
                  Calendar Options
                </h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sync-calendar">Sync to Google Calendar</Label>
                    <p className="text-xs text-muted-foreground">
                      Create a calendar event and send invites
                    </p>
                  </div>
                  <Switch
                    id="sync-calendar"
                    checked={syncToCalendar}
                    onCheckedChange={setSyncToCalendar}
                  />
                </div>
                {syncToCalendar && !meetingLink && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="create-meet">Auto-create Google Meet</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically generate a Google Meet link
                      </p>
                    </div>
                    <Switch
                      id="create-meet"
                      checked={createGoogleMeet}
                      onCheckedChange={setCreateGoogleMeet}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Row 6: Notes (Full Width) */}
            <div className="md:col-span-2 grid gap-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions or topics to cover..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            </div>{/* End of grid container */}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Question Selection - Two Column Layout */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Panel: Question Sources (Bank or AI) */}
          <div>
            <Card className="sticky top-4 min-h-[calc(100vh-140px)] flex flex-col">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Question Sources
                </CardTitle>
                {selectedType && (
                  <CardDescription className="text-xs">
                    {selectedType.questionCategories?.map(c => categoryConfig[c]?.name || c).join(', ')}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
                <Tabs defaultValue="bank" className="flex-1 flex flex-col min-h-0">
                  <TabsList className="mx-0 mb-2 grid grid-cols-2 p-0">
                    <TabsTrigger value="bank">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Question Bank
                    </TabsTrigger>
                    <TabsTrigger value="ai">
                      <Sparkles className="h-4 w-4 mr-2" />
                      AuntyPelz AI
                    </TabsTrigger>
                  </TabsList>

                  {/* Question Bank Tab */}
                  <TabsContent value="bank" className="px-0.5 pb-2 !mt-0 flex-1 flex flex-col overflow-hidden min-h-0">
                    <Input
                      placeholder="Search questions..."
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      className="w-full mb-2"
                    />
                    {questionsLoading ? (
                      <div className="flex items-center justify-center flex-1">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredQuestions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-1 text-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No questions found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {questionCategories.length > 0
                            ? 'Try searching or seed defaults in Settings'
                            : 'No categories configured for this type'}
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="flex-1 pr-0.5 min-h-0">
                        <div className="space-y-2 pr-1">
                          {filteredQuestions.map((question) => {
                            const isSelected = selectedQuestions.some(q => q.id === question.id)
                            return (
                              <div
                                key={question.id}
                                className={cn(
                                  'p-2 border rounded-lg cursor-pointer transition-colors',
                                  isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                                )}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedQuestions(selectedQuestions.filter(q => q.id !== question.id))
                                  } else {
                                    addQuestion(question)
                                  }
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={cn(
                                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5',
                                    isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                                  )}>
                                    {isSelected && <Check className="h-2.5 w-2.5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Badge className={cn('text-[10px] px-1.5 py-0', categoryConfig[question.category]?.color || 'bg-gray-100 text-gray-700')}>
                                        {categoryConfig[question.category]?.name || question.category}
                                      </Badge>
                                      {question.isFavorite && (
                                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                      )}
                                    </div>
                                    <p className="text-sm leading-snug">{question.text}</p>
                                    {question.followUp && (
                                      <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                                        Follow-up: {question.followUp}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  {/* AI Generator Tab - forceMount to preserve state on tab switch */}
                  <TabsContent value="ai" className="px-0.5 pb-2 !mt-0 flex-1 overflow-auto" forceMount>
                    {selectedCandidateId ? (
                      <div className="-mt-6">
                        <AIQuestionGenerator
                          candidateId={selectedCandidateId}
                          interviewTypeId={interviewTypeId || undefined}
                          jobId={selectedCandidate?.job?.id || undefined}
                          onQuestionsAdded={(questions) => {
                            setSelectedQuestions(prev => [
                              ...prev,
                              ...questions.map(q => ({
                                ...q,
                                isCustom: q.isCustom ?? true,
                                saveToBank: q.saveToBank ?? true,
                                isRequired: q.isRequired ?? false,
                              }))
                            ])
                          }}
                          existingQuestionIds={selectedQuestions.filter(q => q.id).map(q => q.id!)}
                          compact
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Sparkles className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Select a candidate first</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Selected Questions */}
          <div>
            <Card className="min-h-[calc(100vh-140px)] flex flex-col">
              <CardHeader className="pb-2 px-3 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Selected Questions
                      <Badge variant="secondary" className="ml-1">{selectedQuestions.length}</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Questions for this interview
                    </CardDescription>
                  </div>
                  {selectedQuestions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 px-2"
                      onClick={() => setSelectedQuestions([])}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 flex-1 flex flex-col overflow-hidden">
                {selectedQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 border border-dashed rounded-lg">
                    <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">No questions selected</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px] text-center">
                      Add from Question Bank or generate with AuntyPelz AI
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 mb-3">
                    <div className="space-y-2 pr-2">
                      {selectedQuestions.map((q, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <Badge className={cn('text-[10px] px-1.5 py-0', categoryConfig[q.category]?.color || 'bg-gray-100 text-gray-700')}>
                                {categoryConfig[q.category]?.name || q.category}
                              </Badge>
                              {q.isCustom && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Custom</Badge>}
                              {q.isRequired && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Required</Badge>}
                            </div>
                            <p className="text-sm leading-snug">{q.text}</p>
                            {q.followUp && (
                              <p className="text-xs text-muted-foreground mt-1 italic">Follow-up: {q.followUp}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => toggleQuestionRequired(index)}
                              title={q.isRequired ? 'Mark as optional' : 'Mark as required'}
                            >
                              <Star className={cn('h-3.5 w-3.5', q.isRequired && 'fill-amber-400 text-amber-400')} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeQuestion(index)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Add Custom Question */}
                <div className="pt-3 border-t space-y-2 mt-auto">
                  <Label className="text-sm font-medium">Add Custom Question</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Select value={customQuestionCategory} onValueChange={setCustomQuestionCategory}>
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryConfig).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="save-to-bank"
                        checked={saveCustomToBank}
                        onCheckedChange={(v) => setSaveCustomToBank(v as boolean)}
                      />
                      <Label htmlFor="save-to-bank" className="text-xs text-muted-foreground">
                        Save to question bank
                      </Label>
                    </div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <Textarea
                      placeholder="Type your custom question..."
                      value={customQuestionText}
                      onChange={(e) => setCustomQuestionText(e.target.value)}
                      className="flex-1 min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.metaKey && customQuestionText.trim()) {
                          addCustomQuestion()
                        }
                      }}
                    />
                    <Button onClick={addCustomQuestion} disabled={!customQuestionText.trim()} size="icon" className="h-10 w-10">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 3: Assign Questions to Interviewers */}
      {currentStep === 3 && showStep3 && (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle>Assign Questions to Interviewers</CardTitle>
            <CardDescription>
              Drag questions to assign them to specific interviewers. This helps structure who asks what during the interview.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InterviewerQuestionAssignment
              questions={selectedQuestions}
              interviewers={selectedInterviewers}
              assignments={questionAssignments}
              onAssignmentsChange={setQuestionAssignments}
            />
          </CardContent>
        </Card>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between mt-3">
        <div>
          {currentStep === 1 && (
            <Link href="/hiring/interviews">
              <Button variant="outline">Cancel</Button>
            </Link>
          )}
          {(currentStep === 2 || currentStep === 3) && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep === 1 && (
            <>
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={!isStep1Valid || scheduleMutation.isPending}
              >
                Skip Questions & Schedule
              </Button>
              <Button
                onClick={handleNext}
                disabled={!isStep1Valid}
              >
                Next: Select Questions
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
          {currentStep === 2 && (
            <>
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={scheduleMutation.isPending}
              >
                {scheduleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Schedule Without Questions
              </Button>
              {showStep3 ? (
                <Button
                  onClick={handleNext}
                  disabled={selectedQuestions.length === 0}
                >
                  Next: Assign to Interviewers
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={scheduleMutation.isPending}
                >
                  {scheduleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Schedule Interview
                  {selectedQuestions.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedQuestions.length} questions
                    </Badge>
                  )}
                </Button>
              )}
            </>
          )}
          {currentStep === 3 && (
            <>
              <Button
                variant="outline"
                onClick={handleSkipStep3}
                disabled={scheduleMutation.isPending}
              >
                Skip Assignments
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={scheduleMutation.isPending}
              >
                {scheduleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Schedule Interview
                {selectedQuestions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedQuestions.length} questions
                  </Badge>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
