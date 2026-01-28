# Frontend Next.js Patterns

Next.js 14 App Router patterns and conventions used in Curacel People.

---

## Project Structure

```
src/
├── app/
│   ├── (authenticated)/     # Protected routes (require login)
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── recruiting/
│   │   └── settings/
│   ├── (public)/            # Public routes (no auth required)
│   │   ├── careers/
│   │   └── recruiter/
│   ├── api/                 # API routes
│   │   ├── trpc/
│   │   └── auth/
│   ├── auth/                # Auth pages (signin, signup)
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Layout components (sidebar, header)
│   └── analytics/           # Feature-specific components
├── lib/                     # Utilities and configurations
│   ├── trpc-client.ts
│   ├── utils.ts
│   └── responsive.ts
└── server/                  # Server-side code
    └── routers/             # tRPC routers
```

---

## Page Components

### Basic Page Structure

```tsx
// src/app/(authenticated)/example/page.tsx
'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ExamplePage() {
  const [filter, setFilter] = useState('')

  // Data fetching with tRPC
  const { data, isLoading } = trpc.example.list.useQuery({ filter })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with action button */}
      <div className="flex items-center justify-end">
        <Button>Create New</Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Content here */}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Dynamic Route Page

```tsx
// src/app/(authenticated)/example/[id]/page.tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'

export default function ExampleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data, isLoading } = trpc.example.getById.useQuery({ id })

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!data) {
    return <NotFound />
  }

  return (
    <div>
      <h1>{data.title}</h1>
      {/* Detail content */}
    </div>
  )
}
```

---

## Route Groups

### Authenticated Routes

```tsx
// src/app/(authenticated)/layout.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { AuthShell } from '@/components/layout/auth-shell'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return <AuthShell>{children}</AuthShell>
}
```

### Public Routes

```tsx
// src/app/(public)/layout.tsx
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
```

---

## Navigation Patterns

### Using Next.js Link

```tsx
import Link from 'next/link'

// Basic link
<Link href="/dashboard">Dashboard</Link>

// Link with dynamic route
<Link href={`/employees/${employee.id}`}>
  View Employee
</Link>

// Link styled as button
<Link href="/recruiting/positions/new">
  <Button>Create Job</Button>
</Link>
```

### Programmatic Navigation

```tsx
'use client'

import { useRouter } from 'next/navigation'

export default function Example() {
  const router = useRouter()

  const handleSubmit = async () => {
    await saveData()
    router.push('/success')  // Navigate after action
  }

  const handleBack = () => {
    router.back()  // Go back in history
  }

  return (
    <Button onClick={handleSubmit}>Submit</Button>
  )
}
```

### Getting Route Parameters

```tsx
'use client'

import { useParams, useSearchParams, usePathname } from 'next/navigation'

export default function Example() {
  // Dynamic route params: /users/[id] -> { id: '123' }
  const params = useParams()
  const userId = params.id as string

  // Query params: /search?q=hello -> 'hello'
  const searchParams = useSearchParams()
  const query = searchParams.get('q')

  // Current pathname: '/users/123'
  const pathname = usePathname()

  return <div>...</div>
}
```

---

## Loading States

### Page Loading

```tsx
// src/app/(authenticated)/example/loading.tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
```

### Component Loading

```tsx
const { data, isLoading } = trpc.example.list.useQuery()

if (isLoading) {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
```

### Skeleton Loading

```tsx
function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Error Handling

### Error Boundary

```tsx
// src/app/(authenticated)/example/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-gray-500 mb-4">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

### Not Found

```tsx
// src/app/(authenticated)/example/not-found.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Not Found
      </h2>
      <p className="text-gray-500 mb-4">
        The resource you're looking for doesn't exist.
      </p>
      <Link href="/">
        <Button variant="outline">Go Home</Button>
      </Link>
    </div>
  )
}
```

---

## Client vs Server Components

### Client Components (use 'use client')

Use for:
- Interactive UI (onClick, onChange, etc.)
- useState, useEffect hooks
- Browser APIs
- tRPC queries/mutations

```tsx
'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'

export default function InteractivePage() {
  const [count, setCount] = useState(0)
  const { data } = trpc.example.get.useQuery()

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}
```

### Server Components (default)

Use for:
- Static content
- Data fetching without interactivity
- SEO-critical pages
- Direct database access

```tsx
// No 'use client' directive
import { db } from '@/lib/db'

export default async function StaticPage() {
  const data = await db.example.findMany()

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

---

## API Routes

### tRPC API Route

```tsx
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server/routers/_app'
import { createContext } from '@/server/context'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  })

export { handler as GET, handler as POST }
```

### Custom API Route

```tsx
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  // Handle request
  const data = await fetchData(id)

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Handle request
  const result = await saveData(body)

  return NextResponse.json(result, { status: 201 })
}
```

---

## Metadata

### Static Metadata

```tsx
// src/app/(authenticated)/dashboard/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard - Curacel People',
  description: 'View your HR dashboard',
}

export default function DashboardPage() {
  return <div>...</div>
}
```

### Dynamic Metadata

```tsx
// src/app/(authenticated)/employees/[id]/page.tsx
import { Metadata } from 'next'

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const employee = await getEmployee(params.id)

  return {
    title: `${employee.name} - Curacel People`,
    description: `Employee profile for ${employee.name}`,
  }
}
```

---

## Common Patterns

### Conditional Rendering Based on Auth

```tsx
'use client'

import { useSession } from 'next-auth/react'

export default function Example() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <LoadingSpinner />
  }

  if (!session) {
    return <SignInPrompt />
  }

  // Check role
  if (session.user.role !== 'SUPER_ADMIN') {
    return <AccessDenied />
  }

  return <AdminContent />
}
```

### Tab-Based Navigation

```tsx
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export default function TabsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get('tab') || 'overview'

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div>
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab('overview')}
          className={currentTab === 'overview' ? 'border-b-2 border-primary' : ''}
        >
          Overview
        </button>
        <button
          onClick={() => setTab('details')}
          className={currentTab === 'details' ? 'border-b-2 border-primary' : ''}
        >
          Details
        </button>
      </div>

      {currentTab === 'overview' && <OverviewContent />}
      {currentTab === 'details' && <DetailsContent />}
    </div>
  )
}
```

---

## Best Practices

1. **Use 'use client' only when needed** - Default to server components
2. **Colocate loading/error states** - Place loading.tsx and error.tsx near pages
3. **Use route groups** - Organize routes with (groupName) folders
4. **Leverage parallel routes** - For complex layouts with independent sections
5. **Cache appropriately** - Use revalidate options for data fetching
6. **Handle edge cases** - Always handle loading, error, and empty states

---

*Version: 1.0 | Last Updated: December 2024*
