'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Key } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { formatDate } from '@/lib/utils'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

type ApiTokenFormData = {
  name: string
}

export default function ApiSettingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)

  const { data: tokens, refetch } = trpc.apiToken.list.useQuery()
  const createToken = trpc.apiToken.create.useMutation({
    onSuccess: (data) => {
      setGeneratedToken(data.token)
      setIsDialogOpen(false)
      refetch()
      reset()
    },
  })
  const revokeToken = trpc.apiToken.revoke.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApiTokenFormData>({
    defaultValues: { name: '' },
  })

  const onSubmit = (data: ApiTokenFormData) => {
    createToken.mutate({ name: data.name })
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="API Settings"
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New API Key
          </Button>
        }
      />

      {generatedToken ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Key className="h-4 w-4 text-foreground/80" />
              Your new API key
            </div>
            <Input value={generatedToken} readOnly />
            <p className="text-xs text-muted-foreground">
              Store this securely. You will not be able to see it again after you leave this page.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-2 py-4">
          <p className="text-sm text-foreground">
            Share the public API documentation with anyone integrating with Curacel.
          </p>
          <a
            href="/api-docs"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            View API Documentation
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-6 font-semibold text-foreground">Name</th>
                  <th className="text-left p-6 font-semibold text-foreground">Prefix</th>
                  <th className="text-left p-6 font-semibold text-foreground">Created</th>
                  <th className="text-left p-6 font-semibold text-foreground">Last Used</th>
                  <th className="text-left p-6 font-semibold text-foreground">Status</th>
                  <th className="text-right p-6 font-semibold text-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {tokens?.map((token) => (
                  <tr key={token.id} className="border-b border-border hover:bg-muted">
                    <td className="p-6 text-foreground">{token.name}</td>
                    <td className="p-6 text-foreground/80">{token.tokenPrefix}••••</td>
                    <td className="p-6 text-foreground/80">{formatDate(token.createdAt)}</td>
                    <td className="p-6 text-foreground/80">
                      {token.lastUsedAt ? formatDate(token.lastUsedAt) : 'Never'}
                    </td>
                    <td className="p-6 text-foreground/80">
                      {token.revokedAt ? 'Revoked' : 'Active'}
                    </td>
                    <td className="p-6 text-right">
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => revokeToken.mutate({ id: token.id })}
                        disabled={Boolean(token.revokedAt) || revokeToken.isPending}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!tokens || tokens.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      No API keys yet. Create one to start using the API.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Give your API key a name so you can identify it later.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Key name</Label>
              <Input
                id="name"
                {...register('name', { required: 'Key name is required' })}
                placeholder="e.g. Internal automation"
              />
              {errors.name ? (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createToken.isPending}>
                {createToken.isPending ? 'Creating...' : 'Create key'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
