'use client'

import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Mail,
  Send,
  Reply,
  Clock,
  Eye,
  MousePointer2,
  Paperclip,
  RefreshCw,
  ChevronRight,
  Inbox,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'
import { EmailComposer } from './email-composer'

interface EmailTabProps {
  candidateId: string
  candidateName: string
  candidateEmail: string
  jobId?: string
  jobTitle?: string
}

export function EmailTab({ candidateId, candidateName, candidateEmail, jobId, jobTitle }: EmailTabProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [replyToEmailId, setReplyToEmailId] = useState<string | null>(null)

  // Fetch threads for this candidate
  const { data: threads, isLoading: threadsLoading, refetch: refetchThreads } = trpc.candidateEmail.listThreads.useQuery(
    { candidateId },
    { enabled: !!candidateId }
  )

  // Fetch messages for selected thread
  const { data: threadData, isLoading: messagesLoading } = trpc.candidateEmail.getThread.useQuery(
    { threadId: selectedThreadId! },
    { enabled: !!selectedThreadId }
  )

  // Sync replies mutation
  const syncReplies = trpc.candidateEmail.syncReplies.useMutation({
    onSuccess: () => {
      refetchThreads()
      if (selectedThreadId) {
        // Refetch thread messages
      }
    },
  })

  // Mark as read mutation
  const markAsRead = trpc.candidateEmail.markAsRead.useMutation({
    onSuccess: () => refetchThreads(),
  })

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId)
    setIsComposing(false)
    setReplyToEmailId(null)

    // Mark thread as read
    const thread = threads?.find(t => t.id === threadId)
    if (thread && thread.unreadCount > 0) {
      markAsRead.mutate({ threadId })
    }
  }

  const handleCompose = () => {
    setIsComposing(true)
    setSelectedThreadId(null)
    setReplyToEmailId(null)
  }

  const handleReply = (emailId: string) => {
    setReplyToEmailId(emailId)
    setIsComposing(true)
  }

  const handleEmailSent = () => {
    setIsComposing(false)
    setReplyToEmailId(null)
    refetchThreads()
  }

  const handleSyncReplies = () => {
    if (selectedThreadId) {
      syncReplies.mutate({ threadId: selectedThreadId })
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return <CheckCircle2 className="h-3.5 w-3.5 text-success" />
      case 'OPENED':
        return <Eye className="h-3.5 w-3.5 text-blue-500" />
      case 'CLICKED':
        return <MousePointer2 className="h-3.5 w-3.5 text-purple-500" />
      case 'FAILED':
      case 'BOUNCED':
        return <AlertCircle className="h-3.5 w-3.5 text-red-500" />
      case 'DRAFT':
        return <FileText className="h-3.5 w-3.5 text-gray-400" />
      default:
        return <Mail className="h-3.5 w-3.5 text-gray-400" />
    }
  }

  if (threadsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[600px]">
      {/* Thread List */}
      <Card className="h-full">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Email Threads
          </CardTitle>
          <Button size="sm" onClick={handleCompose}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Compose
          </Button>
        </CardHeader>
        <Separator />
        <ScrollArea className="h-[calc(100%-64px)]">
          {threads && threads.length > 0 ? (
            <div className="divide-y">
              {threads.map((thread) => {
                const lastMessage = thread.messages[0]
                const isSelected = selectedThreadId === thread.id

                return (
                  <button
                    key={thread.id}
                    onClick={() => handleThreadSelect(thread.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-muted'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {thread.unreadCount > 0 && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <span className={cn(
                            'text-sm truncate',
                            thread.unreadCount > 0 ? 'font-semibold' : 'font-medium'
                          )}>
                            {thread.subject}
                          </span>
                        </div>
                        {lastMessage && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {lastMessage.direction === 'OUTBOUND' ? 'You: ' : `${candidateName}: `}
                            {lastMessage.textBody?.slice(0, 80) || lastMessage.htmlBody?.replace(/<[^>]*>/g, '').slice(0, 80)}...
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
                        </span>
                        {thread.unreadCount > 0 && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                            {thread.unreadCount}
                          </Badge>
                        )}
                        {lastMessage && getStatusIcon(lastMessage.status)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Mail className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No emails yet</p>
              <p className="text-xs text-muted-foreground/60 mb-4">
                Start a conversation with {candidateName}
              </p>
              <Button size="sm" variant="outline" onClick={handleCompose}>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Send First Email
              </Button>
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Email Content / Composer */}
      <Card className="h-full">
        {isComposing ? (
          <>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {replyToEmailId ? 'Reply' : 'New Email'}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <EmailComposer
                candidateId={candidateId}
                candidateName={candidateName}
                candidateEmail={candidateEmail}
                jobId={jobId}
                jobTitle={jobTitle}
                replyToEmailId={replyToEmailId || undefined}
                onSent={handleEmailSent}
                onCancel={() => {
                  setIsComposing(false)
                  setReplyToEmailId(null)
                }}
              />
            </CardContent>
          </>
        ) : selectedThreadId && threadData ? (
          <>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium truncate">
                {threadData.thread.subject}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSyncReplies}
                  disabled={syncReplies.isPending}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', syncReplies.isPending && 'animate-spin')} />
                </Button>
                <Button size="sm" onClick={() => handleReply(threadData.messages[threadData.messages.length - 1]?.id)}>
                  <Reply className="h-3.5 w-3.5 mr-1.5" />
                  Reply
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <ScrollArea className="h-[calc(100%-64px)]">
              <div className="divide-y">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  threadData.messages.map((message) => (
                    <div key={message.id} className="p-4">
                      {/* Message Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {message.direction === 'OUTBOUND' ? 'You' : message.fromName || message.fromEmail}
                            </span>
                            {message.direction === 'INBOUND' && (
                              <Badge variant="secondary" className="text-[10px]">Received</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            To: {message.toEmails.join(', ')}
                            {message.ccEmails.length > 0 && (
                              <span className="ml-2">CC: {message.ccEmails.join(', ')}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {message.sentAt && (
                            <span>{format(new Date(message.sentAt), 'MMM d, h:mm a')}</span>
                          )}
                          {getStatusIcon(message.status)}
                        </div>
                      </div>

                      {/* Message Body */}
                      <div
                        className="text-sm prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: message.htmlBody }}
                      />

                      {/* Attachments */}
                      {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(message.attachments as Array<{ filename: string; mimeType: string; size: number }>).map((att, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {att.filename} ({Math.round(att.size / 1024)}KB)
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tracking Info */}
                      {message.direction === 'OUTBOUND' && (message.openCount > 0 || message.clickCount > 0) && (
                        <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
                          {message.openCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Opened {message.openCount}x
                              {message.openedAt && (
                                <span className="text-muted-foreground/60">
                                  (first: {formatDistanceToNow(new Date(message.openedAt), { addSuffix: true })})
                                </span>
                              )}
                            </span>
                          )}
                          {message.clickCount > 0 && (
                            <span className="flex items-center gap-1">
                              <MousePointer2 className="h-3 w-3" />
                              {message.clickCount} link click{message.clickCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Mail className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-1">Select a conversation</p>
            <p className="text-xs text-muted-foreground/60">
              or compose a new email to {candidateName}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
