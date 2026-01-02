'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import {
  Globe,
  FileText,
  ClipboardCheck,
  Users,
  Video,
  PenTool,
  UserPlus,
  Code,
  Lock,
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

const ICON_MAP: Record<string, any> = {
  Globe,
  FileText,
  ClipboardCheck,
  Users,
  Video,
  PenTool,
  UserPlus,
  Code,
  Lock,
}

const CATEGORY_LABELS: Record<string, string> = {
  candidate: 'Candidate-Facing',
  recruiter: 'Recruiter',
  hiring: 'Hiring Team',
  employee: 'Employee & Contract',
  developer: 'Developer',
  auth: 'Authentication',
}

const CATEGORY_ORDER = ['candidate', 'recruiter', 'hiring', 'employee', 'developer', 'auth']

export default function PublicPagesSettingsPage() {
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.publicPages.getSettings.useQuery()
  const { data: previewUrls } = trpc.publicPages.getPreviewUrls.useQuery()
  const updateSettings = trpc.publicPages.updatePageSettings.useMutation({
    onSuccess: () => {
      utils.publicPages.getSettings.invalidate()
      toast.success('Settings updated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update settings')
    },
  })

  const [localSettings, setLocalSettings] = useState<Record<string, any>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    if (data?.settings) {
      setLocalSettings(data.settings)
    }
  }, [data?.settings])

  const handleToggle = (pageKey: string, enabled: boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      [pageKey]: { ...prev[pageKey], enabled },
    }))
    updateSettings.mutate({
      pageKey,
      settings: { enabled },
    })
  }

  const handleCopyUrl = (pageKey: string, url: string | null) => {
    if (!url) {
      toast.error('No preview URL available - create some data first')
      return
    }
    // Remove preview param for copying
    const cleanUrl = url.replace('?preview=true', '').replace('&preview=true', '')
    navigator.clipboard.writeText(cleanUrl)
    setCopiedKey(pageKey)
    toast.success('URL copied to clipboard')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handlePreview = (url: string | null) => {
    if (!url) {
      toast.error('No preview URL available - create some data first')
      return
    }
    window.open(url, '_blank')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SettingsPageHeader title="Public Pages" description="Loading..." />
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const pages = data?.pages || []

  // Group pages by category
  const pagesByCategory = pages.reduce((acc, page) => {
    const category = page.category
    if (!acc[category]) acc[category] = []
    acc[category].push(page)
    return acc
  }, {} as Record<string, typeof pages>)

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Public Pages & Portals"
        description="Manage external-facing pages and portals that candidates, recruiters, and employees can access."
      />

      {CATEGORY_ORDER.map((category) => {
        const categoryPages = pagesByCategory[category]
        if (!categoryPages?.length) return null

        return (
          <div key={category} className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {CATEGORY_LABELS[category]}
            </h3>

            <div className="grid gap-4">
              {categoryPages.map((page) => {
                const Icon = ICON_MAP[page.icon] || Globe
                const settings = localSettings[page.key] || { enabled: true }
                const previewUrl = previewUrls?.[page.key as keyof typeof previewUrls] || null
                const isEnabled = settings.enabled !== false
                const cannotDisable = (page as any).cannotDisable

                return (
                  <Card key={page.key} className={!isEnabled ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className={`h-5 w-5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {page.name}
                              {isEnabled ? (
                                <Badge variant="outline" className="text-success border-success/20 bg-success/10">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Enabled
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Disabled
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1">{page.description}</CardDescription>
                          </div>
                        </div>
                        {!cannotDisable && (
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleToggle(page.key, checked)}
                            disabled={updateSettings.isPending}
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {page.route}
                        </code>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyUrl(page.key, previewUrl)}
                            disabled={!previewUrl}
                          >
                            {copiedKey === page.key ? (
                              <CheckCircle className="h-4 w-4 mr-1 text-success" />
                            ) : (
                              <Copy className="h-4 w-4 mr-1" />
                            )}
                            {copiedKey === page.key ? 'Copied!' : 'Copy URL'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(previewUrl)}
                            disabled={!previewUrl}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>
                      {!previewUrl && page.key !== 'auth' && page.key !== 'apiDocs' && (
                        <p className="text-xs text-amber-600 mt-2">
                          No preview available - create a {page.key === 'careers' || page.key === 'apply' ? 'job posting' : page.key} first
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              When a page is disabled, visitors will see a &quot;Portal temporarily unavailable&quot; message
              with your company branding.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
