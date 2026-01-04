'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function PendingToolsPage() {
  const { data: pendingTools, isLoading, refetch } = trpc.aiCustomTools.listPending.useQuery()
  const approveMutation = trpc.aiCustomTools.approve.useMutation({
    onSuccess: () => {
      refetch()
    },
  })
  const rejectMutation = trpc.aiCustomTools.reject.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const handleApprove = async (id: string) => {
    if (confirm('Are you sure you want to approve this tool? It will become active immediately.')) {
      await approveMutation.mutateAsync({ id })
    }
  }

  const handleReject = async (id: string) => {
    await rejectMutation.mutateAsync({ id, reason: rejectionReason })
    setRejectingId(null)
    setRejectionReason('')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SettingsPageHeader
          title="Pending AI Tools"
          description="Review and approve auto-created tools from AuntyPelz."
        />
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Pending AI Tools"
        description="Review and approve auto-created tools from AuntyPelz."
      />

      {!pendingTools || pendingTools.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No pending tools</p>
            <p className="text-sm mt-1">Auto-created tools will appear here for approval.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingTools.map((tool) => (
            <Card key={tool.id} className="border-l-4 border-l-yellow-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {tool.displayName}
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending Approval
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{tool.name}</code>
                      <span className="mx-2">•</span>
                      <Badge variant="secondary" className="text-xs">
                        {tool.category}
                      </Badge>
                      <span className="mx-2">•</span>
                      <span className="text-xs">
                        Created {formatDistanceToNow(new Date(tool.createdAt), { addSuffix: true })}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                </div>

                {tool.sourceContext && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900">User Request</p>
                        <p className="text-xs text-blue-700 mt-1">{tool.sourceContext}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-3">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Execution Type</h4>
                    <Badge variant="outline">{tool.executionType}</Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1">Configuration</h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {JSON.stringify(tool.executionConfig, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1">Parameters</h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {JSON.stringify(tool.parameters, null, 2)}
                    </pre>
                  </div>

                  {tool.requiresConfirmation && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-muted-foreground">Requires user confirmation before execution</span>
                    </div>
                  )}
                </div>

                {rejectingId === tool.id ? (
                  <div className="space-y-3 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div>
                      <label htmlFor="reason" className="text-sm font-semibold text-red-900">
                        Rejection Reason (optional)
                      </label>
                      <Textarea
                        id="reason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why this tool is being rejected..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(tool.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Confirm Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejectingId(null)
                          setRejectionReason('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(tool.id)}
                      disabled={approveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve & Activate
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectingId(tool.id)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
