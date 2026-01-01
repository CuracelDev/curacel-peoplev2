'use client'

import { useSearchParams } from 'next/navigation'
import { Eye, X } from 'lucide-react'
import { useState } from 'react'

export function PreviewBanner() {
  const searchParams = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const [dismissed, setDismissed] = useState(false)

  if (!isPreview || dismissed) return null

  return (
    <div className="bg-amber-100 border-b border-amber-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-800">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">
            Preview Mode - This is how the page appears to external users
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800 p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
