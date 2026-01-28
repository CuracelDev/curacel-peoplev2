'use client'

import { Dialog, DialogContent } from './dialog'
import { X } from 'lucide-react'
import { Button } from './button'
import Image from 'next/image'

interface ImagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  imageAlt: string
}

export function ImagePreviewDialog({
  open,
  onOpenChange,
  imageSrc,
  imageAlt,
}: ImagePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={1200}
            height={800}
            className="w-full h-auto max-h-[90vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
