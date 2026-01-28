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
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Loader2,
  Mic,
  Search,
  Users,
  Video,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AttachFirefliesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interviewId: string
  candidateName?: string
  candidateEmail?: string
  onSuccess?: () => void
}

export function AttachFirefliesDialog({
  open,
  onOpenChange,
  interviewId,
  candidateName,
  candidateEmail,
  onSuccess,
}: AttachFirefliesDialogProps) {
  const [searchTitle, setSearchTitle] = useState('')
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)

  // Check if Fireflies is configured
  const { data: configData } = trpc.interview.isFirefliesConfigured.useQuery(undefined, {
    enabled: open,
  })

  // Search meetings
  const {
    data: meetings,
    isLoading: searchLoading,
    refetch: searchMeetings,
  } = trpc.interview.searchFirefliesMeetings.useQuery(
    {
      title: searchTitle || undefined,
      candidateName: candidateName,
      candidateEmail: candidateEmail,
      limit: 20,
    },
    {
      enabled: open && configData?.configured,
    }
  )

  // Get selected meeting details
  const { data: selectedMeeting, isLoading: detailsLoading } = trpc.interview.getFirefliesMeeting.useQuery(
    { meetingId: selectedMeetingId! },
    {
      enabled: !!selectedMeetingId && open,
    }
  )

  // Attach mutation
  const utils = trpc.useUtils()
  const attachMutation = trpc.interview.attachFirefliesRecording.useMutation({
    onSuccess: () => {
      utils.interview.get.invalidate()
      utils.interview.getTranscript.invalidate()
      toast.success('Recording attached successfully')
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to attach recording', { description: error.message })
    },
  })

  const handleAttach = () => {
    if (!selectedMeetingId) return
    attachMutation.mutate({
      interviewId,
      firefliesMeetingId: selectedMeetingId,
    })
  }

  const handleSearch = () => {
    searchMeetings()
  }

  if (!configData?.configured) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Fireflies Not Configured</DialogTitle>
            <DialogDescription>
              Fireflies integration requires an API key to be configured.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-warning-foreground">API Key Required</p>
                <p className="text-warning-foreground/80 mt-1">
                  Add <code className="bg-warning/20 px-1 rounded">FIREFLIES_API_KEY</code> to your
                  environment variables to enable this feature.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Attach Fireflies Recording
          </DialogTitle>
          <DialogDescription>
            Search and attach a Fireflies recording to this interview.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">
                Search meetings
              </Label>
              <Input
                id="search"
                placeholder="Search by meeting title..."
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button variant="outline" onClick={handleSearch} disabled={searchLoading}>
              {searchLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Results */}
          <div className="border rounded-lg">
            <ScrollArea className="h-[300px]">
              {searchLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {!searchLoading && (!meetings || meetings.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Video className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">No meetings found</p>
                  {candidateName && (
                    <p className="text-xs mt-1">Searched for: {candidateName}</p>
                  )}
                </div>
              )}

              {!searchLoading && meetings && meetings.length > 0 && (
                <div className="divide-y">
                  {meetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={() => setSelectedMeetingId(meeting.id)}
                      className={cn(
                        'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                        selectedMeetingId === meeting.id && 'bg-indigo-50 border-l-2 border-indigo-500'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm truncate">{meeting.title}</h4>
                            {selectedMeetingId === meeting.id && (
                              <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(meeting.date), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {meeting.duration} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meeting.participants.length} participants
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selected meeting preview */}
          {selectedMeetingId && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-medium text-sm mb-2">Selected Recording</h4>
              {detailsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading details...</span>
                </div>
              ) : selectedMeeting ? (
                <div className="space-y-2">
                  <p className="font-medium">{selectedMeeting.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(selectedMeeting.date), 'PPP')}
                    </Badge>
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {selectedMeeting.duration} minutes
                    </Badge>
                  </div>
                  {selectedMeeting.participants.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Participants:</span>{' '}
                      {selectedMeeting.participants.slice(0, 5).join(', ')}
                      {selectedMeeting.participants.length > 5 &&
                        ` +${selectedMeeting.participants.length - 5} more`}
                    </div>
                  )}
                  {selectedMeeting.summary?.overview && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Summary:</span>{' '}
                      {selectedMeeting.summary.overview.slice(0, 200)}
                      {selectedMeeting.summary.overview.length > 200 && '...'}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load meeting details</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAttach}
            disabled={!selectedMeetingId || attachMutation.isPending}
          >
            {attachMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Attach Recording
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
