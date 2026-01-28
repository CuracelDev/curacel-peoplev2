'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Briefcase,
  Building2,
  MapPin,
  CheckCircle,
  Loader2,
  Upload,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Mock job data
const job = {
  id: '1',
  title: 'Senior Backend Engineer',
  department: 'Engineering',
  location: 'Lagos, Nigeria (Remote)',
  type: 'Full-time',
  company: 'Curacel',
  description: 'We are looking for a Senior Backend Engineer to join our growing team and help build scalable distributed systems for insurance claims processing.',
}

// Interest form questions based on Google Form structure
const formQuestions = [
  {
    id: 'fullName',
    type: 'text',
    label: 'Full Name',
    required: true,
    placeholder: 'Enter your full name',
  },
  {
    id: 'email',
    type: 'email',
    label: 'Email Address',
    required: true,
    placeholder: 'your.email@example.com',
  },
  {
    id: 'phone',
    type: 'tel',
    label: 'Phone Number',
    required: true,
    placeholder: '+234 XXX XXX XXXX',
  },
  {
    id: 'linkedIn',
    type: 'url',
    label: 'LinkedIn Profile URL',
    required: false,
    placeholder: 'https://linkedin.com/in/yourprofile',
  },
  {
    id: 'portfolio',
    type: 'url',
    label: 'Portfolio/GitHub URL',
    required: false,
    placeholder: 'https://github.com/yourusername',
  },
  {
    id: 'currentRole',
    type: 'text',
    label: 'Current Role/Title',
    required: true,
    placeholder: 'e.g., Backend Engineer',
  },
  {
    id: 'currentCompany',
    type: 'text',
    label: 'Current Company',
    required: true,
    placeholder: 'e.g., Paystack',
  },
  {
    id: 'yearsExperience',
    type: 'select',
    label: 'Years of Relevant Experience',
    required: true,
    options: [
      { value: '0-1', label: '0-1 years' },
      { value: '2-3', label: '2-3 years' },
      { value: '4-5', label: '4-5 years' },
      { value: '6-8', label: '6-8 years' },
      { value: '9+', label: '9+ years' },
    ],
  },
  {
    id: 'location',
    type: 'text',
    label: 'Current Location (City, Country)',
    required: true,
    placeholder: 'e.g., Lagos, Nigeria',
  },
  {
    id: 'workAuth',
    type: 'radio',
    label: 'Are you legally authorized to work in Nigeria?',
    required: true,
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'sponsorship', label: 'Yes, but I require visa sponsorship' },
    ],
  },
  {
    id: 'noticePeriod',
    type: 'select',
    label: 'Notice Period',
    required: true,
    options: [
      { value: 'immediately', label: 'Available immediately' },
      { value: '2weeks', label: '2 weeks' },
      { value: '1month', label: '1 month' },
      { value: '2months', label: '2 months' },
      { value: '3months+', label: '3+ months' },
    ],
  },
  {
    id: 'salaryExpectation',
    type: 'text',
    label: 'Salary Expectation (Annual, USD)',
    required: true,
    placeholder: 'e.g., $80,000 - $100,000',
  },
  {
    id: 'remotePreference',
    type: 'radio',
    label: 'Work Arrangement Preference',
    required: true,
    options: [
      { value: 'remote', label: 'Fully Remote' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'onsite', label: 'On-site' },
      { value: 'flexible', label: 'Flexible / No preference' },
    ],
  },
  {
    id: 'skills',
    type: 'multiselect',
    label: 'Primary Technical Skills (Select all that apply)',
    required: true,
    options: [
      { value: 'nodejs', label: 'Node.js' },
      { value: 'python', label: 'Python' },
      { value: 'typescript', label: 'TypeScript' },
      { value: 'golang', label: 'Go' },
      { value: 'java', label: 'Java' },
      { value: 'postgresql', label: 'PostgreSQL' },
      { value: 'mongodb', label: 'MongoDB' },
      { value: 'redis', label: 'Redis' },
      { value: 'aws', label: 'AWS' },
      { value: 'docker', label: 'Docker' },
      { value: 'kubernetes', label: 'Kubernetes' },
      { value: 'graphql', label: 'GraphQL' },
    ],
  },
  {
    id: 'whyCuracel',
    type: 'textarea',
    label: 'Why are you interested in joining Curacel?',
    required: true,
    placeholder: 'Tell us what excites you about this opportunity...',
  },
  {
    id: 'achievement',
    type: 'textarea',
    label: 'Describe your most significant technical achievement',
    required: true,
    placeholder: 'Share a project or accomplishment you are proud of...',
  },
  {
    id: 'challenge',
    type: 'textarea',
    label: 'Describe a challenging technical problem you solved',
    required: true,
    placeholder: 'Walk us through your problem-solving approach...',
  },
  {
    id: 'leadership',
    type: 'textarea',
    label: 'Have you led a team or mentored other engineers? Please describe.',
    required: false,
    placeholder: 'Share your leadership or mentorship experience...',
  },
  {
    id: 'howHeard',
    type: 'select',
    label: 'How did you hear about this opportunity?',
    required: true,
    options: [
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'referral', label: 'Employee Referral' },
      { value: 'jobboard', label: 'Job Board' },
      { value: 'website', label: 'Company Website' },
      { value: 'social', label: 'Social Media' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'referralName',
    type: 'text',
    label: 'If referred, who referred you?',
    required: false,
    placeholder: 'Referrer name',
  },
  {
    id: 'additionalInfo',
    type: 'textarea',
    label: 'Anything else you would like us to know?',
    required: false,
    placeholder: 'Optional additional information...',
  },
]

export default function PublicInterestFormPage() {
  const params = useParams()
  const jobId = params.jobId as string
  const [formData, setFormData] = useState<Record<string, string | string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (id: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [id]: value }))
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: '' }))
    }
  }

  const handleMultiSelectChange = (id: string, value: string, checked: boolean) => {
    setFormData(prev => {
      const current = (prev[id] as string[]) || []
      if (checked) {
        return { ...prev, [id]: [...current, value] }
      } else {
        return { ...prev, [id]: current.filter(v => v !== value) }
      }
    })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    formQuestions.forEach(q => {
      if (q.required) {
        const value = formData[q.id]
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[q.id] = 'This field is required'
        }
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
            <p className="text-foreground/80 mb-6">
              Thank you for your interest in joining {job.company}. We have received your application for the {job.title} position and will review it shortly.
            </p>
            <p className="text-sm text-muted-foreground">
              You will receive a confirmation email at the address you provided.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="flex items-center gap-2 text-indigo-200 text-sm mb-4">
            <Building2 className="h-4 w-4" />
            <span>{job.company}</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">{job.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span>{job.department}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{job.location}</span>
            </div>
            <div className="bg-card/20 px-3 py-1 rounded-full">
              {job.type}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Interest Form</CardTitle>
            <CardDescription>
              Please complete all required fields. Your information will be reviewed by our hiring team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formQuestions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label htmlFor={question.id} className="flex items-center gap-1">
                    {question.label}
                    {question.required && <span className="text-destructive">*</span>}
                  </Label>

                  {/* Text/Email/Tel/URL inputs */}
                  {['text', 'email', 'tel', 'url'].includes(question.type) && (
                    <Input
                      id={question.id}
                      type={question.type}
                      placeholder={question.placeholder}
                      value={(formData[question.id] as string) || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      className={cn(errors[question.id] && 'border-destructive')}
                    />
                  )}

                  {/* Textarea */}
                  {question.type === 'textarea' && (
                    <Textarea
                      id={question.id}
                      placeholder={question.placeholder}
                      value={(formData[question.id] as string) || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      className={cn('min-h-[100px]', errors[question.id] && 'border-destructive')}
                    />
                  )}

                  {/* Select */}
                  {question.type === 'select' && (
                    <Select
                      value={(formData[question.id] as string) || ''}
                      onValueChange={(value) => handleInputChange(question.id, value)}
                    >
                      <SelectTrigger className={cn(errors[question.id] && 'border-destructive')}>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {question.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Radio */}
                  {question.type === 'radio' && (
                    <RadioGroup
                      value={(formData[question.id] as string) || ''}
                      onValueChange={(value) => handleInputChange(question.id, value)}
                      className={cn(errors[question.id] && 'border border-destructive rounded-md p-2')}
                    >
                      {question.options?.map((opt) => (
                        <div key={opt.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt.value} id={`${question.id}-${opt.value}`} />
                          <Label htmlFor={`${question.id}-${opt.value}`} className="font-normal cursor-pointer">
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {/* Multi-select (Checkboxes) */}
                  {question.type === 'multiselect' && (
                    <div className={cn(
                      'grid grid-cols-2 md:grid-cols-3 gap-3',
                      errors[question.id] && 'border border-destructive rounded-md p-2'
                    )}>
                      {question.options?.map((opt) => (
                        <div key={opt.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${question.id}-${opt.value}`}
                            checked={((formData[question.id] as string[]) || []).includes(opt.value)}
                            onCheckedChange={(checked: boolean | 'indeterminate') =>
                              handleMultiSelectChange(question.id, opt.value, checked === true)
                            }
                          />
                          <Label
                            htmlFor={`${question.id}-${opt.value}`}
                            className="font-normal cursor-pointer text-sm"
                          >
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors[question.id] && (
                    <div className="flex items-center gap-1 text-destructive text-sm">
                      <AlertCircle className="h-3 w-3" />
                      {errors[question.id]}
                    </div>
                  )}
                </div>
              ))}

              {/* Resume Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Resume/CV
                  <span className="text-destructive">*</span>
                </Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-foreground/80">
                    Drag and drop your resume or <span className="text-indigo-600">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, or DOCX (max 5MB)
                  </p>
                </div>
              </div>

              {/* Consent */}
              <div className="flex items-start space-x-2 pt-4">
                <Checkbox id="consent" required />
                <Label htmlFor="consent" className="font-normal text-sm leading-relaxed cursor-pointer">
                  I agree to the processing of my personal data for recruitment purposes. I understand that my information will be stored securely and used only for evaluating my application.
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground mt-8 pb-8">
          <p>By submitting this form, you agree to our privacy policy.</p>
          <p className="mt-2">
            Having trouble? Contact us at{' '}
            <a href="mailto:careers@curacel.co" className="text-indigo-600 hover:underline">
              careers@curacel.co
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
