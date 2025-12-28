'use client'

import { useState, useRef } from 'react'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Upload } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { Logo } from '@/components/ui/logo'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

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
  googleWorkspaceTransferToEmail: string | null
}

export default function OrganizationProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  
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
      googleWorkspaceTransferToEmail: organization?.googleWorkspaceTransferToEmail || '',
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
      setValue('googleWorkspaceTransferToEmail', organization.googleWorkspaceTransferToEmail || '')
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
          googleWorkspaceTransferToEmail: data.googleWorkspaceTransferToEmail || null,
        })
    } catch (error) {
      console.error('Failed to update organization:', error)
    }
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
      <SettingsPageHeader title="Update Curacel profile" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Company Logo */}
              <div className="space-y-2">
                <Label htmlFor="logo">Upload company logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="h-16 w-16 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center bg-gray-50">
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
                    <div className="h-16 w-16 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
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
                    <p className="text-sm text-gray-500 mt-1">No file chosen</p>
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

              {/* Google Workspace */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Google Workspace offboarding</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="googleWorkspaceTransferToEmail">Default file transfer owner</Label>
                    <Input
                      id="googleWorkspaceTransferToEmail"
                      type="email"
                      {...register('googleWorkspaceTransferToEmail')}
                      placeholder="admin@curacel.ai"
                    />
                    <p className="text-xs text-gray-500">
                      Used when transferring Drive ownership during offboarding.
                    </p>
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
                <p className="text-sm text-gray-500">
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
    </div>
  )
}
