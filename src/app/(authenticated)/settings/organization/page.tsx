'use client'

import { useState, useRef } from 'react'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Upload } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { Logo } from '@/components/ui/logo'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { cn } from '@/lib/utils'

interface OrganizationFormData {
  name: string
  logoUrl: string | null
  oneSentenceDescription: string | null
  careerPageUrl: string | null
  detailedDescription: string | null
  letterheadEmail: string | null
  letterheadWebsite: string | null
  letterheadAddress: string | null
  letterheadPhone: string | null
}

const defaultPressValues = [
  { letter: 'P', name: 'Passionate Work', description: "We approach every challenge with enthusiasm and dedication. We don't just do our jobs - we care deeply about the impact of our work." },
  { letter: 'R', name: 'Relentless Growth', description: 'We continuously push ourselves to learn, improve, and expand our capabilities. Comfort zones are meant to be challenged.' },
  { letter: 'E', name: 'Empowered Action', description: "We take ownership and make decisions. We don't wait for permission to do what's right for our customers and colleagues." },
  { letter: 'S', name: 'Sense of Urgency', description: 'We move quickly and decisively. In insurance, timing matters - we treat every problem as if it needs solving today.' },
  { letter: 'S', name: 'Seeing Possibilities', description: 'We see opportunities where others see obstacles. We\'re building the future of insurance in Africa.' },
]

const tabs = [
  { id: 'bio', name: 'Bio' },
  { id: 'vision-values', name: 'Vision & Values' },
]

export default function OrganizationProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('bio')
  const [pressValues, setPressValues] = useState(defaultPressValues)

  const { data: organization, isLoading } = trpc.organization.get.useQuery()
  const updateOrganization = trpc.organization.update.useMutation({
    onSuccess: () => {
      router.refresh()
    },
  })

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationFormData>({
    defaultValues: {
      name: organization?.name || '',
      logoUrl: organization?.logoUrl || null,
      oneSentenceDescription: organization?.oneSentenceDescription || '',
      careerPageUrl: organization?.careerPageUrl || '',
      detailedDescription: organization?.detailedDescription || '',
      letterheadEmail: organization?.letterheadEmail || '',
      letterheadWebsite: organization?.letterheadWebsite || '',
      letterheadAddress: organization?.letterheadAddress || '',
      letterheadPhone: organization?.letterheadPhone || '',
    },
  })

  // Update form when organization data loads
  React.useEffect(() => {
    if (organization) {
      setValue('name', organization.name)
      setValue('logoUrl', organization.logoUrl)
      setValue('oneSentenceDescription', organization.oneSentenceDescription || '')
      setValue('careerPageUrl', organization.careerPageUrl || '')
      setValue('detailedDescription', organization.detailedDescription || '')
      setValue('letterheadEmail', organization.letterheadEmail || '')
      setValue('letterheadWebsite', organization.letterheadWebsite || '')
      setValue('letterheadAddress', organization.letterheadAddress || '')
      setValue('letterheadPhone', organization.letterheadPhone || '')
      if (organization.logoUrl) {
        setLogoPreview(organization.logoUrl)
      }
    }
  }, [organization, setValue])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // For now, we'll just show a preview. In production, you'd upload to S3/Cloudinary/etc.
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setLogoPreview(result)
        // In production, upload the file and set the URL
        // For now, we'll use a data URL (not recommended for production)
        setValue('logoUrl', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: OrganizationFormData) => {
    try {
        await updateOrganization.mutateAsync({
          name: data.name,
          logoUrl: data.logoUrl,
          oneSentenceDescription: data.oneSentenceDescription || null,
          careerPageUrl: data.careerPageUrl || null,
          detailedDescription: data.detailedDescription || null,
          letterheadEmail: data.letterheadEmail || null,
          letterheadWebsite: data.letterheadWebsite || null,
          letterheadAddress: data.letterheadAddress || null,
          letterheadPhone: data.letterheadPhone || null,
        })
    } catch (error) {
      console.error('Failed to update organization:', error)
    }
  }

  const updatePressValue = (index: number, description: string) => {
    setPressValues(prev => prev.map((v, i) => i === index ? { ...v, description } : v))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader title="Organization Profile" />

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Bio Tab */}
      {activeTab === 'bio' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Company Logo */}
                <div className="space-y-2">
                  <Label htmlFor="logo">Upload company logo</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="h-16 w-16 rounded-lg overflow-hidden border border-border flex items-center justify-center bg-muted/50">
                        <Image
                          src={logoPreview}
                          alt="Company logo"
                          width={64}
                          height={64}
                          className="h-full w-full object-contain"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-lg border border-border flex items-center justify-center bg-muted/50">
                        <Logo className="h-8 w-8 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="logo"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </Button>
                      <p className="text-sm text-muted-foreground mt-1">No file chosen</p>
                    </div>
                  </div>
                </div>

                {/* Letterhead */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Letterhead</Label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="letterheadEmail">Contact email</Label>
                      <Input
                        id="letterheadEmail"
                        type="email"
                        {...register('letterheadEmail')}
                        placeholder="info@curacel.ai"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="letterheadPhone">Phone</Label>
                      <Input
                        id="letterheadPhone"
                        {...register('letterheadPhone')}
                        placeholder="+234 803 525 7749"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="letterheadWebsite">Website</Label>
                      <Input
                        id="letterheadWebsite"
                        type="url"
                        {...register('letterheadWebsite')}
                        placeholder="https://curacel.ai"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="letterheadAddress">Address</Label>
                      <Input
                        id="letterheadAddress"
                        {...register('letterheadAddress')}
                        placeholder="19B Lawson Adeyemi Street, Ikoyi, Lagos"
                      />
                    </div>
                  </div>
                </div>

                {/* Organization Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Organization name</Label>
                  <Input
                    id="name"
                    {...register('name', { required: 'Organization name is required' })}
                    placeholder="Curacel"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                {/* One Sentence Description */}
                <div className="space-y-2">
                  <Label htmlFor="oneSentenceDescription">
                    Describe your company in one sentence
                  </Label>
                  <Input
                    id="oneSentenceDescription"
                    {...register('oneSentenceDescription')}
                    placeholder="Curacel is an insurtech infrastructure company that helps insurers & partners in Africa and other emerging."
                  />
                </div>

                {/* Career Page URL */}
                <div className="space-y-2">
                  <Label htmlFor="careerPageUrl">Organization career page url</Label>
                  <Input
                    id="careerPageUrl"
                    type="url"
                    {...register('careerPageUrl')}
                    placeholder="https://curacel.ai/careers/curacel-4b1b1f8a1e"
                  />
                </div>

                {/* Detailed Description */}
                <div className="space-y-2">
                  <Label htmlFor="detailedDescription">Tell us more about your company</Label>
                  <p className="text-sm text-muted-foreground">
                    Here is your chance to wax lyrical about your company and why people should join your team.
                  </p>
                  <Controller
                    name="detailedDescription"
                    control={control}
                    render={({ field }) => (
                      <RichTextEditor
                        value={field.value || ''}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Enter detailed company description..."
                        className="min-h-[200px]"
                      />
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || updateOrganization.isPending}>
              {isSubmitting || updateOrganization.isPending ? 'Updating...' : 'Update organization profile'}
            </Button>
          </div>
        </form>
      )}

      {/* Vision & Values Tab */}
      {activeTab === 'vision-values' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-5 border-b">
              <h2 className="text-lg font-semibold">Company Values (PRESS)</h2>
              <p className="text-sm text-muted-foreground">Define the core values that guide your hiring decisions. These are used by AuntyPelz to evaluate cultural fit.</p>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {pressValues.map((value, i) => (
                <div key={i} className="flex gap-4 p-4 border border-border rounded-xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg flex items-center justify-center text-2xl font-bold flex-shrink-0">
                    {value.letter}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{value.name}</div>
                    <Textarea
                      rows={2}
                      value={value.description}
                      onChange={(e) => updatePressValue(i, e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>
              Save Values
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
