'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { AutoSendStageSettings } from '@/components/settings/auto-send-stage-settings'
import { Settings, Eye, MousePointer2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function EmailSettingsPage() {
  const [defaultCcEmail, setDefaultCcEmail] = useState('')
  const [trackOpens, setTrackOpens] = useState(true)
  const [trackClicks, setTrackClicks] = useState(true)
  const [autoSendOnApplication, setAutoSendOnApplication] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch email settings
  const { data: emailSettings, isLoading } = trpc.emailSettings.get.useQuery()
  const updateSettings = trpc.emailSettings.update.useMutation()

  // Populate form with existing settings
  useEffect(() => {
    if (emailSettings) {
      setDefaultCcEmail(emailSettings.defaultCcEmail || 'peopleops@curacel.ai')
      setTrackOpens(emailSettings.trackOpens ?? true)
      setTrackClicks(emailSettings.trackClicks ?? true)
      setAutoSendOnApplication(emailSettings.autoSendOnApplication ?? true)
    }
  }, [emailSettings])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      await updateSettings.mutateAsync({
        defaultCcEmail: defaultCcEmail || undefined,
        trackOpens,
        trackClicks,
        autoSendOnApplication,
      })
      toast.success('Email settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Email Settings"
        description="Configure email sending and tracking for candidate communications"
      />

      {/* Sender Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Sender Settings
          </CardTitle>
          <CardDescription>Configure default sender behavior for candidate emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-cc">Default CC Email</Label>
            <Input
              id="default-cc"
              type="email"
              value={defaultCcEmail}
              onChange={(e) => setDefaultCcEmail(e.target.value)}
              placeholder="peopleops@curacel.ai"
            />
            <p className="text-xs text-muted-foreground">
              This email will be CC'd on all candidate communications
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-send on Application</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically send confirmation email when candidates apply
              </p>
            </div>
            <Switch checked={autoSendOnApplication} onCheckedChange={setAutoSendOnApplication} />
          </div>
        </CardContent>
      </Card>

      {/* Auto-Send Stage Settings */}
      <AutoSendStageSettings />

      {/* Tracking Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Email Tracking
          </CardTitle>
          <CardDescription>
            Track email engagement to understand candidate responsiveness
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <Label>Track Email Opens</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Insert a tracking pixel to detect when emails are opened
                </p>
              </div>
            </div>
            <Switch checked={trackOpens} onCheckedChange={setTrackOpens} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <MousePointer2 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <Label>Track Link Clicks</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track when candidates click links in emails
                </p>
              </div>
            </div>
            <Switch checked={trackClicks} onCheckedChange={setTrackClicks} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
