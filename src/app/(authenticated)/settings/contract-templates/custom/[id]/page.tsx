'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Save, Trash2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

interface TemplateFormData {
  name: string
  description: string
  bodyMarkdown: string
}

export default function CustomTemplateEditorPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const { data: template, isLoading } = trpc.offerTemplate.getById.useQuery(templateId, {
    enabled: !!templateId,
  })

  const updateTemplate = trpc.offerTemplate.update.useMutation({
    onSuccess: () => {
      router.push('/settings/contract-templates')
    },
  })

  const deleteTemplate = trpc.offerTemplate.delete.useMutation({
    onSuccess: () => {
      router.push('/settings/contract-templates')
    },
  })

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TemplateFormData>({
    defaultValues: {
      name: '',
      description: '',
      bodyMarkdown: '',
    },
  })

  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        description: template.description || '',
        bodyMarkdown: template.bodyMarkdown || '',
      })
    }
  }, [template, reset])

  const onSubmit = (data: TemplateFormData) => {
    if (!template) return

    // Convert markdown to HTML (simple conversion)
    const bodyHtml = convertMarkdownToHtml(data.bodyMarkdown)

    updateTemplate.mutate({
      id: template.id,
      name: data.name,
      description: data.description,
      bodyMarkdown: data.bodyMarkdown,
      bodyHtml,
    })
  }

  const handleDelete = () => {
    if (!template) return
    deleteTemplate.mutate(template.id)
  }

  const convertMarkdownToHtml = (markdown: string): string => {
    // Simple markdown to HTML conversion
    let html = markdown
      .split('\n\n')
      .map((paragraph) => {
        const trimmed = paragraph.trim()
        if (!trimmed) return ''

        // Headings
        if (trimmed.match(/^[A-Z][A-Z\s:&]+$/) && trimmed.length < 100) {
          return `<h3 style="color: #2d3748; font-weight: bold; margin-top: 24px; margin-bottom: 12px; font-size: 1.1em;">${trimmed}</h3>`
        }

        // List items
        if (trimmed.includes('\n') && (trimmed.includes('- ') || trimmed.match(/\d+\.\s/))) {
          const items = trimmed.split('\n').filter(line => line.trim())
          const listItems = items.map(item => {
            const clean = item.replace(/^[-]/g, '').replace(/^\d+\.\s*/, '').trim()
            if (!clean) return ''
            return `<li style="margin-bottom: 10px; margin-left: 20px;">${clean}</li>`
          }).filter(Boolean).join('\n')
          return `<ul style="margin-left: 20px; margin-bottom: 15px; padding-left: 20px;">${listItems}</ul>`
        }

        // Regular paragraphs
        return `<p style="margin-bottom: 15px; text-align: left;">${trimmed}</p>`
      })
      .filter(Boolean)
      .join('\n')

    return `
    <div style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.8; color: #1a1a1a;">
      ${html}
    </div>
    `
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="space-y-6">
        <SettingsPageHeader
          title="Template Not Found"
          description="The requested template could not be found."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <SettingsPageHeader
        title="Edit Template"
        description={template.name}
        actions={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Template
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this template? This action cannot be undone.
                  If this template is used by existing contracts, it will be marked as inactive instead.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Template Information</CardTitle>
            <CardDescription>Basic information about this template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                className="mt-1"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                className="mt-1"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Content</CardTitle>
            <CardDescription>
              Edit the template content. Use placeholders like {'%{variable_name}'} for dynamic content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              name="bodyMarkdown"
              control={control}
              rules={{ required: 'Template content is required' }}
              render={({ field }) => (
                <RichTextEditor
                  {...field}
                  placeholder="Enter template content..."
                  className="min-h-[600px]"
                />
              )}
            />
            {errors.bodyMarkdown && (
              <p className="text-sm text-red-500 mt-1">{errors.bodyMarkdown.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateTemplate.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateTemplate.isPending ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </form>
    </div>
  )
}
