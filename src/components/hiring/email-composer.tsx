'use client'

import { useState, useEffect } from 'react'
import {
  Send,
  Paperclip,
  Wand2,
  ChevronDown,
  X,
  Loader2,
  FileText,
  Clock,
} from 'lucide-react'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'
import { format } from 'date-fns'

interface EmailComposerProps {
  candidateId: string
  candidateName: string
  candidateEmail: string
  jobId?: string
  jobTitle?: string
  replyToEmailId?: string
  initialSubject?: string
  initialBody?: string
  onSent?: () => void
  onCancel?: () => void
}

export function EmailComposer({
  candidateId,
  candidateName,
  candidateEmail,
  jobId,
  jobTitle,
  replyToEmailId,
  initialSubject = '',
  initialBody = '',
  onSent,
  onCancel,
}: EmailComposerProps) {
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [ccEmails, setCcEmails] = useState<string[]>(['peopleops@curacel.ai'])
  const [newCc, setNewCc] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>()
  const [isEnhancing, setIsEnhancing] = useState(false)

  // Fetch templates
  const { data: templates } = trpc.candidateEmail.listTemplates.useQuery(
    { jobId },
    { enabled: true }
  )

  // Send email mutation
  const sendEmail = trpc.candidateEmail.sendEmail.useMutation({
    onSuccess: () => {
      onSent?.()
    },
  })

  // Save draft mutation
  const saveDraft = trpc.candidateEmail.saveDraft.useMutation()

  // Preview template mutation
  const previewTemplate = trpc.candidateEmail.previewTemplate.useMutation()

  // Handle template selection
  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId)

    try {
      const result = await previewTemplate.mutateAsync({
        templateId,
        candidateId,
      })

      setSubject(result.subject)
      setBody(result.htmlBody)
    } catch (error) {
      console.error('Failed to preview template:', error)
    }
  }

  // Handle AI enhancement
  const handleEnhance = async () => {
    setIsEnhancing(true)
    // AI enhancement would be implemented here
    // For now, just simulate a delay
    setTimeout(() => {
      setIsEnhancing(false)
    }, 1000)
  }

  // Handle send
  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      return
    }

    // Convert attachments to base64
    const attachmentData = await Promise.all(
      attachments.map(async (file) => {
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        return {
          filename: file.name,
          mimeType: file.type,
          content: base64,
        }
      })
    )

    sendEmail.mutate({
      candidateId,
      subject,
      htmlBody: body,
      textBody: body.replace(/<[^>]*>/g, ''),
      templateId: selectedTemplateId || undefined,
      attachments: attachmentData.length > 0 ? attachmentData : undefined,
      replyToEmailId,
      scheduledFor: scheduledDate,
    })
  }

  // Handle save draft
  const handleSaveDraft = () => {
    if (!subject.trim() && !body.trim()) {
      return
    }

    saveDraft.mutate({
      candidateId,
      subject,
      htmlBody: body,
      textBody: body.replace(/<[^>]*>/g, ''),
      templateId: selectedTemplateId || undefined,
    })
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)])
    }
  }

  // Handle CC add
  const handleAddCc = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newCc.trim()) {
      if (!ccEmails.includes(newCc.trim())) {
        setCcEmails([...ccEmails, newCc.trim()])
      }
      setNewCc('')
    }
  }

  // Handle CC remove
  const handleRemoveCc = (email: string) => {
    setCcEmails(ccEmails.filter(e => e !== email))
  }

  // Remove attachment
  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* To */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">To</Label>
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
          <Badge variant="secondary">{candidateEmail}</Badge>
          <span className="text-sm text-muted-foreground">{candidateName}</span>
        </div>
      </div>

      {/* CC */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">CC</Label>
        <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-md min-h-[40px]">
          {ccEmails.map((email) => (
            <Badge key={email} variant="secondary" className="gap-1">
              {email}
              <button
                onClick={() => handleRemoveCc(email)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={newCc}
            onChange={(e) => setNewCc(e.target.value)}
            onKeyDown={handleAddCc}
            placeholder="Add CC email..."
            className="border-0 bg-transparent h-6 text-sm flex-1 min-w-[150px] focus-visible:ring-0 p-0"
          />
        </div>
      </div>

      {/* Template Selector */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Template</Label>
        <Select value={selectedTemplateId || ''} onValueChange={handleTemplateSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a template or compose freely" />
          </SelectTrigger>
          <SelectContent>
            {templates?.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{template.name}</span>
                  {template.stage && (
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {template.stage}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Subject</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={`Email to ${candidateName} about ${jobTitle || 'position'}`}
        />
      </div>

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs text-muted-foreground">Message</Label>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEnhance}
            disabled={isEnhancing || !body.trim()}
            className="h-6 text-xs"
          >
            {isEnhancing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3 mr-1" />
            )}
            BlueAI Enhance
          </Button>
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message here..."
          rows={12}
          className="resize-none"
        />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Attachments</Label>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <Badge key={index} variant="outline" className="gap-1.5 py-1">
                <Paperclip className="h-3 w-3" />
                {file.name} ({Math.round(file.size / 1024)}KB)
                <button
                  onClick={() => handleRemoveAttachment(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Paperclip className="h-4 w-4 mr-1" />
            Attach
          </Button>
          <input
            id="file-input"
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost">
                <Clock className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={scheduledDate}
                onSelect={setScheduledDate}
                initialFocus
                disabled={(date) => date < new Date()}
              />
              {scheduledDate && (
                <div className="p-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Scheduled for {format(scheduledDate, 'PPP')}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setScheduledDate(undefined)}
                    className="mt-1 h-6 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saveDraft.isPending || (!subject.trim() && !body.trim())}
          >
            {saveDraft.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sendEmail.isPending || !subject.trim() || !body.trim()}
          >
            {sendEmail.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5 mr-1.5" />
            )}
            {scheduledDate ? 'Schedule' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
