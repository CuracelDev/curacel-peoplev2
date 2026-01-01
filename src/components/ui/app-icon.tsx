import Image from 'next/image'
import { Plug } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Centralized app icon configuration.
 *
 * IMPORTANT: When adding a new integration, add it here ONCE.
 * This is the single source of truth for all app icons across:
 * - Settings > Applications (list and detail pages)
 * - Integrations page
 * - Any other page that needs to display app icons
 */
export const APP_ICONS: Record<string, { src: string; alt: string }> = {
  GOOGLE_WORKSPACE: { src: '/logos/google-workspace.png', alt: 'Google Workspace' },
  SLACK: { src: '/logos/slack.png', alt: 'Slack' },
  BITBUCKET: { src: '/logos/bitbucket.png', alt: 'Bitbucket' },
  JIRA: { src: '/logos/jira.png', alt: 'Jira' },
  PASSBOLT: { src: '/logos/passbolt.png', alt: 'Passbolt' },
  HUBSPOT: { src: '/logos/hubspot.png', alt: 'HubSpot' },
  STANDUPNINJA: { src: '/logos/standupninja.png', alt: 'StandupNinja' },
  FIREFLIES: { src: '/logos/fireflies.png', alt: 'Fireflies.ai' },
  WEBFLOW: { src: '/logos/webflow.svg', alt: 'Webflow' },
  GITHUB: { src: '/logos/github.png', alt: 'GitHub' },
  NOTION: { src: '/logos/notion.png', alt: 'Notion' },
  FIGMA: { src: '/logos/figma.png', alt: 'Figma' },
  LINEAR: { src: '/logos/linear.png', alt: 'Linear' },
  CONFLUENCE: { src: '/logos/confluence.png', alt: 'Confluence' },
  // Add new integrations here - they will automatically appear everywhere
}

export type AppIconSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<AppIconSize, { container: string; icon: string; dimensions: number }> = {
  sm: { container: 'h-6 w-6', icon: 'h-6 w-6', dimensions: 24 },
  md: { container: 'h-8 w-8', icon: 'h-8 w-8', dimensions: 32 },
  lg: { container: 'h-10 w-10', icon: 'h-10 w-10', dimensions: 40 },
}

interface AppIconProps {
  type: string
  iconUrl?: string | null
  size?: AppIconSize
  className?: string
}

/**
 * Renders the appropriate icon for an app type.
 * Falls back to custom iconUrl if provided, or a generic plug icon.
 *
 * Usage:
 * ```tsx
 * <AppIcon type="SLACK" />
 * <AppIcon type="CUSTOM" iconUrl="/custom-icon.png" />
 * <AppIcon type="GOOGLE_WORKSPACE" size="lg" />
 * ```
 */
export function AppIcon({ type, iconUrl, size = 'md', className }: AppIconProps) {
  const { container, icon, dimensions } = sizeClasses[size]
  const iconConfig = APP_ICONS[type]

  if (iconConfig) {
    return (
      <Image
        src={iconConfig.src}
        alt={iconConfig.alt}
        width={dimensions}
        height={dimensions}
        className={cn(icon, 'object-contain', className)}
      />
    )
  }

  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt={type}
        width={dimensions}
        height={dimensions}
        className={cn(icon, 'object-contain', className)}
      />
    )
  }

  return <Plug className={cn(icon, 'text-muted-foreground', className)} />
}

/**
 * Helper function for contexts where a component can't be used directly.
 * Returns the icon configuration for a given app type.
 */
export function getAppIconConfig(type: string): { src: string; alt: string } | null {
  return APP_ICONS[type] || null
}
