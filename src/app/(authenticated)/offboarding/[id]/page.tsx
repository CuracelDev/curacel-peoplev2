'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { PageActions } from '@/components/layout/page-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Clock,
    UserMinus,
    AlertCircle,
    Play,
    SkipForward,
    Check,
    RefreshCw,
    MoreVertical,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function OffboardingDetailPage() {
    const params = useParams()
    const router = useRouter()
    const workflowId = params.id as string

    const { data: workflow, isLoading, refetch } = trpc.offboarding.getById.useQuery(workflowId)

    const runTask = trpc.offboarding.runTask.useMutation({
        onSuccess: () => refetch(),
    })

    const completeManualTask = trpc.offboarding.completeManualTask.useMutation({
        onSuccess: () => {
            setCompleteDialogOpen(false)
            setSelectedTaskId(null)
            setTaskNotes('')
            refetch()
        },
    })

    const skipTask = trpc.offboarding.skipTask.useMutation({
        onSuccess: () => {
            setSkipDialogOpen(false)
            setSelectedTaskId(null)
            setSkipReason('')
            refetch()
        },
    })

    const cancelWorkflow = trpc.offboarding.cancel.useMutation({
        onSuccess: () => {
            router.push('/offboarding')
        },
    })

    const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
    const [skipDialogOpen, setSkipDialogOpen] = useState(false)
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [taskNotes, setTaskNotes] = useState('')
    const [skipReason, setSkipReason] = useState('')

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!workflow) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Offboarding workflow not found</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/offboarding')}>
                    Go back
                </Button>
            </div>
        )
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-success/10 text-success hover:bg-success/20'
            case 'SUCCESS': return 'bg-success/10 text-success hover:bg-success/20'
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            case 'FAILED': return 'bg-destructive/10 text-destructive hover:bg-destructive/20'
            case 'CANCELLED': return 'bg-muted text-muted-foreground hover:bg-muted/80'
            case 'SKIPPED': return 'bg-muted text-muted-foreground hover:bg-muted/80'
            default: return 'bg-muted text-foreground'
        }
    }

    const getProgress = () => {
        if (!workflow.tasks.length) return 0
        const completed = workflow.tasks.filter(t => t.status === 'SUCCESS' || t.status === 'SKIPPED').length
        return Math.round((completed / workflow.tasks.length) * 100)
    }

    const progress = getProgress()

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/offboarding')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Offboarding: {workflow.employee.fullName}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <span className="text-sm">{workflow.employee.jobTitle}</span>
                        <span>•</span>
                        <span className="text-sm">{workflow.employee.department}</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {workflow.status !== 'COMPLETED' && workflow.status !== 'CANCELLED' && (
                        <Button
                            variant="destructive"
                            variant="outline"
                            onClick={() => setCancelDialogOpen(true)}
                        >
                            Cancel Offboarding
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    {/* Progress Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-medium">Progress</CardTitle>
                                <span className="text-sm font-medium">{progress}%</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Progress value={progress} className="h-2 mb-2" />
                            <p className="text-xs text-muted-foreground">
                                {workflow.tasks.filter(t => t.status === 'SUCCESS' || t.status === 'SKIPPED').length} of {workflow.tasks.length} tasks completed
                            </p>
                        </CardContent>
                    </Card>

                    {/* Tasks List */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Tasks</h2>
                        {workflow.tasks.map((task) => (
                            <Card key={task.id} className={task.status === 'SUCCESS' || task.status === 'SKIPPED' ? 'opacity-70' : ''}>
                                <CardContent className="p-4 flex items-start gap-4">
                                    <div className={`mt-1 p-1.5 rounded-full ${task.status === 'SUCCESS' ? 'bg-success/10 text-success' :
                                            task.status === 'SKIPPED' ? 'bg-muted text-muted-foreground' :
                                                task.status === 'FAILED' ? 'bg-destructive/10 text-destructive' :
                                                    'bg-primary/10 text-primary'
                                        }`}>
                                        {task.status === 'SUCCESS' ? <CheckCircle2 className="h-4 w-4" /> :
                                            task.status === 'SKIPPED' ? <SkipForward className="h-4 w-4" /> :
                                                task.status === 'FAILED' ? <AlertCircle className="h-4 w-4" /> :
                                                    <Clock className="h-4 w-4" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`font-medium ${task.status === 'SUCCESS' || task.status === 'SKIPPED' ? 'line-through text-muted-foreground' : ''}`}>
                                                {task.name}
                                            </h3>
                                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${getStatusColor(task.status)} font-medium border-0`}>
                                                {task.status}
                                            </Badge>
                                            {task.type === 'AUTOMATED' && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">Automated</Badge>
                                            )}
                                        </div>

                                        {task.statusMessage && (
                                            <p className="text-sm text-muted-foreground mt-1 bg-muted/50 p-2 rounded-md text-xs font-mono">
                                                {task.statusMessage}
                                            </p>
                                        )}

                                        {task.completedAt && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Completed {formatDate(task.completedAt)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {task.status !== 'SUCCESS' && task.status !== 'SKIPPED' && (
                                            <>
                                                {task.type === 'MANUAL' ? (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedTaskId(task.id)
                                                                setCompleteDialogOpen(true)
                                                            }}
                                                        >
                                                            <Check className="h-3.5 w-3.5 mr-1.5" />
                                                            Complete
                                                        </Button>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => {
                                                                    setSelectedTaskId(task.id)
                                                                    setSkipDialogOpen(true)
                                                                }}>
                                                                    <SkipForward className="h-3.5 w-3.5 mr-2" />
                                                                    Skip task
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                ) : (
                                                    // Automated task actions
                                                    <div className="flex gap-2">
                                                        {(task.status === 'FAILED' || task.status === 'PENDING') && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => runTask.mutate({ taskId: task.id })}
                                                                disabled={runTask.isPending}
                                                            >
                                                                {runTask.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                                                                {task.status === 'FAILED' ? 'Retry' : 'Run'}
                                                            </Button>
                                                        )}

                                                        {(task.status === 'FAILED' || task.status === 'PENDING') && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => {
                                                                        setSelectedTaskId(task.id)
                                                                        setSkipDialogOpen(true)
                                                                    }}>
                                                                        <SkipForward className="h-3.5 w-3.5 mr-2" />
                                                                        Skip task
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => {
                                                                        setSelectedTaskId(task.id)
                                                                        setCompleteDialogOpen(true)
                                                                    }}>
                                                                        <Check className="h-3.5 w-3.5 mr-2" />
                                                                        Mark as completed manually
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                                <Badge className={getStatusColor(workflow.status)}>
                                    {workflow.status.replace('_', ' ')}
                                </Badge>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Scheduled For</p>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                        {workflow.scheduledFor ? formatDate(workflow.scheduledFor) : 'Immediate'}
                                    </span>
                                </div>
                            </div>

                            {workflow.startedAt && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Started At</p>
                                    <div className="flex items-center gap-2">
                                        <Play className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{formatDate(workflow.startedAt)}</span>
                                    </div>
                                </div>
                            )}

                            {workflow.completedAt && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Completed At</p>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{formatDate(workflow.completedAt)}</span>
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {workflow.reason && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Reason</p>
                                    <p className="text-sm">{workflow.reason}</p>
                                </div>
                            )}

                            {workflow.notes && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                                    <p className="text-sm text-muted-foreground">{workflow.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Delete Google Account</span>
                                <Badge variant={workflow.googleDeleteAccount ? "destructive" : "outline"}>
                                    {workflow.googleDeleteAccount ? "Yes" : "No"}
                                </Badge>
                            </div>

                            {workflow.googleTransferToEmail && (
                                <div>
                                    <span className="text-muted-foreground block mb-1">Transfer Data To</span>
                                    <span className="font-medium">{workflow.googleTransferToEmail}</span>
                                </div>
                            )}

                            {workflow.googleAliasToEmail && (
                                <div>
                                    <span className="text-muted-foreground block mb-1">Email Alias For</span>
                                    <span className="font-medium">{workflow.googleAliasToEmail}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Complete Task Dialog */}
            <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Task</DialogTitle>
                        <DialogDescription>
                            Mark this task as completed. You can add optional notes.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label htmlFor="notes" className="text-sm font-medium">
                                Notes (Optional)
                            </label>
                            <Textarea
                                id="notes"
                                placeholder="Add any relevant notes..."
                                value={taskNotes}
                                onChange={(e) => setTaskNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => selectedTaskId && completeManualTask.mutate({ taskId: selectedTaskId, notes: taskNotes })}
                            disabled={completeManualTask.isPending}
                        >
                            {completeManualTask.isPending ? 'Completing...' : 'Complete Task'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Skip Task Dialog */}
            <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Skip Task</DialogTitle>
                        <DialogDescription>
                            Skip this task? Please provide a reason.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label htmlFor="reason" className="text-sm font-medium">
                                Reason for skipping <span className="text-destructive">*</span>
                            </label>
                            <Textarea
                                id="reason"
                                placeholder="Why is this task being skipped?"
                                value={skipReason}
                                onChange={(e) => setSkipReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSkipDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedTaskId && skipTask.mutate({ taskId: selectedTaskId, reason: skipReason })}
                            disabled={!skipReason.trim() || skipTask.isPending}
                        >
                            {skipTask.isPending ? 'Skipping...' : 'Skip Task'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Workflow Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Offboarding</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this offboarding workflow? This will revert the employee status to ACTIVE.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                            Back
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => cancelWorkflow.mutate(workflowId)}
                            disabled={cancelWorkflow.isPending}
                        >
                            {cancelWorkflow.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
