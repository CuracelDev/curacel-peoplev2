'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { formatDate } from '@/lib/utils'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

interface SignatureBlockFormData {
  signatoryName: string
  signatoryTitle: string
  signatureText: string
  signatureImageUrl: string
}

export default function SignaturesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: signatureBlocks, refetch } = trpc.signature.list.useQuery()
  const createSignature = trpc.signature.create.useMutation({
    onSuccess: () => {
      refetch()
      setIsDialogOpen(false)
      reset()
    },
  })
  const updateSignature = trpc.signature.update.useMutation({
    onSuccess: () => {
      refetch()
      setIsDialogOpen(false)
      setEditingId(null)
      reset()
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignatureBlockFormData>({
    defaultValues: {
      signatoryName: '',
      signatoryTitle: '',
      signatureText: '',
      signatureImageUrl: '',
    },
  })

  const handleEdit = (block: NonNullable<typeof signatureBlocks>[0]) => {
    setEditingId(block.id)
    setValue('signatoryName', block.signatoryName)
    setValue('signatoryTitle', block.signatoryTitle)
    setValue('signatureText', block.signatureText || '')
    setValue('signatureImageUrl', block.signatureImageUrl || '')
    setIsDialogOpen(true)
  }

  const handleNew = () => {
    setEditingId(null)
    reset()
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: SignatureBlockFormData) => {
    if (editingId) {
      await updateSignature.mutateAsync({
        id: editingId,
        signatoryName: data.signatoryName,
        signatoryTitle: data.signatoryTitle,
        signatureText: data.signatureText || undefined,
        signatureImageUrl: data.signatureImageUrl || undefined,
      })
    } else {
      await createSignature.mutateAsync({
        signatoryName: data.signatoryName,
        signatoryTitle: data.signatoryTitle,
        signatureText: data.signatureText || undefined,
        signatureImageUrl: data.signatureImageUrl || undefined,
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // For now, we'll just use a data URL. In production, upload to S3/Cloudinary/etc.
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setValue('signatureImageUrl', result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Signature blocks"
        actions={
          <Button onClick={handleNew}>
            New signature block
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-6 font-semibold text-gray-900">Signatory name</th>
                  <th className="text-left p-6 font-semibold text-gray-900">Signatory title</th>
                  <th className="text-left p-6 font-semibold text-gray-900">Date added</th>
                  <th className="text-right p-6 font-semibold text-gray-900"></th>
                </tr>
              </thead>
              <tbody>
                {signatureBlocks?.map((block) => (
                  <tr key={block.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-6 text-gray-900">{block.signatoryName}</td>
                    <td className="p-6 text-gray-900">{block.signatoryTitle}</td>
                    <td className="p-6 text-gray-600">{formatDate(block.createdAt)}</td>
                    <td className="p-6 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(block)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4 text-gray-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!signatureBlocks || signatureBlocks.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-gray-500">
                      No signature blocks yet. Click &quot;New signature block&quot; to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit signature block' : 'Add a signature block'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the signature block details below.'
                : 'Create a new signature block for use in offer letters and contracts.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="signatoryName" className="text-sm font-medium">
                Signatory name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="signatoryName"
                {...register('signatoryName', { required: 'Signatory name is required' })}
                placeholder="Signatory first and last name."
                className="mt-1"
              />
              {errors.signatoryName && (
                <p className="text-sm text-red-500 mt-1">{errors.signatoryName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="signatoryTitle" className="text-sm font-medium">
                Signatory title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="signatoryTitle"
                {...register('signatoryTitle', { required: 'Signatory title is required' })}
                placeholder="Job title of the signatory."
                className="mt-1"
              />
              {errors.signatoryTitle && (
                <p className="text-sm text-red-500 mt-1">{errors.signatoryTitle.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="signatureText" className="text-sm font-medium">
                Signature <span className="text-red-500">*</span>
              </Label>
              <Input
                id="signatureText"
                {...register('signatureText', { required: 'Signature is required' })}
                placeholder="Enter the signatory's full name as signature"
                className="mt-1 italic font-script"
                style={{ fontFamily: 'cursive' }}
              />
              {errors.signatureText && (
                <p className="text-sm text-red-500 mt-1">{errors.signatureText.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="signatureImage" className="text-sm font-medium">
                Upload signature image
              </Label>
              <div className="mt-1">
                <input
                  type="file"
                  id="signatureImage"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('signatureImage')?.click()}
                  >
                    Choose File
                  </Button>
                  <span className="text-sm text-gray-500">
                    {watch('signatureImageUrl') ? 'File chosen' : 'No file chosen'}
                  </span>
                </div>
                {watch('signatureImageUrl') && (
                  <div className="mt-2">
                    <Image
                      src={watch('signatureImageUrl')}
                      alt="Signature preview"
                      width={320}
                      height={128}
                      className="h-auto w-auto max-h-32 border border-gray-200 rounded"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-600 space-y-2">
              <p>
                By clicking the button below: I certify that I consent to conduct all affairs
                relating to the signature above electronically. I adopt the above electronic
                signature as my signature, and hereby electronically sign the documents in which
                it is used. I acknowledge that I have accessed, have read and hereby agree to the
                Curacel&apos;s Terms of Service, and that I authorize the Curacel services, in
                the manner designated therein, to process the documents and signatures provided
                herewith and to create, store, and communicate electronic records of the documents
                listed above.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingId(null)
                  reset()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSignature.isPending || updateSignature.isPending}
              >
                {createSignature.isPending || updateSignature.isPending
                  ? 'Creating...'
                  : editingId
                    ? 'Update signature block'
                    : 'Create signature block'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
