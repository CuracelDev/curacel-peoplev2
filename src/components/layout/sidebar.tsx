'use client'

import { useState } from 'react'
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
  Sparkles,
  Briefcase,
  UserSearch,
  HelpCircle,
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
import { AssistantPanel } from '@/components/assistant/assistant-panel'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN', 'MANAGER'] },
  { name: 'Recruiting', href: '/recruiting', icon: UserSearch, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
  { name: 'Positions', href: '/recruiting/positions', icon: Briefcase, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
  { name: 'Employees', href: '/employees', icon: Users, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'] },
  { name: 'Contracts', href: '/contracts', icon: FileText, roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
  { name: 'Onboarding', href: '/onboarding', icon: UserPlus, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'] },
  { name: 'Offboarding', href: '/offboarding', icon: UserMinus, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'] },
  { name: 'Blue AI', href: '/ai-agent', icon: Bot, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'] },
  { name: 'Applications', href: '/integrations', icon: Plug, roles: ['SUPER_ADMIN', 'IT_ADMIN'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'] },
]

export function Sidebar({
  collapsed,
}: {
  collapsed: boolean
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'EMPLOYEE'
  const [assistantOpen, setAssistantOpen] = useState(false)

  const filteredNav = navigation.filter(item => item.roles.includes(userRole))

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 bg-white border-r border-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className={cn('flex h-16 items-center border-b border-border', collapsed ? 'px-3' : 'px-6')}>
        <Logo className="h-8 w-8" />
        {!collapsed && (
          <span className="ml-3 flex items-center gap-2 text-lg font-semibold text-primary whitespace-nowrap">
            Curacel People
            <span className="text-[9px] font-semibold text-slate-600">v0.1</span>
          </span>
        )}
      </div>

      <nav className={cn('mt-6', collapsed ? 'px-2' : 'px-3')}>
        <ul className="space-y-1">
          {filteredNav.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  {!collapsed && item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Assistant trigger + My Profile dropdown */}
      <div className={cn('absolute bottom-0 left-0 right-0 border-t border-border', collapsed ? 'p-3' : 'p-4')}>
        {/* Assistant button */}
        <button
          onClick={() => setAssistantOpen(true)}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2 mb-2 text-sm font-medium transition-all duration-200',
            'text-muted-foreground hover:bg-purple-50 hover:text-purple-600',
            collapsed && 'justify-center px-2'
          )}
          title="Open Blue AI"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && <span>Blue AI</span>}
        </button>

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

      {/* Assistant Panel */}
      <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />
    </aside>
  )
}
