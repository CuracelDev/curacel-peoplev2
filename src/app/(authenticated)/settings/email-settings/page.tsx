'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import {
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Eye,
  MousePointer2,
  Loader2,
} from 'lucide-react'

export default function EmailSettingsPage() {
  const [defaultCcEmail, setDefaultCcEmail] = useState('peopleops@curacel.ai')
  const [trackOpens, setTrackOpens] = useState(true)
  const [trackClicks, setTrackClicks] = useState(true)
  const [autoSendOnApplication, setAutoSendOnApplication] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)

  // Test Gmail connection
  const testConnection = trpc.candidateEmail.testGmailConnection.useQuery(undefined, {
    enabled: false, // Only run on demand
    retry: false,
  })

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection.refetch()
      setTestResult(result.data || { success: false, error: 'Unknown error' })
    } catch (error) {
      setTestResult({ success: false, error: error instanceof Error ? error.message : 'Connection failed' })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Email Settings"
        description="Configure email sending, tracking, and Gmail integration for candidate communications"
      />

      {/* Gmail Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Gmail Integration
          </CardTitle>
          <CardDescription>
            Connect to Gmail API for sending emails as recruiters with domain-wide delegation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {testResult === null ? (
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
              ) : testResult.success ? (
                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">
                  {testResult === null
                    ? 'Gmail Connection'
                    : testResult.success
                    ? 'Connected'
                    : 'Connection Failed'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {testResult === null
                    ? 'Click test to verify connection'
                    : testResult.success
                    ? 'Gmail API is working correctly'
                    : testResult.error}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
          </div>

          <div className="grid gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="gmail-domain">Gmail Domain</Label>
              <Input
                id="gmail-domain"
                value="curacel.ai"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Emails will be sent from @curacel.ai addresses via domain-wide delegation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sender Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Sender Settings
          </CardTitle>
          <CardDescription>
            Configure default sender behavior for candidate emails
          </CardDescription>
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
            <Switch
              checked={autoSendOnApplication}
              onCheckedChange={setAutoSendOnApplication}
            />
          </div>
        </CardContent>
      </Card>

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

      {/* Environment Variables Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment Configuration</CardTitle>
          <CardDescription>
            Required environment variables for Gmail integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline">GMAIL_SERVICE_ACCOUNT_KEY</Badge>
              <span className="text-muted-foreground">Service account JSON key</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">GMAIL_DELEGATED_USER</Badge>
              <span className="text-muted-foreground">Admin user for impersonation</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">GMAIL_DEFAULT_CC</Badge>
              <span className="text-muted-foreground">Default CC email (optional)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  )
}
