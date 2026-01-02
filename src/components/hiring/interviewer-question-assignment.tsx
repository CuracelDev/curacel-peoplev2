'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  GripVertical,
  MessageSquare,
  Star,
  User,
} from 'lucide-react'

interface Question {
  id?: string
  text: string
  category: string
  followUp?: string
  isCustom: boolean
  saveToBank: boolean
  isRequired: boolean
}

interface Interviewer {
  id: string
  name: string
  email: string
}

interface InterviewerQuestionAssignmentProps {
  questions: Question[]
  interviewers: Interviewer[]
  assignments: Record<string, string> // questionIndex -> interviewerId
  onAssignmentsChange: (assignments: Record<string, string>) => void
}

const categoryConfig: Record<string, { name: string; color: string }> = {
  situational: { name: 'Situational', color: 'bg-indigo-100 text-indigo-700' },
  behavioral: { name: 'Behavioral', color: 'bg-success/10 text-success' },
  motivational: { name: 'Motivational', color: 'bg-amber-100 text-amber-700' },
  technical: { name: 'Technical', color: 'bg-pink-100 text-pink-700' },
  culture: { name: 'Culture', color: 'bg-cyan-100 text-cyan-700' },
}

// Unique ID for each question based on index
const getQuestionId = (index: number) => `question-${index}`

export function InterviewerQuestionAssignment({
  questions,
  interviewers,
  assignments,
  onAssignmentsChange,
}: InterviewerQuestionAssignmentProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Group questions by container
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, number[]> = {
      unassigned: [],
    }

    // Initialize interviewer groups
    interviewers.forEach((i) => {
      groups[i.id] = []
    })

    // Assign questions to groups
    questions.forEach((_, index) => {
      const questionId = getQuestionId(index)
      const assignedTo = assignments[questionId]
      if (assignedTo && groups[assignedTo]) {
        groups[assignedTo].push(index)
      } else {
        groups.unassigned.push(index)
      }
    })

    return groups
  }, [questions, interviewers, assignments])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over to update visual feedback
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find which container we're dropping into
    let targetContainer: string | null = null

    // Check if dropping directly on a container
    if (overId === 'unassigned' || interviewers.some((i) => i.id === overId)) {
      targetContainer = overId === 'unassigned' ? '' : overId
    } else {
      // Dropping on another question - find its container
      for (const [containerId, questionIndices] of Object.entries(groupedQuestions)) {
        if (questionIndices.some((idx) => getQuestionId(idx) === overId)) {
          targetContainer = containerId === 'unassigned' ? '' : containerId
          break
        }
      }
    }

    if (targetContainer === null) return

    // Update assignments
    const newAssignments = { ...assignments }
    if (targetContainer === '') {
      delete newAssignments[activeId]
    } else {
      newAssignments[activeId] = targetContainer
    }
    onAssignmentsChange(newAssignments)
  }

  // Get the active question for overlay
  const activeQuestionIndex = activeId
    ? parseInt(activeId.replace('question-', ''))
    : null
  const activeQuestion =
    activeQuestionIndex !== null ? questions[activeQuestionIndex] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Unassigned Questions */}
        <DroppableContainer
          id="unassigned"
          title="Unassigned"
          icon={<MessageSquare className="h-4 w-4" />}
          count={groupedQuestions.unassigned.length}
          isUnassigned
        >
          <SortableContext
            items={groupedQuestions.unassigned.map(getQuestionId)}
            strategy={verticalListSortingStrategy}
          >
            {groupedQuestions.unassigned.map((questionIndex) => (
              <SortableQuestion
                key={getQuestionId(questionIndex)}
                id={getQuestionId(questionIndex)}
                question={questions[questionIndex]}
              />
            ))}
          </SortableContext>
          {groupedQuestions.unassigned.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              All questions assigned
            </div>
          )}
        </DroppableContainer>

        {/* Interviewer Columns */}
        {interviewers.map((interviewer) => (
          <DroppableContainer
            key={interviewer.id}
            id={interviewer.id}
            title={interviewer.name}
            icon={<User className="h-4 w-4" />}
            count={groupedQuestions[interviewer.id]?.length || 0}
          >
            <SortableContext
              items={(groupedQuestions[interviewer.id] || []).map(getQuestionId)}
              strategy={verticalListSortingStrategy}
            >
              {(groupedQuestions[interviewer.id] || []).map((questionIndex) => (
                <SortableQuestion
                  key={getQuestionId(questionIndex)}
                  id={getQuestionId(questionIndex)}
                  question={questions[questionIndex]}
                />
              ))}
            </SortableContext>
            {(groupedQuestions[interviewer.id]?.length || 0) === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                Drop questions here
              </div>
            )}
          </DroppableContainer>
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeQuestion ? (
          <QuestionCard question={activeQuestion} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

interface DroppableContainerProps {
  id: string
  title: string
  icon: React.ReactNode
  count: number
  isUnassigned?: boolean
  children: React.ReactNode
}

function DroppableContainer({
  id,
  title,
  icon,
  count,
  isUnassigned,
  children,
}: DroppableContainerProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'transition-colors',
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div
            className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center',
              isUnassigned ? 'bg-muted' : 'bg-primary/10 text-primary'
            )}
          >
            {icon}
          </div>
          <span className={isUnassigned ? 'text-muted-foreground' : ''}>
            {title}
          </span>
          <Badge variant="secondary" className="ml-auto">
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-2">{children}</div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

interface SortableQuestionProps {
  id: string
  question: Question
}

function SortableQuestion({ id, question }: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-50')}
      {...attributes}
    >
      <QuestionCard question={question} listeners={listeners} />
    </div>
  )
}

interface QuestionCardProps {
  question: Question
  isDragging?: boolean
  listeners?: ReturnType<typeof useSortable>['listeners']
}

function QuestionCard({ question, isDragging, listeners }: QuestionCardProps) {
  const category = categoryConfig[question.category] || {
    name: question.category,
    color: 'bg-gray-100 text-gray-700',
  }

  return (
    <div
      className={cn(
        'p-3 border rounded-lg bg-card transition-shadow',
        isDragging && 'shadow-lg ring-2 ring-primary'
      )}
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-0.5"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
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
      </div>
    </div>
  )
}
