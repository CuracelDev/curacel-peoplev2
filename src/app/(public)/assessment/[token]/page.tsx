'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Upload,
  Type,
  Link2,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type SubmissionType = 'FILE' | 'TEXT' | 'URL'

export default function PublicAssessmentPage() {
  const params = useParams()
  const token = params.token as string

  const [activeTab, setActiveTab] = useState<SubmissionType>('TEXT')
  const [submissionText, setSubmissionText] = useState('')
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch assessment by token
  const { data: assessment, isLoading, error } = trpc.assessment.getByToken.useQuery({ token })

  // Submit mutation
  const submitResult = trpc.assessment.submitCandidateResult.useMutation({
    onSuccess: () => {
      toast.success('Assessment submitted successfully!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit assessment')
      setIsSubmitting(false)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    // For now, we'll submit text and URL directly
    // File upload would need a separate upload endpoint
    const submissionData: {
      token: string
      submissionText?: string
      submissionUrl?: string
      submissionFiles?: Array<{ url: string; name: string; type: string; size: number }>
    } = { token }

    if (submissionText) {
      submissionData.submissionText = submissionText
    }

    if (submissionUrl) {
      submissionData.submissionUrl = submissionUrl
    }

    // For files, we would need to upload them first and get URLs
    // This is a simplified version - in production you'd use an upload service
    if (files.length > 0) {
      // TODO: Implement file upload to get URLs
      toast.info('File upload coming soon - please use text or URL submission for now')
      setIsSubmitting(false)
      return
    }

    submitResult.mutate(submissionData)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !assessment) {
    console.error('Assessment error:', error)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Assessment Not Found</h2>
            <p className="text-muted-foreground">
              This assessment link is invalid or has expired. Please contact your recruiter for a new link.
            </p>
            {error && (
              <p className="text-xs text-red-400 mt-4 font-mono">
                Debug: {error.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Expired state
  if (assessment.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Assessment Expired</h2>
            <p className="text-muted-foreground">
              This assessment has expired. Please contact your recruiter for an extension or a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Already completed state
  if (assessment.isCompleted || submitResult.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Assessment Submitted</h2>
            <p className="text-muted-foreground">
              Thank you for completing your assessment! Our team will review your submission and get back to you soon.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const candidateSubmissionTypes = (assessment.template.candidateSubmissionTypes as SubmissionType[]) || ['FILE', 'TEXT', 'URL']
  const hasMultipleTypes = candidateSubmissionTypes.length > 1

  // Set initial tab to first available type
  const initialTab = candidateSubmissionTypes[0] || 'TEXT'
  if (activeTab !== initialTab && !candidateSubmissionTypes.includes(activeTab)) {
    setActiveTab(initialTab)
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          {assessment.template.organization?.logoUrl ? (
            <img
              src={assessment.template.organization.logoUrl}
              alt={assessment.template.organization.name || 'Company'}
              className="h-12 mx-auto mb-4"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          )}
          <h1 className="text-2xl font-bold mb-1">{assessment.template.name}</h1>
          {assessment.template.organization?.name && (
            <p className="text-muted-foreground">{assessment.template.organization.name}</p>
          )}
        </div>

        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {assessment.candidate?.name || 'Candidate'}!</CardTitle>
            <CardDescription>
              {assessment.template.description || 'Please complete the assessment below.'}
            </CardDescription>
          </CardHeader>
          {assessment.template.instructions && (
            <CardContent>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Instructions</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 whitespace-pre-wrap">
                  {assessment.template.instructions}
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Duration Info */}
        {assessment.template.durationMinutes && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Expected duration: {assessment.template.durationMinutes} minutes</span>
          </div>
        )}

        {/* Submission Form */}
        <Card>
          <CardHeader>
            <CardTitle>Your Submission</CardTitle>
            <CardDescription>
              {hasMultipleTypes
                ? 'Choose how you want to submit your work'
                : `Submit your ${candidateSubmissionTypes[0]?.toLowerCase() || 'response'}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasMultipleTypes ? (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SubmissionType)}>
                <TabsList className={cn('grid w-full', `grid-cols-${candidateSubmissionTypes.length}`)}>
                  {candidateSubmissionTypes.includes('TEXT') && (
                    <TabsTrigger value="TEXT" className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Text
                    </TabsTrigger>
                  )}
                  {candidateSubmissionTypes.includes('FILE') && (
                    <TabsTrigger value="FILE" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      File
                    </TabsTrigger>
                  )}
                  {candidateSubmissionTypes.includes('URL') && (
                    <TabsTrigger value="URL" className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      URL
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="TEXT" className="mt-6">
                  <TextSubmission value={submissionText} onChange={setSubmissionText} />
                </TabsContent>

                <TabsContent value="FILE" className="mt-6">
                  <FileSubmission files={files} onFileChange={handleFileChange} />
                </TabsContent>

                <TabsContent value="URL" className="mt-6">
                  <UrlSubmission value={submissionUrl} onChange={setSubmissionUrl} />
                </TabsContent>
              </Tabs>
            ) : (
              <>
                {candidateSubmissionTypes[0] === 'TEXT' && (
                  <TextSubmission value={submissionText} onChange={setSubmissionText} />
                )}
                {candidateSubmissionTypes[0] === 'FILE' && (
                  <FileSubmission files={files} onFileChange={handleFileChange} />
                )}
                {candidateSubmissionTypes[0] === 'URL' && (
                  <UrlSubmission value={submissionUrl} onChange={setSubmissionUrl} />
                )}
              </>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t">
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting || submitResult.isPending || (!submissionText && !submissionUrl && files.length === 0)}
              >
                {(isSubmitting || submitResult.isPending) ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Submit Assessment
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Once submitted, you will not be able to make changes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Text submission component
function TextSubmission({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="submissionText">Your Response</Label>
      <Textarea
        id="submissionText"
        placeholder="Type your response here..."
        rows={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground">
        {value.length} characters
      </p>
    </div>
  )
}

// File submission component
function FileSubmission({
  files,
  onFileChange,
}: {
  files: File[]
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop your files here, or click to browse
        </p>
        <Input
          type="file"
          className="max-w-xs mx-auto"
          onChange={onFileChange}
          multiple
          accept=".pdf,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg"
        />
        <p className="text-xs text-muted-foreground mt-4">
          Supported: PDF, DOC, DOCX, TXT, ZIP, PNG, JPG (max 10MB each)
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files</Label>
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// URL submission component
function UrlSubmission({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="submissionUrl">Link to Your Work</Label>
        <Input
          id="submissionUrl"
          type="url"
          placeholder="https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Share a link to your portfolio, GitHub repository, Google Doc, or any other relevant work.
        </p>
      </div>

      {value && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <Label className="text-xs text-muted-foreground mb-1 block">Preview</Label>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {value}
          </a>
        </div>
      )}
    </div>
  )
}
