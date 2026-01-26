'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import {
  CalendarIcon,
  Clock,
  Loader2,
  Users,
  X,
  Video,
  MessageSquare,
  Settings2,
  UserPlus,
  Star,
  Plus,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Interviewer {
  employeeId?: string
  name: string
  email: string
}

interface EditInterviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interview: {
    id: string
    scheduledAt?: Date | null
    duration?: number | null
    meetingLink?: string | null
    googleMeetLink?: string | null
    feedback?: string | null
    interviewers?: Interviewer[] | null
    interviewTypeId?: string | null
    stageName?: string | null
  }
  onSuccess?: () => void
}

const categoryConfig: Record<string, { name: string; color: string }> = {
  situational: { name: 'Situational', color: 'bg-indigo-100 text-indigo-700' },
  behavioral: { name: 'Behavioral', color: 'bg-success/10 text-success' },
  motivational: { name: 'Motivational', color: 'bg-amber-100 text-amber-700' },
  technical: { name: 'Technical', color: 'bg-pink-100 text-pink-700' },
  culture: { name: 'Culture', color: 'bg-cyan-100 text-cyan-700' },
}

export function EditInterviewDialog({
  open,
  onOpenChange,
  interview,
  onSuccess,
}: EditInterviewDialogProps) {
  const [activeTab, setActiveTab] = useState('details')

  // Details form state
  const [date, setDate] = useState<Date | undefined>(
    interview.scheduledAt ? new Date(interview.scheduledAt) : undefined
  )
  const [time, setTime] = useState(
    interview.scheduledAt
      ? format(new Date(interview.scheduledAt), 'HH:mm')
      : '10:00'
  )
  const [duration, setDuration] = useState(interview.duration || 60)
  const [meetingLink, setMeetingLink] = useState(interview.meetingLink || interview.googleMeetLink || '')
  const [notes, setNotes] = useState(interview.feedback || '')
  const [interviewTypeId, setInterviewTypeId] = useState(interview.interviewTypeId || '')

  // Interviewers state
  const [interviewers, setInterviewers] = useState<Interviewer[]>(
    (interview.interviewers as Interviewer[]) || []
  )
  const [interviewerOpen, setInterviewerOpen] = useState(false)
  const [interviewerSearch, setInterviewerSearch] = useState('')

  // Calendar popover state
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Fetch assigned questions
  const { data: assignedQuestions, refetch: refetchQuestions } = trpc.interview.getAssignedQuestions.useQuery(
    { interviewId: interview.id },
    { enabled: open }
  )

  // Fetch employees for adding interviewers
  const { data: employeesData, isLoading: employeesLoading } = trpc.employee.list.useQuery({
    search: interviewerSearch || undefined,
    status: 'ACTIVE',
    limit: 20,
  })

  // Fetch interview types
  const { data: interviewTypesData } = trpc.interviewType.list.useQuery()

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDate(interview.scheduledAt ? new Date(interview.scheduledAt) : undefined)
      setTime(
        interview.scheduledAt
          ? format(new Date(interview.scheduledAt), 'HH:mm')
          : '10:00'
      )
      setDuration(interview.duration || 60)
      setMeetingLink(interview.meetingLink || interview.googleMeetLink || '')
      setNotes(interview.feedback || '')
      setInterviewTypeId(interview.interviewTypeId || '')
      setInterviewers((interview.interviewers as Interviewer[]) || [])
      setActiveTab('details')
    }
  }, [open, interview])

  // Update mutation
  const utils = trpc.useUtils()
  const updateMutation = trpc.interview.update.useMutation({
    onSuccess: () => {
      toast.success('Interview updated')
      utils.interview.list.invalidate()
      utils.interview.get.invalidate({ id: interview.id })
      utils.interview.getUpcoming.invalidate()
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to update interview', {
        description: error.message,
      })
    },
  })

  // Remove question mutation
  const removeQuestionMutation = trpc.interview.removeAssignedQuestion.useMutation({
    onSuccess: () => {
      refetchQuestions()
      toast.success('Question removed')
    },
    onError: (error) => {
      toast.error('Failed to remove question', { description: error.message })
    },
  })

  // Handle save
  const handleSave = async () => {
    // Combine date and time
    let scheduledAt: string | undefined
    if (date) {
      const [hours, minutes] = time.split(':').map(Number)
      const combined = new Date(date)
      combined.setHours(hours, minutes, 0, 0)
      scheduledAt = combined.toISOString()
    }

    await updateMutation.mutateAsync({
      id: interview.id,
      scheduledAt,
      duration,
      meetingLink: meetingLink || null,
      notes: notes || null,
      interviewers,
      interviewTypeId: interviewTypeId || null,
    })
  }

  // Add interviewer
  const addInterviewer = (employee: { id: string; fullName: string; workEmail?: string | null }) => {
    if (!interviewers.find(i => i.employeeId === employee.id)) {
      setInterviewers([
        ...interviewers,
        {
          employeeId: employee.id,
          name: employee.fullName,
          email: employee.workEmail || '',
        },
      ])
    }
    setInterviewerOpen(false)
    setInterviewerSearch('')
  }

  // Remove interviewer
  const removeInterviewer = (employeeId: string | undefined, email: string) => {
    setInterviewers(interviewers.filter(i =>
      employeeId ? i.employeeId !== employeeId : i.email !== email
    ))
  }

  // Question assignments grouped by interviewer
  const groupedQuestions = useMemo(() => {
    if (!assignedQuestions) return { unassigned: [], byInterviewer: {} as Record<string, typeof assignedQuestions> }

    const byInterviewer: Record<string, typeof assignedQuestions> = {}
    const unassigned: typeof assignedQuestions = []

    for (const q of assignedQuestions) {
      if (q.assignedToInterviewerId) {
        if (!byInterviewer[q.assignedToInterviewerId]) {
          byInterviewer[q.assignedToInterviewerId] = []
        }
        byInterviewer[q.assignedToInterviewerId].push(q)
      } else {
        unassigned.push(q)
      }
    }

    return { unassigned, byInterviewer }
  }, [assignedQuestions])

  const hasMultipleInterviewers = interviewers.length >= 2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Interview</DialogTitle>
          <DialogDescription>
            Update interview details, interviewers, and questions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="text-xs">
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
              Details
            </TabsTrigger>
            <TabsTrigger value="interviewers" className="text-xs">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Interviewers
              {interviewers.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">
                  {interviewers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="questions" className="text-xs">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Questions
              {assignedQuestions && assignedQuestions.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">
                  {assignedQuestions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-4">
            <div className="space-y-4">
              {/* Interview Type */}
              <div className="space-y-2">
                <Label>Interview Type</Label>
                <Select value={interviewTypeId} onValueChange={setInterviewTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select interview type" />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewTypesData?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {interview.stageName && (
                  <p className="text-xs text-muted-foreground">
                    Current stage: {interview.stageName}
                  </p>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'PPP') : 'Pick a date'}
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
                        disabled={(d) => d < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
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
              <div className="space-y-2">
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

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions or topics to cover..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          {/* Interviewers Tab */}
          <TabsContent value="interviewers" className="mt-4">
            <div className="space-y-4">
              {/* Current interviewers */}
              {interviewers.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Interviewers</Label>
                  <div className="space-y-2">
                    {interviewers.map((interviewer, idx) => (
                      <div
                        key={interviewer.employeeId || idx}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{interviewer.name}</p>
                            <p className="text-xs text-muted-foreground">{interviewer.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeInterviewer(interviewer.employeeId, interviewer.email)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add interviewer */}
              <div className="space-y-2">
                <Label>Add Interviewer</Label>
                <Popover open={interviewerOpen} onOpenChange={setInterviewerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add interviewer...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command shouldFilter={false}>
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
                                ?.filter(e => !interviewers.find(i => i.employeeId === e.id))
                                .map((employee) => (
                                  <CommandItem
                                    key={employee.id}
                                    value={employee.id}
                                    onSelect={() => addInterviewer(employee)}
                                    className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
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

              {interviewers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No interviewers assigned</p>
                  <p className="text-xs mt-1">Add interviewers to this interview</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="mt-4">
            {!assignedQuestions?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No questions assigned</p>
                <p className="text-xs mt-1">Questions can be added during scheduling</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-4">
                  {/* Show grouped if there are assignments */}
                  {hasMultipleInterviewers && Object.keys(groupedQuestions.byInterviewer).length > 0 ? (
                    <>
                      {Object.entries(groupedQuestions.byInterviewer).map(([interviewerId, interviewerQuestions]) => {
                        const interviewerName = interviewerQuestions?.[0]?.assignedToInterviewerName ||
                          interviewers.find(i => i.employeeId === interviewerId)?.name ||
                          'Unknown'
                        return (
                          <div key={interviewerId}>
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{interviewerName}</span>
                              <Badge variant="secondary" className="text-xs">
                                {interviewerQuestions?.length || 0}
                              </Badge>
                            </div>
                            <div className="space-y-2 ml-6">
                              {interviewerQuestions?.map((q) => (
                                <QuestionItem
                                  key={q.id}
                                  question={q}
                                  onRemove={() => removeQuestionMutation.mutate({ id: q.id })}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      {groupedQuestions.unassigned.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Unassigned</span>
                            <Badge variant="secondary" className="text-xs">
                              {groupedQuestions.unassigned.length}
                            </Badge>
                          </div>
                          <div className="space-y-2 ml-6">
                            {groupedQuestions.unassigned.map((q) => (
                              <QuestionItem
                                key={q.id}
                                question={q}
                                onRemove={() => removeQuestionMutation.mutate({ id: q.id })}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      {assignedQuestions.map((q) => (
                        <QuestionItem
                          key={q.id}
                          question={q}
                          onRemove={() => removeQuestionMutation.mutate({ id: q.id })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface QuestionItemProps {
  question: {
    id: string
    text: string
    category: string
    isRequired: boolean
    isCustom: boolean
  }
  onRemove: () => void
}

function QuestionItem({ question, onRemove }: QuestionItemProps) {
  const category = categoryConfig[question.category] || { name: question.category, color: 'bg-gray-100 text-gray-700' }

  return (
    <div className="flex items-start gap-2 p-2.5 border rounded-lg bg-muted/20 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Badge className={cn('text-[10px] px-1.5 py-0', category.color)}>
            {category.name}
          </Badge>
          {question.isCustom && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Custom
            </Badge>
          )}
          {question.isRequired && (
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          )}
        </div>
        <p className="text-sm leading-snug line-clamp-2">{question.text}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
