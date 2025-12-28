'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
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
  HelpCircle,
  FileSignature,
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
import { getInitials } from '@/lib/utils'

type NavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  badge?: number
}

type NavSection = {
  title: string
  items: NavItem[]
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
      { name: 'Jobs', href: '/recruiting/positions', icon: Briefcase, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'], badge: 5 },
      { name: 'Candidates', href: '/recruiting/candidates', icon: UserSearch, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'], badge: 24 },
      { name: 'Question Bank', href: '/recruiting/questions', icon: HelpCircle, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'OFFER',
    items: [
      { name: 'Contracts', href: '/contracts', icon: FileSignature, roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
    ],
  },
  {
    title: 'PEOPLE',
    items: [
      { name: 'Employees', href: '/employees', icon: Users, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'] },
      { name: 'Onboarding', href: '/onboarding', icon: UserPlus, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'] },
      { name: 'Offboarding', href: '/offboarding', icon: UserMinus, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'] },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { name: 'Integrations', href: '/integrations', icon: Plug, roles: ['SUPER_ADMIN', 'IT_ADMIN'] },
      { name: 'Administration', href: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'] },
    ],
  },
]

export function Sidebar({
  collapsed,
}: {
  collapsed: boolean
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'EMPLOYEE'

  const filteredSections = navigationSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.roles.includes(userRole)),
    }))
    .filter(section => section.items.length > 0)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 bg-white border-r border-border transition-all duration-200 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className={cn('flex h-16 items-center border-b border-border flex-shrink-0', collapsed ? 'px-3' : 'px-6')}>
        <Logo className="h-8 w-8" />
        {!collapsed && (
          <span className="ml-3 flex items-center gap-2 text-lg font-semibold text-primary whitespace-nowrap">
            Curacel People
            <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">v2</span>
          </span>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        {filteredSections.map((section, sectionIndex) => (
          <div key={section.title || `section-${sectionIndex}`} className={cn(sectionIndex > 0 && 'mt-6')}>
            {section.title && !collapsed && (
              <h3 className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground tracking-wider">
                {section.title}
              </h3>
            )}
            {section.title && collapsed && sectionIndex > 0 && (
              <div className="mx-2 mb-2 border-t border-border" />
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-white')} />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.name}</span>
                          {item.badge !== undefined && (
                            <span className={cn(
                              'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium',
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-primary text-white'
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {/* Blue AI - Special styling */}
        <div className="mt-6">
          {!collapsed && (
            <div className="mx-2 mb-2 border-t border-border" />
          )}
          {collapsed && (
            <div className="mx-2 mb-2 border-t border-border" />
          )}
          <Link
            href="/ai-agent"
            className={cn(
              'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              pathname === '/ai-agent' || pathname.startsWith('/ai-agent/')
                ? 'bg-primary text-white'
                : 'bg-primary/10 text-primary hover:bg-primary hover:text-white',
              collapsed && 'justify-center px-2'
            )}
            title="Open Blue AI"
          >
            <Bot className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Blue AI</span>}
          </Link>
        </div>
      </nav>

      {/* My Profile dropdown */}
      <div className={cn('flex-shrink-0 border-t border-border', collapsed ? 'p-3' : 'p-4')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                pathname === '/profile'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                  {getInitials(session?.user?.name || 'U')}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
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
