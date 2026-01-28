'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

import Image from 'next/image'

interface DisabledPortalProps {
  portalName?: string
  companyName?: string
  logoUrl?: string
  supportEmail?: string
}

export function DisabledPortal({
  portalName = 'Portal',
  companyName = 'Company',
  logoUrl,
  supportEmail,
}: DisabledPortalProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        {logoUrl ? (
          <Image src={logoUrl} alt={companyName} width={200} height={48} className="h-12 w-auto mx-auto" />
        ) : (
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-primary font-bold text-xl">
              {companyName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Icon */}
        <div className="bg-amber-100 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-amber-600" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            {portalName} Temporarily Unavailable
          </h1>
          <p className="text-gray-600">
            This portal is currently not available. Please contact support if you believe this is an error.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {supportEmail && (
            <Button
              variant="default"
              className="w-full"
              onClick={() => window.location.href = `mailto:${supportEmail}`}
            >
              Contact Support
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
