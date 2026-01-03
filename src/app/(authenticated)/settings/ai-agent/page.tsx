'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

type ModelOption = { id: string; label: string }

const selectClassName =
  'flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50'

const ensureCurrentModel = (models: ModelOption[], currentModel?: string | null) => {
  if (!currentModel) return models
  if (models.some((model) => model.id === currentModel)) return models
  return [{ id: currentModel, label: currentModel }, ...models]
}

const getSelectedModel = (models: ModelOption[], currentModel?: string | null) => {
  if (!models.length) return ''
  if (currentModel && models.some((model) => model.id === currentModel)) return currentModel
  return models[0].id
}

export default function AIAgentSettingsPage() {
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showCapabilities, setShowCapabilities] = useState(false)

  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')

  const { data: settings, refetch, isLoading, error: settingsError } =
    trpc.assistant.getSettings.useQuery()

  const openaiModelsQuery = trpc.assistant.listModels.useQuery(
    { provider: 'OPENAI' },
    {
      enabled: !!settings?.hasOpenaiKey,
      staleTime: 0,
      refetchOnMount: 'always',
    }
  )

  const anthropicModelsQuery = trpc.assistant.listModels.useQuery(
    { provider: 'ANTHROPIC' },
    {
      enabled: !!settings?.hasAnthropicKey,
      staleTime: 0,
      refetchOnMount: 'always',
    }
  )

  const geminiModelsQuery = trpc.assistant.listModels.useQuery(
    { provider: 'GEMINI' },
    {
      enabled: !!settings?.hasGeminiKey,
      staleTime: 0,
      refetchOnMount: 'always',
    }
  )

  const updateSettings = trpc.assistant.updateSettings.useMutation({
    onSuccess: () => {
      refetch()
      setOpenaiKey('')
      setAnthropicKey('')
      setGeminiKey('')
      // Don't clear systemPrompt - keep it visible after saving
    },
  })

  const testConnection = trpc.assistant.testConnection.useMutation()

  // Initialize systemPrompt from settings when data loads
  useEffect(() => {
    if (settings?.systemPrompt) {
      setSystemPrompt(settings.systemPrompt)
    }
  }, [settings?.systemPrompt])

  const openaiModels = ensureCurrentModel(openaiModelsQuery.data?.models ?? [], settings?.openaiModel)
  const anthropicModels = ensureCurrentModel(anthropicModelsQuery.data?.models ?? [], settings?.anthropicModel)
  const geminiModels = ensureCurrentModel(geminiModelsQuery.data?.models ?? [], settings?.geminiModel)

  const openaiSelectedModel = getSelectedModel(openaiModels, settings?.openaiModel)
  const anthropicSelectedModel = getSelectedModel(anthropicModels, settings?.anthropicModel)
  const geminiSelectedModel = getSelectedModel(geminiModels, settings?.geminiModel)

  const getSelectValue = ({
    hasKey,
    isLoadingModels,
    error,
    models,
    selectedModel,
  }: {
    hasKey: boolean
    isLoadingModels: boolean
    error?: { message?: string } | null
    models: ModelOption[]
    selectedModel: string
  }) => {
    if (!hasKey || isLoadingModels || error || !models.length) return ''
    return selectedModel
  }

  const renderModelOptions = ({
    hasKey,
    isLoadingModels,
    error,
    models,
  }: {
    hasKey: boolean
    isLoadingModels: boolean
    error?: { message?: string } | null
    models: ModelOption[]
  }) => {
    if (!hasKey) {
      return <option value="">Save API key to load models</option>
    }
    if (isLoadingModels) {
      return <option value="">Loading models...</option>
    }
    if (error) {
      return <option value="">Failed to load models</option>
    }
    if (!models.length) {
      return <option value="">No models found</option>
    }
    return models.map((model) => (
      <option key={model.id} value={model.id}>
        {model.label}
      </option>
    ))
  }

  const handleProviderChange = (provider: 'OPENAI' | 'ANTHROPIC' | 'GEMINI') => {
    updateSettings.mutate({ provider })
  }

  const handleToggleEnabled = (isEnabled: boolean) => {
    updateSettings.mutate({ isEnabled })
  }

  const handleSaveOpenAIKey = () => {
    if (openaiKey.trim()) {
      updateSettings.mutate({ openaiKey: openaiKey.trim() })
    }
  }

  const handleSaveAnthropicKey = () => {
    if (anthropicKey.trim()) {
      updateSettings.mutate({ anthropicKey: anthropicKey.trim() })
    }
  }

  const handleSaveGeminiKey = () => {
    if (geminiKey.trim()) {
      updateSettings.mutate({ geminiKey: geminiKey.trim() })
    }
  }

  const handleModelChange = (provider: 'openai' | 'anthropic' | 'gemini', model: string) => {
    if (provider === 'openai') {
      updateSettings.mutate({ openaiModel: model })
    } else if (provider === 'anthropic') {
      updateSettings.mutate({ anthropicModel: model })
    } else {
      updateSettings.mutate({ geminiModel: model })
    }
  }

  const handleSaveSystemPrompt = () => {
    updateSettings.mutate({ systemPrompt: systemPrompt.trim() || undefined })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="AuntyPelz"
        actions={
          <Button
            onClick={() => testConnection.mutate()}
            disabled={testConnection.isPending}
            variant="outline"
          >
            {testConnection.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
        }
      />

      {(settingsError || updateSettings.error) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-4">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">
              {settingsError?.message || updateSettings.error?.message || 'Failed to load AuntyPelz settings.'}
            </span>
          </CardContent>
        </Card>
      )}

      {testConnection.data && (
        <Card className={testConnection.data.success ? 'border-success/20 bg-success/10' : 'border-red-200 bg-red-50'}>
          <CardContent className="flex items-center gap-3 py-4">
            {testConnection.data.success ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={testConnection.data.success ? 'text-success-foreground' : 'text-red-800'}>
              {testConnection.data.message}
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Enable AuntyPelz</CardTitle>
              <CardDescription>
                Allow AuntyPelz to help with contracts, onboarding, and employee management.
              </CardDescription>
            </div>
            <Switch
              checked={settings?.isEnabled ?? true}
              onCheckedChange={handleToggleEnabled}
              disabled={updateSettings.isPending}
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AuntyPelz Provider</CardTitle>
          <CardDescription>
            Choose which provider AuntyPelz uses for assistance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ai-provider">Provider</Label>
            <select
              id="ai-provider"
              className={selectClassName}
              value={settings?.provider ?? 'OPENAI'}
              onChange={(event) => handleProviderChange(event.target.value as 'OPENAI' | 'ANTHROPIC' | 'GEMINI')}
              disabled={updateSettings.isPending}
            >
              <option value="OPENAI">
                OpenAI{settings?.hasOpenaiKey ? ' (Configured)' : ''}
              </option>
              <option value="ANTHROPIC">
                Anthropic{settings?.hasAnthropicKey ? ' (Configured)' : ''}
              </option>
              <option value="GEMINI">
                Gemini{settings?.hasGeminiKey ? ' (Configured)' : ''}
              </option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-foreground/80">
            <span>OpenAI</span>
            {settings?.hasOpenaiKey ? (
              <Badge variant="secondary" className="text-xs">Configured</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">No key</Badge>
            )}
            <span>Anthropic</span>
            {settings?.hasAnthropicKey ? (
              <Badge variant="secondary" className="text-xs">Configured</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">No key</Badge>
            )}
            <span>Gemini</span>
            {settings?.hasGeminiKey ? (
              <Badge variant="secondary" className="text-xs">Configured</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">No key</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OpenAI Configuration</CardTitle>
          <CardDescription>
            Configure your OpenAI API key and model preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openai-key">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="openai-key"
                  type={showOpenAIKey ? 'text' : 'password'}
                  placeholder={settings?.hasOpenaiKey ? '••••••••••••••••' : 'sk-...'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                >
                  {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSaveOpenAIKey} disabled={!openaiKey.trim() || updateSettings.isPending}>
                Save
              </Button>
            </div>
            {settings?.hasOpenaiKey && (
              <p className="text-xs text-success">API key is configured</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="openai-model">Model</Label>
            <select
              id="openai-model"
              className={selectClassName}
              value={getSelectValue({
                hasKey: !!settings?.hasOpenaiKey,
                isLoadingModels: openaiModelsQuery.isLoading,
                error: openaiModelsQuery.error,
                models: openaiModels,
                selectedModel: openaiSelectedModel,
              })}
              onChange={(event) => handleModelChange('openai', event.target.value)}
              disabled={
                updateSettings.isPending ||
                !settings?.hasOpenaiKey ||
                openaiModelsQuery.isLoading ||
                !!openaiModelsQuery.error
              }
            >
              {renderModelOptions({
                hasKey: !!settings?.hasOpenaiKey,
                isLoadingModels: openaiModelsQuery.isLoading,
                error: openaiModelsQuery.error,
                models: openaiModels,
              })}
            </select>
            {openaiModelsQuery.error && (
              <p className="text-xs text-red-600">{openaiModelsQuery.error.message || 'Failed to load models.'}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anthropic Configuration</CardTitle>
          <CardDescription>
            Configure your Anthropic API key and model preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="anthropic-key">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="anthropic-key"
                  type={showAnthropicKey ? 'text' : 'password'}
                  placeholder={settings?.hasAnthropicKey ? '••••••••••••••••' : 'sk-ant-...'}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                >
                  {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSaveAnthropicKey} disabled={!anthropicKey.trim() || updateSettings.isPending}>
                Save
              </Button>
            </div>
            {settings?.hasAnthropicKey && (
              <p className="text-xs text-success">API key is configured</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="anthropic-model">Model</Label>
            <select
              id="anthropic-model"
              className={selectClassName}
              value={getSelectValue({
                hasKey: !!settings?.hasAnthropicKey,
                isLoadingModels: anthropicModelsQuery.isLoading,
                error: anthropicModelsQuery.error,
                models: anthropicModels,
                selectedModel: anthropicSelectedModel,
              })}
              onChange={(event) => handleModelChange('anthropic', event.target.value)}
              disabled={
                updateSettings.isPending ||
                !settings?.hasAnthropicKey ||
                anthropicModelsQuery.isLoading ||
                !!anthropicModelsQuery.error
              }
            >
              {renderModelOptions({
                hasKey: !!settings?.hasAnthropicKey,
                isLoadingModels: anthropicModelsQuery.isLoading,
                error: anthropicModelsQuery.error,
                models: anthropicModels,
              })}
            </select>
            {anthropicModelsQuery.error && (
              <p className="text-xs text-red-600">
                {anthropicModelsQuery.error.message || 'Failed to load models.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gemini Configuration</CardTitle>
          <CardDescription>
            Configure your Google AI Gemini API key and model preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gemini-key">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="gemini-key"
                  type={showGeminiKey ? 'text' : 'password'}
                  placeholder={settings?.hasGeminiKey ? '••••••••••••••••' : 'AIza...'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                >
                  {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSaveGeminiKey} disabled={!geminiKey.trim() || updateSettings.isPending}>
                Save
              </Button>
            </div>
            {settings?.hasGeminiKey && (
              <p className="text-xs text-success">API key is configured</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini-model">Model</Label>
            <select
              id="gemini-model"
              className={selectClassName}
              value={getSelectValue({
                hasKey: !!settings?.hasGeminiKey,
                isLoadingModels: geminiModelsQuery.isLoading,
                error: geminiModelsQuery.error,
                models: geminiModels,
                selectedModel: geminiSelectedModel,
              })}
              onChange={(event) => handleModelChange('gemini', event.target.value)}
              disabled={
                updateSettings.isPending ||
                !settings?.hasGeminiKey ||
                geminiModelsQuery.isLoading ||
                !!geminiModelsQuery.error
              }
            >
              {renderModelOptions({
                hasKey: !!settings?.hasGeminiKey,
                isLoadingModels: geminiModelsQuery.isLoading,
                error: geminiModelsQuery.error,
                models: geminiModels,
              })}
            </select>
            {geminiModelsQuery.error && (
              <p className="text-xs text-red-600">{geminiModelsQuery.error.message || 'Failed to load models.'}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Prompt Configuration</CardTitle>
          <CardDescription>
            Customize AuntyPelz's behavior by editing the system prompt. Leave empty to use the default prompt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              rows={12}
              placeholder={settings?.systemPrompt || 'Default system prompt will be used...'}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="font-mono text-xs"
            />
            {settings?.systemPrompt && (
              <p className="text-xs text-muted-foreground">
                Custom system prompt is currently active
              </p>
            )}
          </div>
          <Button
            onClick={handleSaveSystemPrompt}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? 'Saving...' : 'Save System Prompt'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowCapabilities(!showCapabilities)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Capabilities
                {showCapabilities ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </CardTitle>
              <CardDescription>
                AuntyPelz can help with the following tasks
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {showCapabilities && (
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Contract Management</h4>
                <ul className="space-y-2 text-sm text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Search and find contracts by candidate name or status
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Create, update, and manage contract drafts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Send, resend, and cancel contracts (with confirmation)
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Employee Lifecycle</h4>
                <ul className="space-y-2 text-sm text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Manage onboarding and offboarding workflows
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Control and track onboarding/offboarding tasks
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Look up employee information and details
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Hiring & Recruitment</h4>
                <ul className="space-y-2 text-sm text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Search and view candidates in hiring pipeline
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    List jobs and view their pipelines
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    AI-powered candidate analysis and recommendations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Get hiring analytics by year
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">System & Administration</h4>
                <ul className="space-y-2 text-sm text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    View integrations and test connections
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Search audit logs
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    View and manage notifications
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
