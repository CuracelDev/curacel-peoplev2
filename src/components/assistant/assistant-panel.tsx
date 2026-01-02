'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Bot, ArrowUp, Loader2, AlertCircle, Sparkles, Mic, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isError?: boolean
}

const SUGGESTED_PROMPTS = [
  'Find all contracts in DRAFT status',
  'How many employees did we hire in 2024?',
  'Show me the onboarding status for the latest hire',
  'Create a contract draft for a new Software Engineer',
]

interface AssistantPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssistantPanel({ open, onOpenChange }: AssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const transcribeMutation = trpc.assistant.transcribe.useMutation({
    onSuccess: (data) => {
      setInput((prev) => (prev ? `${prev} ${data.text}` : data.text))
      inputRef.current?.focus()
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Voice transcription failed: ${error.message}`,
          timestamp: new Date(),
          isError: true,
        },
      ])
    },
    onSettled: () => {
      setIsTranscribing(false)
    },
  })

  const chatMutation = trpc.assistant.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
        },
      ])
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: error.message || 'An error occurred. Please try again.',
          timestamp: new Date(),
          isError: true,
        },
      ])
    },
  })

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSend = useCallback(() => {
    const trimmedInput = input.trim()
    if (!trimmedInput || chatMutation.isPending) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')

    // Build message history for the API
    const messageHistory = [
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: trimmedInput },
    ]

    chatMutation.mutate({ messages: messageHistory })
  }, [input, chatMutation, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  const handleClearChat = () => {
    setMessages([])
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })

      audioChunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())

        // Convert to base64
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          setIsTranscribing(true)
          transcribeMutation.mutate({
            audioBase64: base64,
            mimeType: 'audio/webm',
          })
        }
        reader.readAsDataURL(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Failed to access microphone. Please ensure microphone permissions are granted.',
          timestamp: new Date(),
          isError: true,
        },
      ])
    }
  }, [transcribeMutation])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="px-4 py-3 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <SheetTitle className="text-base font-semibold">AuntyPelz</SheetTitle>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear chat
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto bg-secondary/40 p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary mb-4">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                How can I help?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                I can help with contracts, onboarding, employee lookup, and analytics.
              </p>
              <div className="space-y-2 w-full">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Try asking
                </p>
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="w-full text-left px-4 py-2 text-sm text-foreground bg-white border border-border hover:bg-secondary rounded-lg transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.isError
                        ? 'border border-destructive/30 bg-destructive/10 text-destructive-foreground'
                        : 'bg-white text-foreground shadow-sm'
                    )}
                  >
                    {message.isError && (
                      <div className="flex items-center gap-1 mb-1 text-xs font-medium text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        Error
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">
                      {formatAssistantMessage(message.content)}
                    </div>
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-2 text-sm text-muted-foreground shadow-sm">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Thinking...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="border-t p-4 bg-white">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? 'Recording...' : isTranscribing ? 'Transcribing...' : 'Ask me anything...'}
              disabled={chatMutation.isPending || isRecording || isTranscribing}
              className="flex-1"
            />
            <Button
              onClick={handleMicClick}
              disabled={chatMutation.isPending || isTranscribing}
              size="icon"
              variant="outline"
              className={cn(
                'shrink-0',
                isRecording && 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 hover:text-destructive'
              )}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending || isRecording || isTranscribing}
              size="icon"
              className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {isRecording ? 'Click the stop button when done speaking' : 'Blue may make mistakes. Verify important information.'}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function formatAssistantMessage(content: string): React.ReactNode {
  const lines = content.split('\n')

  return lines.map((line, index) => {
    // Handle headings
    if (line.trim().startsWith('### ')) {
      return (
        <h3 key={index} className="mb-1 text-base font-semibold text-foreground">
          {line.trim().substring(4)}
        </h3>
      )
    }

    // Handle bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      return (
        <div key={index} className="ml-2 flex gap-2">
          <span className="text-muted-foreground">&#8226;</span>
          <span>{renderInlineText(line.trim().substring(2))}</span>
        </div>
      )
    }

    // Handle numbered lists
    const numberedMatch = line.trim().match(/^(\d+)\.\s(.+)/)
    if (numberedMatch) {
      return (
        <div key={index} className="ml-2 flex gap-2">
          <span className="font-medium text-muted-foreground">{numberedMatch[1]}.</span>
          <span>{renderInlineText(numberedMatch[2])}</span>
        </div>
      )
    }

    // Regular line
    return line ? <div key={index}>{renderInlineText(line)}</div> : <div key={index} className="h-2" />
  })
}

function renderInlineText(text: string): React.ReactNode {
  const boldPattern = /\*\*([^*]+)\*\*/g
  const parts = text.split(boldPattern)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

// Toggle button component for the header
export function AssistantToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground bg-white border border-border rounded-lg hover:bg-secondary transition-colors"
    >
      <Bot className="h-4 w-4 text-primary" />
      <span>Blue</span>
    </button>
  )
}
