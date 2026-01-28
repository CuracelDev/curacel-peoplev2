'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

export default function LegalEntitiesPage() {
  const utils = trpc.useUtils()
  const { data, isLoading, error: listError } = trpc.legalEntity.list.useQuery()
  const createEntity = trpc.legalEntity.create.useMutation({
    onSuccess: () => utils.legalEntity.list.invalidate(),
  })
  const removeEntity = trpc.legalEntity.remove.useMutation({
    onSuccess: () => utils.legalEntity.list.invalidate(),
  })

  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a legal entity name.')
      return
    }
    try {
      await createEntity.mutateAsync({ name: trimmed })
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add legal entity.')
    }
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Legal entities"
        description="Add or remove entities used on offers and contracts."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add legal entity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Curacel Technologies Ltd"
          />
          <Button type="button" onClick={handleAdd} disabled={createEntity.isPending}>
            {createEntity.isPending ? 'Adding...' : 'Add'}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active entities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : listError ? (
            <p className="text-sm text-red-600">{listError.message}</p>
          ) : data && data.length > 0 ? (
            <ul className="space-y-2">
              {data.map((entity) => (
                <li key={entity.id} className="flex items-center justify-between rounded-md border border-border px-4 py-2 text-sm text-foreground">
                  <span>{entity.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntity.mutate({ id: entity.id })}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No legal entities yet.</p>
          )}
          <Button variant="outline" asChild>
            <Link href="/contracts/new">Use in contracts</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
