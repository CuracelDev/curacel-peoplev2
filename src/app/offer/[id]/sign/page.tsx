'use client'

import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function OfferSigningPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const offerId = params.id as string
  const token = searchParams.get('token') || undefined

  const [signature, setSignature] = useState('')
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const {
    data: offer,
    isLoading,
    isError,
    refetch,
  } = trpc.offer.getPublicOffer.useQuery({ offerId, token }, { retry: false })

  const signOffer = trpc.offer.manualSign.useMutation({
    onSuccess: () => {
      toast.success('Offer signed successfully!')
      setAgreed(false)
      refetch()
    },
    onError: (error) => {
      console.error('Signing error:', error)
      toast.error(error.message || 'Failed to sign offer. Please try again.')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (isError || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-lg w-full shadow-sm">
          <CardHeader>
            <CardTitle>Offer not available</CardTitle>
            <CardDescription>We couldn&apos;t load this offer. Please check your link.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isSigned = offer.status === 'SIGNED'

  const handleSign = () => {
    if (!signature.trim() || !agreed) return
    signOffer.mutate({ offerId, signature: signature.trim(), signatureImage: signatureImage || undefined })
  }

  const handleFile = async (file?: File) => {
    setUploadError(null)
    if (!file) {
      setSignatureImage(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (PNG, JPG).')
      return
    }
    const maxSizeMb = 2
    if (file.size > maxSizeMb * 1024 * 1024) {
      setUploadError(`Max file size is ${maxSizeMb}MB.`)
      return
    }
    const buffer = await file.arrayBuffer()
    // Use btoa for browser-safe base64 conversion instead of Buffer
    const binary = String.fromCharCode(...new Uint8Array(buffer))
    const base64 = btoa(binary)
    const dataUrl = `data:${file.type};base64,${base64}`
    setSignatureImage(dataUrl)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Offer for {offer.candidateName}</CardTitle>
              <CardDescription>{offer.template.name}</CardDescription>
            </div>
            <Badge variant={isSigned ? 'default' : 'secondary'}>
              {isSigned ? 'Signed' : offer.status.toLowerCase()}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <p className="text-sm text-slate-600 mb-3">Review your offer below</p>
              {offer.renderedHtml ? (
                <div
                  className="prose prose-sm max-w-none border rounded-lg bg-card shadow-inner p-6"
                  dangerouslySetInnerHTML={{ __html: offer.renderedHtml }}
                />
              ) : (
                <div className="text-slate-500">No preview available.</div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Signature</p>
                <p className="text-sm text-slate-500">Type your full name to sign electronically.</p>
              </div>
              <Input
                placeholder="Full name"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                disabled={isSigned || signOffer.isPending}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  disabled={isSigned || signOffer.isPending}
                />
                I agree that this electronic signature has the same legal effect as a handwritten signature.
              </label>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Optional signature image</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  disabled={isSigned || signOffer.isPending}
                  className="text-sm"
                />
                {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                {signatureImage && (
                  <div className="border rounded-md p-2 inline-block bg-card">
                    <p className="text-xs text-slate-500 mb-1">Preview</p>
                    <Image
                      src={signatureImage}
                      alt="Signature preview"
                      width={320}
                      height={96}
                      className="h-auto w-auto max-h-24"
                      unoptimized
                    />
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSignatureImage(null)}
                        disabled={isSigned || signOffer.isPending}
                      >
                        Remove image
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {!isSigned ? (
                <Button
                  onClick={handleSign}
                  disabled={!signature.trim() || !agreed || signOffer.isPending}
                >
                  {signOffer.isPending ? 'Signing...' : 'Sign and submit'}
                </Button>
              ) : (
                <div className="text-sm text-success bg-success/10 border border-success/20 rounded-md p-3">
                  You have already signed this offer. Thank you!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
