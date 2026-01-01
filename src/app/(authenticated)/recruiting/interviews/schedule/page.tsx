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
  CommandItem,
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
  behavioral: { name: 'Behavioral', color: 'bg-green-100 text-green-700' },
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

  // Popover states
  const [interviewerOpen, setInterviewerOpen] = useState(false)
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

  // Find available slots for selected interviewers
  const interviewerEmails = selectedInterviewers.map(i => i.email).filter(Boolean)
  const {
    data: availableSlots,
    isLoading: slotsLoading,
    refetch: refetchSlots,
  } = trpc.interview.findAvailableSlots.useQuery({
    interviewerEmails,
    duration,
    dateFrom: dateRangeStart.toISOString(),
    dateTo: dateRangeEnd.toISOString(),
    workingHoursStart: 9,
    workingHoursEnd: 17,
  }, {
    enabled: calendarConfig?.configured && interviewerEmails.length > 0 && schedulingMode === 'suggested',
  })

  // Get selected interview type info
  const selectedType = useMemo(() => {
    return interviewTypesData?.find(t => t.id === interviewTypeId)
  }, [interviewTypesData, interviewTypeId])

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
      router.push('/recruiting/interviews')
    },
    onError: (error) => {
      toast.error('Failed to schedule interview', {
        description: error.message,
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

  // Handle next step
  const handleNext = () => {
    if (currentStep === 1 && isStep1Valid) {
      setCurrentStep(2)
    }
  }

  // Handle back
  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    }
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
    const customQuestions = skipQuestions ? [] : selectedQuestions.filter(q => q.isCustom).map(q => ({
      text: q.text,
      category: q.category,
      isRequired: q.isRequired,
      saveToBank: q.saveToBank,
    }))

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
    })
  }

  // Effect to refetch slots when duration or date range changes
  useEffect(() => {
    if (calendarConfig?.configured && interviewerEmails.length > 0 && schedulingMode === 'suggested') {
      refetchSlots()
    }
  }, [duration, dateRangeStart, dateRangeEnd])

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
  }, [availableSlots])

  return (
    <div className="container max-w-4xl py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/recruiting/interviews">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Schedule Interview</h1>
          <p className="text-sm text-muted-foreground">
            Step {currentStep} of 2: {currentStep === 1 ? 'Interview Details' : 'Select Questions'}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
          currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}>
          1
        </div>
        <div className={cn('flex-1 h-1 rounded', currentStep >= 2 ? 'bg-primary' : 'bg-muted')} />
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
          currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}>
          2
        </div>
      </div>

      {/* Step 1: Interview Details */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Interview Details</CardTitle>
            <CardDescription>
              Select the candidate, interview type, interviewers, and schedule time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Candidate Selection */}
            <div className="grid gap-2">
              <Label htmlFor="candidate">Candidate *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="candidateSearch"
                  placeholder="Search candidates..."
                  className="pl-9"
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  disabled={!!preselectedCandidateId}
                />
              </div>
              <Select
                value={selectedCandidateId}
                onValueChange={setSelectedCandidateId}
                disabled={!!preselectedCandidateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={candidatesLoading ? 'Loading candidates...' : 'Select candidate...'} />
                </SelectTrigger>
                <SelectContent>
                  {candidatesLoading ? (
                    <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading candidates...
                    </div>
                  ) : (
                    <>
                      {candidatesData?.candidates?.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name} - {candidate.job?.title || 'No position'}
                      </SelectItem>
                      ))}
                      {(!candidatesData?.candidates || candidatesData.candidates.length === 0) && (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          {candidateSearch ? 'No candidates found' : 'No candidates available'}
                        </div>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Interview Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Interview Type *</Label>
              <Select value={interviewTypeId} onValueChange={handleInterviewTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder={typesLoading ? "Loading types..." : "Select interview type..."} />
                </SelectTrigger>
                <SelectContent>
                  {interviewTypesData?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex flex-col">
                        <span>{type.name}</span>
                        <span className="text-xs text-muted-foreground">{type.defaultDuration} min</span>
                      </div>
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

            {/* Date & Time Selection */}
            {calendarConfig?.configured && selectedInterviewers.length > 0 ? (
              <div className="grid gap-2">
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

                    {/* Available Slots */}
                    {slotsLoading ? (
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
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-800">
                          <Check className="h-4 w-4" />
                          <span className="font-medium">Selected: </span>
                          <span>{format(new Date(selectedSlot.start), 'EEEE, MMMM d \'at\' h:mm a')}</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="manual" className="mt-4">
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
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="grid gap-2">
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
                {selectedInterviewers.length > 0 && !calendarConfig?.configured && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
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

            {/* Meeting Link */}
            <div className="grid gap-2">
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

            {/* Calendar Integration Options */}
            {calendarConfig?.configured && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium flex items-center gap-2">
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
          </CardContent>
        </Card>
      )}

      {/* Step 2: Question Selection */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Select Interview Questions
              </CardTitle>
              <CardDescription>
                Choose questions for this interview from the bank or add custom ones.
                {selectedType && (
                  <span className="block mt-1">
                    Showing questions for: {selectedType.questionCategories?.map(c => categoryConfig[c]?.name || c).join(', ')}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selected Questions */}
              <div>
                <Label className="mb-2 block">Selected Questions ({selectedQuestions.length})</Label>
                {selectedQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-lg">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No questions selected yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Add questions from the bank below or create custom ones</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedQuestions.map((q, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={categoryConfig[q.category]?.color || 'bg-gray-100 text-gray-700'}>
                              {categoryConfig[q.category]?.name || q.category}
                            </Badge>
                            {q.isCustom && <Badge variant="outline">Custom</Badge>}
                            {q.isRequired && <Badge variant="secondary">Required</Badge>}
                            {q.saveToBank && <Badge variant="secondary">Save to Bank</Badge>}
                          </div>
                          <p className="text-sm">{q.text}</p>
                          {q.followUp && (
                            <p className="text-xs text-muted-foreground mt-1 italic">Follow-up: {q.followUp}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleQuestionRequired(index)}
                            title={q.isRequired ? 'Mark as optional' : 'Mark as required'}
                          >
                            <Star className={cn('h-4 w-4', q.isRequired && 'fill-amber-400 text-amber-400')} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeQuestion(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Custom Question */}
              <div className="space-y-3 p-4 border rounded-lg">
                <Label>Add Custom Question</Label>
                <div className="flex gap-2">
                  <Select value={customQuestionCategory} onValueChange={setCustomQuestionCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryConfig).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Type your custom question..."
                    value={customQuestionText}
                    onChange={(e) => setCustomQuestionText(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customQuestionText.trim()) {
                        addCustomQuestion()
                      }
                    }}
                  />
                  <Button onClick={addCustomQuestion} disabled={!customQuestionText.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="save-to-bank"
                    checked={saveCustomToBank}
                    onCheckedChange={(v) => setSaveCustomToBank(v as boolean)}
                  />
                  <Label htmlFor="save-to-bank" className="text-sm text-muted-foreground">
                    Save this question to the question bank for future use
                  </Label>
                </div>
              </div>

              {/* Question Bank */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Question Bank</Label>
                  <Input
                    placeholder="Search questions..."
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    className="w-64"
                  />
                </div>
                {questionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-lg">
                    <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No questions found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {questionCategories.length > 0
                        ? `Try searching or seed default questions in Settings`
                        : 'This interview type has no question categories configured'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] border rounded-lg">
                    <div className="p-3 space-y-2">
                      {filteredQuestions.map((question) => {
                        const isSelected = selectedQuestions.some(q => q.id === question.id)
                        return (
                          <div
                            key={question.id}
                            className={cn(
                              'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
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
                            <div className={cn(
                              'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5',
                              isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                            )}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={categoryConfig[question.category]?.color || 'bg-gray-100 text-gray-700'}>
                                  {categoryConfig[question.category]?.name || question.category}
                                </Badge>
                                {question.isFavorite && (
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                )}
                              </div>
                              <p className="text-sm">{question.text}</p>
                              {question.followUp && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  Follow-up: {question.followUp}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {currentStep === 1 && (
            <Link href="/recruiting/interviews">
              <Button variant="outline">Cancel</Button>
            </Link>
          )}
          {currentStep === 2 && (
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
