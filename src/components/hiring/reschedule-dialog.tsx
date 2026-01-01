'use client'

import { useState, useEffect } from 'react'
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
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { CalendarIcon, Clock, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface RescheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interviewId: string
  currentScheduledAt?: Date
  currentDuration?: number
  onSuccess?: () => void
}

export function RescheduleDialog({
  open,
  onOpenChange,
  interviewId,
  currentScheduledAt,
  currentDuration = 60,
  onSuccess,
}: RescheduleDialogProps) {
  // Form state
  const [date, setDate] = useState<Date | undefined>(
    currentScheduledAt ? new Date(currentScheduledAt) : undefined
  )
  const [time, setTime] = useState(
    currentScheduledAt
      ? format(new Date(currentScheduledAt), 'HH:mm')
      : '10:00'
  )
  const [duration, setDuration] = useState(currentDuration)
  const [reason, setReason] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Reset form when dialog opens with new interview
  useEffect(() => {
    if (open && currentScheduledAt) {
      const scheduledDate = new Date(currentScheduledAt)
      setDate(scheduledDate)
      setTime(format(scheduledDate, 'HH:mm'))
      setDuration(currentDuration)
      setReason('')
    }
  }, [open, currentScheduledAt, currentDuration])

  // Reschedule mutation
  const utils = trpc.useUtils()
  const rescheduleMutation = trpc.interview.reschedule.useMutation({
    onSuccess: () => {
      toast.success('Interview rescheduled', {
        description: `Rescheduled to ${format(date!, 'PPP')} at ${time}`,
      })
      utils.interview.list.invalidate()
      utils.interview.get.invalidate({ id: interviewId })
      utils.interview.getUpcoming.invalidate()
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to reschedule', {
        description: error.message,
      })
    },
  })

  // Handle submit
  const handleSubmit = async () => {
    if (!date) {
      toast.error('Please select a date')
      return
    }

    // Combine date and time
    const [hours, minutes] = time.split(':').map(Number)
    const scheduledAt = new Date(date)
    scheduledAt.setHours(hours, minutes, 0, 0)

    await rescheduleMutation.mutateAsync({
      id: interviewId,
      scheduledAt: scheduledAt.toISOString(),
      duration,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reschedule Interview</DialogTitle>
          <DialogDescription>
            Select a new date and time for this interview.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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

          {/* Reason */}
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why is this interview being rescheduled?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!date || rescheduleMutation.isPending}
          >
            {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
