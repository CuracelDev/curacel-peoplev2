import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SettingsPageHeader({
  title,
  description,
  actions,
  titleClassName,
}: {
  title: string
  description?: string
  actions?: ReactNode
  titleClassName?: string
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings" aria-label="Back to settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className={titleClassName || 'text-xl font-semibold text-foreground'}>{title}</h1>
          {description ? <p className="text-muted-foreground mt-1">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
