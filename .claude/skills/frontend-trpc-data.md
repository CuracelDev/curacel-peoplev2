# Frontend tRPC Data Fetching

tRPC patterns for data fetching, mutations, and state management in Curacel People.

---

## Setup

### Client Configuration

```tsx
// src/lib/trpc-client.ts
'use client'

import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/server/routers/_app'

export const trpc = createTRPCReact<AppRouter>()
```

### Provider Setup

```tsx
// src/components/providers.tsx
'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import { trpc } from '@/lib/trpc-client'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    })
  )

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
```

---

## Queries

### Basic Query

```tsx
'use client'

import { trpc } from '@/lib/trpc-client'

export default function EmployeeList() {
  const { data, isLoading, error } = trpc.employee.list.useQuery()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <ul>
      {data?.employees.map(emp => (
        <li key={emp.id}>{emp.fullName}</li>
      ))}
    </ul>
  )
}
```

### Query with Parameters

```tsx
const { data } = trpc.employee.list.useQuery({
  status: 'ACTIVE',
  department: 'Engineering',
  page: 1,
  limit: 20,
})
```

### Query with Dynamic Parameters

```tsx
const [filter, setFilter] = useState('ACTIVE')
const [page, setPage] = useState(1)

const { data, isLoading } = trpc.employee.list.useQuery({
  status: filter,
  page,
  limit: 20,
})
```

### Query by ID

```tsx
const { id } = useParams()

const { data: employee, isLoading } = trpc.employee.getById.useQuery(
  { id: id as string },
  { enabled: !!id }  // Only run if id exists
)
```

### Query Options

```tsx
const { data } = trpc.dashboard.getSidebarCounts.useQuery(undefined, {
  refetchInterval: 30000,    // Refetch every 30 seconds
  staleTime: 10000,          // Consider fresh for 10 seconds
  refetchOnWindowFocus: false,
  enabled: isLoggedIn,       // Conditional fetching
  retry: 3,                  // Retry failed requests
  onSuccess: (data) => {
    console.log('Data loaded:', data)
  },
  onError: (error) => {
    console.error('Error:', error)
  },
})
```

---

## Mutations

### Basic Mutation

```tsx
'use client'

import { trpc } from '@/lib/trpc-client'

export default function CreateEmployee() {
  const createEmployee = trpc.employee.create.useMutation()

  const handleSubmit = async (formData: FormData) => {
    try {
      const result = await createEmployee.mutateAsync({
        fullName: formData.get('name') as string,
        email: formData.get('email') as string,
        department: formData.get('department') as string,
      })
      console.log('Created:', result)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button disabled={createEmployee.isPending}>
        {createEmployee.isPending ? 'Creating...' : 'Create'}
      </Button>
    </form>
  )
}
```

### Mutation with Callbacks

```tsx
const updateEmployee = trpc.employee.update.useMutation({
  onSuccess: (data) => {
    toast.success('Employee updated!')
    router.push('/employees')
  },
  onError: (error) => {
    toast.error(error.message)
  },
  onSettled: () => {
    // Always runs after success or error
    setIsSubmitting(false)
  },
})
```

### Mutation with Cache Invalidation

```tsx
const utils = trpc.useUtils()

const deleteEmployee = trpc.employee.delete.useMutation({
  onSuccess: () => {
    // Invalidate and refetch employee list
    utils.employee.list.invalidate()
  },
})
```

### Optimistic Updates

```tsx
const utils = trpc.useUtils()

const toggleStatus = trpc.employee.toggleStatus.useMutation({
  onMutate: async ({ id, status }) => {
    // Cancel outgoing queries
    await utils.employee.list.cancel()

    // Snapshot current data
    const previousData = utils.employee.list.getData()

    // Optimistically update
    utils.employee.list.setData(undefined, (old) => {
      if (!old) return old
      return {
        ...old,
        employees: old.employees.map(emp =>
          emp.id === id ? { ...emp, status } : emp
        ),
      }
    })

    return { previousData }
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previousData) {
      utils.employee.list.setData(undefined, context.previousData)
    }
  },
  onSettled: () => {
    // Refetch after mutation
    utils.employee.list.invalidate()
  },
})
```

---

## Common Patterns

### Loading States

```tsx
const { data, isLoading, isFetching } = trpc.example.list.useQuery()

// isLoading: true on initial load only
// isFetching: true on initial load AND background refetches

if (isLoading) {
  return <FullPageSpinner />
}

return (
  <div>
    {isFetching && <TopProgressBar />}
    {/* Content */}
  </div>
)
```

### Error Handling

```tsx
const { data, error, isError } = trpc.example.list.useQuery()

if (isError) {
  return (
    <div className="text-red-600">
      Error: {error.message}
    </div>
  )
}
```

### Empty States

```tsx
const { data, isLoading } = trpc.employee.list.useQuery()

if (isLoading) return <Spinner />

if (!data?.employees.length) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">No employees found</p>
      <Button onClick={() => router.push('/employees/new')}>
        Add Employee
      </Button>
    </div>
  )
}
```

### Pagination

```tsx
const [page, setPage] = useState(1)
const limit = 20

const { data, isLoading } = trpc.employee.list.useQuery({
  page,
  limit,
})

return (
  <div>
    {/* List */}
    {data?.employees.map(emp => (
      <EmployeeCard key={emp.id} employee={emp} />
    ))}

    {/* Pagination */}
    {data && data.pages > 1 && (
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">
          Page {page} of {data.pages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.pages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    )}
  </div>
)
```

### Filtering

```tsx
const [statusFilter, setStatusFilter] = useState<string>('')
const [searchQuery, setSearchQuery] = useState('')

const { data } = trpc.employee.list.useQuery({
  status: statusFilter || undefined,
  search: searchQuery || undefined,
})

return (
  <div>
    <div className="flex gap-4 mb-4">
      <Select
        value={statusFilter || 'all'}
        onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="INACTIVE">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>

    {/* Results */}
  </div>
)
```

### Multiple Queries

```tsx
// Parallel queries
const { data: employees } = trpc.employee.list.useQuery()
const { data: departments } = trpc.department.list.useQuery()
const { data: stats } = trpc.dashboard.getStats.useQuery()

// All queries run in parallel automatically
```

### Dependent Queries

```tsx
const { data: employee } = trpc.employee.getById.useQuery({ id })

// Only fetch when employee data is available
const { data: department } = trpc.department.getById.useQuery(
  { id: employee?.departmentId! },
  { enabled: !!employee?.departmentId }
)
```

---

## Form Integration

### Form with Mutation

```tsx
'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'

export default function CreateJobForm() {
  const router = useRouter()
  const createJob = trpc.job.create.useMutation()

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    employmentType: 'full-time',
  })

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const job = await createJob.mutateAsync(formData)
      router.push(`/jobs/${job.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <Input
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Job Title"
      />

      <Button type="submit" disabled={createJob.isPending}>
        {createJob.isPending ? 'Creating...' : 'Create Job'}
      </Button>
    </form>
  )
}
```

---

## Server-Side Routers

### Router Definition

```tsx
// src/server/routers/employee.ts
import { router, protectedProcedure } from '../trpc'
import { z } from 'zod'

export const employeeRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { status, page, limit } = input

      const employees = await ctx.db.employee.findMany({
        where: status ? { status } : undefined,
        skip: (page - 1) * limit,
        take: limit,
      })

      const total = await ctx.db.employee.count({
        where: status ? { status } : undefined,
      })

      return {
        employees,
        total,
        pages: Math.ceil(total / limit),
      }
    }),

  create: protectedProcedure
    .input(z.object({
      fullName: z.string().min(1),
      email: z.string().email(),
      department: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.employee.create({
        data: input,
      })
    }),
})
```

### App Router

```tsx
// src/server/routers/_app.ts
import { router } from '../trpc'
import { employeeRouter } from './employee'
import { jobRouter } from './job'
import { dashboardRouter } from './dashboard'

export const appRouter = router({
  employee: employeeRouter,
  job: jobRouter,
  dashboard: dashboardRouter,
})

export type AppRouter = typeof appRouter
```

---

## Best Practices

1. **Use type-safe queries** - tRPC provides end-to-end type safety
2. **Handle all states** - Loading, error, empty, and success
3. **Invalidate cache appropriately** - After mutations that affect lists
4. **Use optimistic updates** - For better UX on simple mutations
5. **Batch related queries** - tRPC batches by default
6. **Set appropriate staleTime** - Balance freshness vs performance

---

*Version: 1.0 | Last Updated: December 2024*
