'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { trpc } from '@/lib/trpc-client'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  FileText,
  UserPlus,
  UserMinus,
  Bot,
  Settings,
  Plug,
  LogOut,
  Briefcase,
  UserSearch,
  FileSignature,
  X,
  BarChart3,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Calendar,
  ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'

type BadgeKey = 'openJobs' | 'activeCandidates' | 'scheduledInterviews' | 'pendingAssessments' | 'activeEmployees' | 'pendingContracts' | 'inProgressOnboarding' | 'inProgressOffboarding'

type NavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  badgeKey?: BadgeKey
}

type NavSection = {
  title: string
  items: NavItem[]
  collapsible?: boolean
  defaultCollapsed?: boolean
}

const navigationSections: NavSection[] = [
  {
    title: '',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'HIRING',
    items: [
      { name: 'Jobs', href: '/hiring/positions', icon: Briefcase, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'], badgeKey: 'openJobs' },
      { name: 'Candidates', href: '/hiring/candidates', icon: UserSearch, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'], badgeKey: 'activeCandidates' },
      { name: 'Interviews', href: '/hiring/interviews', icon: Calendar, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'], badgeKey: 'scheduledInterviews' },
      { name: 'Assessments', href: '/hiring/assessments', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'], badgeKey: 'pendingAssessments' },
    ],
  },
  {
    title: 'OFFER',
    items: [
      { name: 'Contracts', href: '/contracts', icon: FileSignature, roles: ['SUPER_ADMIN', 'HR_ADMIN'], badgeKey: 'pendingContracts' },
    ],
  },
  {
    title: 'PEOPLE',
    items: [
      { name: 'Employees', href: '/employees', icon: Users, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'], badgeKey: 'activeEmployees' },
      { name: 'Onboarding', href: '/onboarding', icon: UserPlus, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'], badgeKey: 'inProgressOnboarding' },
      { name: 'Offboarding', href: '/offboarding', icon: UserMinus, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'], badgeKey: 'inProgressOffboarding' },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { name: 'Integrations', href: '/integrations', icon: Plug, roles: ['SUPER_ADMIN', 'IT_ADMIN'] },
      { name: 'Administration', href: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'] },
    ],
  },
  {
    title: 'ANALYTICS',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { name: 'Hiring', href: '/analytics', icon: TrendingUp, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Employees', href: '/analytics/employees', icon: Users, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
    ],
  },
]

export function Sidebar({
  collapsed,
  mobileOpen = false,
  onMobileClose,
}: {
  collapsed: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'EMPLOYEE'

  // Track collapsed state for collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navigationSections.forEach(section => {
      if (section.collapsible && section.defaultCollapsed) {
        initial[section.title] = true
      }
    })
    return initial
  })

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  // Fetch sidebar counts for all badges
  const { data: sidebarCounts } = trpc.dashboard.getSidebarCounts.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  })

  const filteredSections = navigationSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.roles.includes(userRole)),
    }))
    .filter(section => section.items.length > 0)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-200 flex flex-col',
        // Desktop: show based on collapsed state
        'hidden lg:flex',
        collapsed ? 'lg:w-16' : 'lg:w-56',
        // Mobile: show as overlay when mobileOpen
        mobileOpen && 'flex w-[85vw] max-w-72'
      )}
    >
      <div className={cn('flex h-14 items-center border-b border-border flex-shrink-0 justify-between', collapsed ? 'px-2' : 'px-4')}>
        <div className="flex items-center">
          <Logo className="h-8 w-8" />
          {(!collapsed || mobileOpen) && (
            <span className="ml-3 flex items-center gap-2 text-lg font-semibold text-primary whitespace-nowrap">
              PeopleOS
              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">v2</span>
            </span>
          )}
        </div>
        {mobileOpen && (
          <Button variant="ghost" size="icon" onClick={onMobileClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto py-3', collapsed && !mobileOpen ? 'px-1' : 'px-2')}>
        {filteredSections.map((section, sectionIndex) => {
          const isSectionCollapsed = section.collapsible && collapsedSections[section.title]
          const isAnySectionItemActive = section.items.some(item =>
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          )

          return (
            <div key={section.title || `section-${sectionIndex}`} className={cn(sectionIndex > 0 && 'mt-6')}>
              {section.title && (!collapsed || mobileOpen) && (
                section.collapsible ? (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-3 mb-2 text-[11px] font-semibold text-muted-foreground tracking-wider hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {section.title}
                    </span>
                    {isSectionCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : (
                  <h3 className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground tracking-wider">
                    {section.title}
                  </h3>
                )
              )}
              {section.title && collapsed && !mobileOpen && sectionIndex > 0 && (
                <div className="mx-2 mb-2 border-t border-border" />
              )}
              {(!section.collapsible || !isSectionCollapsed) && (
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    // For /analytics route, only match exact path to avoid both Hiring and Employees appearing selected
                    const isActive = pathname === item.href ||
                      (item.href !== '/dashboard' && item.href !== '/analytics' && pathname.startsWith(item.href))
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                            isActive
                              ? 'bg-primary text-white'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                            collapsed && !mobileOpen && 'justify-center px-2'
                          )}
                        >
                          <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-white')} />
                          {(!collapsed || mobileOpen) && (
                            <>
                              <span className="flex-1">{item.name}</span>
                              {item.badgeKey && sidebarCounts && sidebarCounts[item.badgeKey] > 0 && (
                                <span className={cn(
                                  'flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-medium',
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-primary text-white'
                                )}>
                                  {sidebarCounts[item.badgeKey]}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}

        {/* AuntyPelz - Special styling */}
        <div className="mt-6">
          <div className="mx-2 mb-2 border-t border-border" />
          <Link
            href="/ai-agent"
            className={cn(
              'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
              pathname === '/ai-agent' || pathname.startsWith('/ai-agent/')
                ? 'bg-primary text-white'
                : 'bg-primary/10 text-primary hover:bg-primary hover:text-white',
              collapsed && !mobileOpen && 'justify-center px-2'
            )}
            title="Open AuntyPelz"
          >
            <Bot className="h-5 w-5 flex-shrink-0" />
            {(!collapsed || mobileOpen) && <span>AuntyPelz</span>}
          </Link>
        </div>
      </nav>

      {/* My Profile dropdown */}
      <div className={cn('flex-shrink-0 border-t border-border', collapsed && !mobileOpen ? 'p-2' : 'p-3')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                pathname === '/profile'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                collapsed && !mobileOpen && 'justify-center px-2'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {getInitials(session?.user?.name || 'U')}
                </AvatarFallback>
              </Avatar>
              {(!collapsed || mobileOpen) && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{session?.user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start" side="top">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {session?.user?.role?.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
