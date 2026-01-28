'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Plus, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface StandupNinjaConfigSectionProps {
  appId: string
  secrets: Record<string, unknown>
  canEdit: boolean
  busy: boolean
  onSave: (config: {
    apiUrl: string
    apiKey?: string
    syncOnHire: boolean
    syncOnTermination: boolean
  }) => void
  onSaveSuccess: () => void
}

export function StandupNinjaConfigSection({
  appId,
  secrets,
  canEdit,
  busy,
  onSave,
  onSaveSuccess,
}: StandupNinjaConfigSectionProps) {
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [syncOnHire, setSyncOnHire] = useState(true)
  const [syncOnTermination, setSyncOnTermination] = useState(true)
  const [showAddMappingDialog, setShowAddMappingDialog] = useState(false)
  const [newDepartment, setNewDepartment] = useState('')
  const [newTeamName, setNewTeamName] = useState('')

  const { data: settings, refetch: refetchSettings } = trpc.standupSync.getSettings.useQuery()
  const { data: mappings, refetch: refetchMappings } = trpc.standupSync.listMappings.useQuery()
  const testConnection = trpc.standupSync.testConnection.useMutation()
  const createMapping = trpc.standupSync.createMapping.useMutation()
  const deleteMapping = trpc.standupSync.deleteMapping.useMutation()
  const syncAllEmployees = trpc.standupSync.syncAllEmployees.useMutation()

  // Load initial values from settings
  useEffect(() => {
    if (settings) {
      setApiUrl(settings.apiUrl || '')
      setSyncOnHire(settings.syncOnHire)
      setSyncOnTermination(settings.syncOnTermination)
    }
  }, [settings])

  const handleTestConnection = async () => {
    if (!apiUrl || !apiKey) {
      toast.error('API URL and API key are required to test connection')
      return
    }

    try {
      await testConnection.mutateAsync({ apiUrl, apiKey })
      toast.success('Successfully connected to StandupNinja!')
      await refetchSettings()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed'
      toast.error(message)
    }
  }

  const handleSave = () => {
    if (!apiUrl) {
      toast.error('API URL is required')
      return
    }

    onSave({
      apiUrl,
      apiKey: apiKey || undefined,
      syncOnHire,
      syncOnTermination,
    })

    // Clear API key after save
    setApiKey('')
    onSaveSuccess()
  }

  const handleAddMapping = async () => {
    if (!newDepartment || !newTeamName) {
      toast.error('Department and team name are required')
      return
    }

    try {
      await createMapping.mutateAsync({
        department: newDepartment,
        standupTeamName: newTeamName,
      })
      toast.success(`Mapping added: ${newDepartment} → ${newTeamName}`)
      await refetchMappings()
      setShowAddMappingDialog(false)
      setNewDepartment('')
      setNewTeamName('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add mapping'
      toast.error(message)
    }
  }

  const handleDeleteMapping = async (id: string) => {
    try {
      await deleteMapping.mutateAsync({ id })
      toast.success('Mapping deleted successfully')
      await refetchMappings()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete mapping'
      toast.error(message)
    }
  }

  const handleSyncAll = async () => {
    if (!window.confirm('This will sync all active employees to StandupNinja. Continue?')) {
      return
    }

    try {
      const result = await syncAllEmployees.mutateAsync()
      toast.success(
        `Sync completed! Success: ${result.success}, Failed: ${result.failed}, Skipped: ${result.skipped}`
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync employees'
      toast.error(message)
    }
  }

  const testStatusIcon = !settings?.lastTestResult ? (
    <AlertCircle className="h-4 w-4 text-muted-foreground" />
  ) : settings.lastTestResult === 'success' ? (
    <CheckCircle2 className="h-4 w-4 text-green-600" />
  ) : (
    <XCircle className="h-4 w-4 text-red-600" />
  )

  return (
    <div className="space-y-6">
      {/* Connection Settings */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-url">API URL *</Label>
          <Input
            id="api-url"
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://your-standupninja.com"
            disabled={!canEdit || busy}
          />
          <p className="text-xs text-muted-foreground">
            The base URL of your StandupNinja deployment
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={secrets?.apiKeySet ? '••••••••' : 'Enter API key'}
            disabled={!canEdit || busy}
          />
          <p className="text-xs text-muted-foreground">
            {secrets?.apiKeySet
              ? 'API key is configured. Enter a new key to update it.'
              : 'API key for authenticating with StandupNinja'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleTestConnection} disabled={testConnection.isPending || !apiUrl || !apiKey || !canEdit} variant="outline" size="sm">
            {testConnection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test connection
          </Button>
          {settings?.lastTestAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {testStatusIcon}
              <span>
                Last tested: {new Date(settings.lastTestAt).toLocaleString()}
                {settings.lastTestResult !== 'success' && ` - ${settings.lastTestResult}`}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label>Sync on Hire</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically add employees when they complete onboarding
            </p>
          </div>
          <Switch checked={syncOnHire} onCheckedChange={setSyncOnHire} disabled={!canEdit || busy} />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label>Sync on Termination</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically remove employees when they complete offboarding
            </p>
          </div>
          <Switch checked={syncOnTermination} onCheckedChange={setSyncOnTermination} disabled={!canEdit || busy} />
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} disabled={!canEdit || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save configuration
          </Button>
          <Button variant="outline" onClick={handleSyncAll} disabled={!settings?.isEnabled || !canEdit}>
            Sync all active employees
          </Button>
        </div>
      </div>

      <Separator />

      {/* Team Mappings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Department → Standup Team Mappings</h3>
            <p className="text-sm text-muted-foreground">
              Map departments to standup teams for automatic assignment
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddMappingDialog(true)} disabled={!canEdit}>
            <Plus className="h-4 w-4 mr-2" />
            Add mapping
          </Button>
        </div>

        {!mappings || mappings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <p>No department mappings configured.</p>
            <p className="text-sm mt-1">Add mappings to automatically assign employees to standup teams.</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Standup Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-medium">{mapping.department}</TableCell>
                    <TableCell>{mapping.standupTeamName}</TableCell>
                    <TableCell>
                      <Badge variant={mapping.isActive ? 'default' : 'secondary'}>
                        {mapping.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMapping(mapping.id)}
                        disabled={!canEdit}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Mapping Dialog */}
      <Dialog open={showAddMappingDialog} onOpenChange={setShowAddMappingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Department Mapping</DialogTitle>
            <DialogDescription>
              Map a department to a standup team for automatic employee assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department Name</Label>
              <Input
                id="department"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-name">Standup Team Name</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Engineering Team"
              />
              <p className="text-xs text-muted-foreground">
                This must match the team name in StandupNinja exactly
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMappingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMapping}>Add mapping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Information */}
      {settings?.lastSyncAt && (
        <div className="text-sm text-muted-foreground">
          Last sync: {new Date(settings.lastSyncAt).toLocaleString()}
        </div>
      )}
    </div>
  )
}
