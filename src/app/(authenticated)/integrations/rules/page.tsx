'use client'

import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function IntegrationRulesPage() {
  const { data: rules, isLoading, isError, refetch } = trpc.integration.listRules.useQuery(undefined, {
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isError || !rules) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Failed to load provisioning rules.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
        <Link href="/integrations">
          <Button variant="outline">Back to Applications</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Provisioning Rules</h1>
          <p className="text-muted-foreground mt-1">
            Rules that apply when provisioning applications (e.g., Google Workspace, Slack)
          </p>
        </div>
        <Link href="/integrations">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Rules</CardTitle>
          <CardDescription>
            Active rules are evaluated per employee during provisioning; conditions are matched against
            employee attributes (department, jobTitle, location, employmentType, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground">No provisioning rules configured.</p>
          )}

          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="border rounded-lg p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">{rule.description || 'No description'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      App: {rule.app?.name || rule.app?.type || 'Unknown'} · Priority: {rule.priority}
                    </p>
                  </div>
                  <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs font-semibold text-foreground/80 mb-1">Condition</p>
                    <pre className="whitespace-pre-wrap text-xs text-foreground">
{JSON.stringify(rule.condition, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs font-semibold text-foreground/80 mb-1">Provision Data</p>
                    <pre className="whitespace-pre-wrap text-xs text-foreground">
{JSON.stringify(rule.provisionData, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



