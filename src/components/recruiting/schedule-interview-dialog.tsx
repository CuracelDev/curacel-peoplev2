'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Sparkles,
  AlertCircle,
  Calendar as CalendarCheckIcon,
} from 'lucide-react'
import { format, addDays, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns'
import { toast } from 'sonner'

interface ScheduleInterviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateId?: string
  jobId?: string
  onSuccess?: () => void
}

interface AvailableSlot {
  start: Date
  end: Date
  allAvailable: boolean
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

  // Popover states
  const [candidateOpen, setCandidateOpen] = useState(false)
  const [interviewerOpen, setInterviewerOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [interviewerSearch, setInterviewerSearch] = useState('')

  // Check if calendar is configured
  const { data: calendarConfig } = trpc.interview.isCalendarConfigured.useQuery(undefined, {
    enabled: open,
  })

  // Fetch interview types from database
  const { data: interviewTypesData, isLoading: typesLoading } = trpc.interviewType.list.useQuery(undefined, {
    enabled: open,
  })

  // Fetch candidates
  const { data: candidatesData, isLoading: candidatesLoading } = trpc.job.getAllCandidates.useQuery({
    search: candidateSearch || undefined,
    limit: 20,
  }, {
    enabled: open,
  })

  // Fetch employees for interviewers
  const { data: employeesData, isLoading: employeesLoading } = trpc.employee.list.useQuery({
    search: interviewerSearch || undefined,
    status: 'ACTIVE',
    limit: 20,
  }, {
    enabled: open,
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
    enabled: open && calendarConfig?.configured && interviewerEmails.length > 0 && schedulingMode === 'suggested',
  })

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
          // Calendar sync failed but interview was scheduled
          toast.warning('Interview scheduled but calendar sync failed')
        }
      }

      utils.interview.list.invalidate()
      utils.interview.getCounts.invalidate()
      toast.success('Interview scheduled successfully')
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to schedule interview', {
        description: error.message,
      })
    },
  })

  // Sync to calendar mutation
  const syncCalendarMutation = trpc.interview.syncInterviewToCalendar.useMutation()

  // Get selected candidate info
  const selectedCandidate = useMemo(() => {
    return candidatesData?.candidates?.find(c => c.id === selectedCandidateId)
  }, [candidatesData, selectedCandidateId])

  // Get selected interview type info
  const selectedType = useMemo(() => {
    return interviewTypesData?.find(t => t.id === interviewTypeId)
  }, [interviewTypesData, interviewTypeId])

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
    setSelectedSlot(null) // Clear selected slot when interviewers change
  }

  // Reset form
  const resetForm = () => {
    setSelectedCandidateId(preselectedCandidateId || '')
    setInterviewTypeId('')
    setSelectedInterviewers([])
    setDate(undefined)
    setTime('10:00')
    setDuration(60)
    setMeetingLink('')
    setNotes('')
    setCandidateSearch('')
    setInterviewerSearch('')
    setSelectedSlot(null)
    setSchedulingMode('suggested')
    setCreateGoogleMeet(true)
    setSyncToCalendar(true)
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedCandidateId || !interviewTypeId || !date || selectedInterviewers.length === 0) {
      return
    }

    // Combine date and time
    const [hours, minutes] = time.split(':').map(Number)
    const scheduledAt = new Date(date)
    scheduledAt.setHours(hours, minutes, 0, 0)

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
    })
  }

  // Effect to refetch slots when duration or date range changes
  useEffect(() => {
    if (calendarConfig?.configured && interviewerEmails.length > 0 && schedulingMode === 'suggested') {
      refetchSlots()
    }
  }, [duration, dateRangeStart, dateRangeEnd])

  const isValid = selectedCandidateId && interviewTypeId && date && selectedInterviewers.length > 0

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
            // Fallback to manual scheduling when calendar not configured
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || scheduleMutation.isPending || syncCalendarMutation.isPending}
          >
            {(scheduleMutation.isPending || syncCalendarMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Schedule Interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
