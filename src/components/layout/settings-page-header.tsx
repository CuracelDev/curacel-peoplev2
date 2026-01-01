import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SettingsPageHeader({
  title,
  description,
  actions,
  titleClassName,
  icon,
  backHref = '/settings',
}: {
  title: string
  description?: string
  actions?: ReactNode
  titleClassName?: string
  icon?: ReactNode
  backHref?: string
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        {icon && (
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className={titleClassName || 'text-xl font-semibold text-foreground'}>{title}</h1>
          {description ? <p className="text-muted-foreground mt-1">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
