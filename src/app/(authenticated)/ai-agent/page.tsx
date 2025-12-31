'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Plus, Search, Loader2, AlertCircle, Sparkles, ArrowUp, Mic, Square, Menu } from 'lucide-react'

type ChatMessage = {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: Date
  isError?: boolean
}

const SUGGESTED_PROMPTS = [
  'Find all contracts in DRAFT status',
  'How many employees did we hire in 2024?',
  'Show me the onboarding status for the latest hire',
  'Create a contract draft for a new Software Engineer',
]

const deriveTitle = (content: string) => {
  const trimmed = content.trim()
  if (!trimmed) return 'New chat'
  return trimmed.length > 44 ? `${trimmed.slice(0, 41)}...` : trimmed
}

const truncateWords = (content: string, wordCount: number) => {
  const trimmed = content.trim()
  if (!trimmed) return ''
  const words = trimmed.split(/\s+/).slice(0, wordCount)
  return words.join(' ')
}

const stripMarkdown = (content: string) =>
  content
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[`*_]/g, '')
    .replace(/^[#>\-\s]+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()

const formatTime = (value: number | Date) => {
  const timestamp = value instanceof Date ? value : new Date(value)
  return timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function AIAgentPage() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const transcribeMutation = trpc.assistant.transcribe.useMutation({
    onSuccess: (data) => {
      setInput((prev) => (prev ? `${prev} ${data.text}` : data.text))
      textareaRef.current?.focus()
    },
    onError: (error) => {
      console.error('Transcription failed:', error.message)
    },
    onSettled: () => {
      setIsTranscribing(false)
    },
  })

  const chatMutation = trpc.assistant.chat.useMutation()
  const createChatMutation = trpc.assistant.createChat.useMutation()
  const addMessageMutation = trpc.assistant.addMessage.useMutation()
  const utils = trpc.useUtils()
  const { data: chatList = [] } = trpc.assistant.listChats.useQuery()
  const { data: activeChatData } = trpc.assistant.getChat.useQuery(
    { id: activeChatId ?? '' },
    { enabled: !!activeChatId }
  )
  const activeChatSummary = useMemo(
    () => chatList.find((chat: { id: string }) => chat.id === activeChatId) || null,
    [activeChatId, chatList]
  )
  const isChatLoading = !!activeChatId && !activeChatData
  const isBusy = chatMutation.isPending || addMessageMutation.isPending || createChatMutation.isPending || isChatLoading

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChatData?.messages.length])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [activeChatId])

  const resizeTextarea = useCallback(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    const nextHeight = Math.min(textareaRef.current.scrollHeight, 220)
    textareaRef.current.style.height = `${nextHeight}px`
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [input, resizeTextarea])

  useEffect(() => {
    if (!activeChatId && chatList.length > 0) {
      setActiveChatId(chatList[0].id)
    }
  }, [activeChatId, chatList])

  const handleNewChat = async () => {
    const chat = await createChatMutation.mutateAsync({ title: 'New chat' })
    setActiveChatId(chat.id)
    setInput('')
    utils.assistant.listChats.invalidate()
  }

  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isBusy) return

    let targetChatId = activeChatId
    let titleUpdate: string | undefined
    let messageHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []

    if (!targetChatId) {
      const created = await createChatMutation.mutateAsync({ title: deriveTitle(trimmedInput) })
      targetChatId = created.id
      setActiveChatId(created.id)
      titleUpdate = created.title
    } else if ((activeChatData?.title ?? activeChatSummary?.title) === 'New chat') {
      titleUpdate = deriveTitle(trimmedInput)
    }

    const existingMessages = activeChatData?.messages ?? []
    messageHistory = [
      ...existingMessages.map((message: { role: string; content: string }) => ({
        role: message.role === 'USER' ? 'user' : 'assistant',
        content: message.content,
      })),
      { role: 'user', content: trimmedInput },
    ]

    const optimisticMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'USER',
      content: trimmedInput,
      createdAt: new Date(),
    }

    utils.assistant.getChat.setData({ id: targetChatId! }, (prev) => {
      if (!prev) {
        return {
          id: targetChatId!,
          title: titleUpdate || 'New chat',
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [optimisticMessage],
        }
      }
      return {
        ...prev,
        title: titleUpdate || prev.title,
        updatedAt: new Date(),
        messages: [...prev.messages, optimisticMessage],
      }
    })

    setInput('')

    await addMessageMutation.mutateAsync({
      chatId: targetChatId!,
      role: 'USER',
      content: trimmedInput,
      title: titleUpdate,
    })

    utils.assistant.listChats.invalidate()

    try {
      const data = await chatMutation.mutateAsync({ messages: messageHistory })
      const assistantMessage: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: 'ASSISTANT',
        content: data.content,
        createdAt: new Date(),
      }
      utils.assistant.getChat.setData({ id: targetChatId! }, (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          updatedAt: new Date(),
          messages: [...prev.messages, assistantMessage],
        }
      })

      await addMessageMutation.mutateAsync({
        chatId: targetChatId!,
        role: 'ASSISTANT',
        content: data.content,
      })
      await utils.assistant.listChats.invalidate()
      await utils.assistant.getChat.invalidate({ id: targetChatId! })
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `temp-error-${Date.now()}`,
        role: 'ASSISTANT',
        content: error instanceof Error ? error.message : 'An error occurred. Please try again.',
        createdAt: new Date(),
        isError: true,
      }
      utils.assistant.getChat.setData({ id: targetChatId! }, (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          updatedAt: new Date(),
          messages: [...prev.messages, errorMessage],
        }
      })

      await addMessageMutation.mutateAsync({
        chatId: targetChatId!,
        role: 'ASSISTANT',
        content: errorMessage.content,
        isError: true,
      })
      await utils.assistant.listChats.invalidate()
      await utils.assistant.getChat.invalidate({ id: targetChatId! })
    }
  }, [
    activeChatId,
    activeChatData?.messages,
    activeChatData?.title,
    addMessageMutation,
    chatMutation,
    createChatMutation,
    input,
    isBusy,
    activeChatSummary?.title,
    utils.assistant.getChat,
    utils.assistant.listChats,
  ])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
    textareaRef.current?.focus()
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

  const filteredChats = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return chatList
    return chatList.filter((chat: { id: string; title: string; lastMessage?: { content?: string } }) => {
      if (chat.title.toLowerCase().includes(term)) return true
      const lastContent = chat.lastMessage?.content?.toLowerCase() || ''
      return lastContent.includes(term)
    })
  }, [chatList, search])

  const chatHistoryContent = (
    <>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={handleNewChat} disabled={createChatMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            New chat
          </Button>
        </div>
        <div className="mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search chats"
              className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
            />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-3">
        {filteredChats.length === 0 ? (
          <div className="px-3 py-6 text-sm text-muted-foreground">No chats yet.</div>
        ) : (
          <div className="space-y-1">
            {filteredChats.map((chat: { id: string; title: string; updatedAt?: Date; lastMessage?: { content?: string; createdAt?: Date } }) => {
              const title = truncateWords(chat.title, 4)
              return (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={cn(
                    'w-full rounded-xl px-3 py-3 text-left transition-colors',
                    chat.id === activeChatId
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-secondary text-foreground'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'truncate text-sm',
                        chat.id === activeChatId ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {title}
                    </p>
                    <span
                      className={cn(
                        'text-[9px]',
                        chat.id === activeChatId ? 'text-primary/70' : 'text-muted-foreground'
                      )}
                    >
                      {chat.updatedAt && formatTime(chat.updatedAt)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Chat History</SheetTitle>
              </SheetHeader>
              <div className="flex h-full flex-col">
                {chatHistoryContent}
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Blue AI</h1>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex min-h-0 w-72 shrink-0 flex-col bg-card">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <Button size="sm" variant="outline" onClick={handleNewChat} disabled={createChatMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                New chat
              </Button>
            </div>
            <div className="mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search chats"
                  className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain p-3">
            {filteredChats.length === 0 ? (
              <div className="px-3 py-6 text-sm text-muted-foreground">No chats yet.</div>
            ) : (
              <div className="space-y-1">
                {filteredChats.map((chat: { id: string; title: string; updatedAt?: Date; lastMessage?: { content?: string; createdAt?: Date } }) => {
                  const lastMessage = chat.lastMessage
                  const title = truncateWords(chat.title, 4)
                  return (
                    <button
                      key={chat.id}
                      onClick={() => setActiveChatId(chat.id)}
                      className={cn(
                        'w-full rounded-xl px-3 py-3 text-left transition-colors',
                        chat.id === activeChatId
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-secondary text-foreground'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            'truncate text-sm',
                            chat.id === activeChatId ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {title}
                        </p>
                        <span
                          className={cn(
                            'text-[9px]',
                            chat.id === activeChatId ? 'text-primary/70' : 'text-muted-foreground'
                          )}
                        >
                          {chat.updatedAt && formatTime(chat.updatedAt)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
          <div className="flex-1 overflow-y-auto overscroll-contain bg-secondary/40 px-3 md:px-6 py-4 md:py-5">
            {!activeChatData || activeChatData.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">How can I help?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  I can answer questions and perform basic actions around contracts, onboarding, employee lookup, and
                  analytics.
                </p>
                <div className="mt-6 w-full max-w-md space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Try asking</p>
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="w-full rounded-lg border border-border bg-card px-4 py-2 text-left text-sm text-foreground hover:bg-secondary"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeChatData.messages.map((message: ChatMessage) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.role === 'USER' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                        message.role === 'USER'
                          ? 'bg-primary text-primary-foreground'
                          : message.isError
                          ? 'border border-red-200 bg-red-50 text-red-800'
                          : 'bg-card text-foreground shadow-sm'
                      )}
                    >
                      {message.isError && (
                        <div className="mb-1 flex items-center gap-1 text-xs font-medium text-red-600">
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
                    <div className="rounded-2xl bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-border bg-card px-3 md:px-6 py-3 md:py-4">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? 'Recording...' : isTranscribing ? 'Transcribing...' : 'Ask Blue AI...'}
                disabled={isBusy || isRecording || isTranscribing}
                rows={1}
                className="min-h-[52px] flex-1 resize-none"
              />
              <Button
                onClick={handleMicClick}
                disabled={isBusy || isTranscribing}
                size="icon"
                variant="outline"
                className={cn(
                  'h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-full',
                  isRecording && 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700'
                )}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                {isTranscribing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isRecording ? (
                  <Square className="h-5 w-5 fill-current" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isBusy || isRecording || isTranscribing}
                size="icon"
                className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function formatAssistantMessage(content: string): React.ReactNode {
  const lines = content.split('\n')

  return lines.map((line, index) => {
    if (line.trim().startsWith('### ')) {
      return (
        <h3 key={index} className="mb-1 text-base font-semibold text-foreground">
          {line.trim().substring(4)}
        </h3>
      )
    }

    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      return (
        <div key={index} className="ml-2 flex gap-2">
          <span className="text-muted-foreground">&#8226;</span>
          <span>{renderInlineText(line.trim().substring(2))}</span>
        </div>
      )
    }

    const numberedMatch = line.trim().match(/^(\d+)\.\s(.+)/)
    if (numberedMatch) {
      return (
        <div key={index} className="ml-2 flex gap-2">
          <span className="font-medium text-muted-foreground">{numberedMatch[1]}.</span>
          <span>{renderInlineText(numberedMatch[2])}</span>
        </div>
      )
    }

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
