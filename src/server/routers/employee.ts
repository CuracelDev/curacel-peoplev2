import { z } from 'zod'
import { router, protectedProcedure, hrAdminProcedure, managerProcedure } from '@/lib/trpc'
import { TRPCError } from '@trpc/server'
import { logEmployeeEvent } from '@/lib/audit'
import { autoActivateEmployees } from '@/lib/employee-status'

const employeeCreateSchema = z.object({
  fullName: z.string().min(2),
  personalEmail: z.string().email(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  managerId: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR']).optional(),
  startDate: z.string().optional(),
  salaryAmount: z.number().optional(),
  salaryCurrency: z.string().optional(),
  contractType: z.enum(['PERMANENT', 'FIXED_TERM', 'CONTRACTOR', 'INTERN']).optional(),
})

const employeeUpdateSchema = z.object({
  id: z.string(),
  fullName: z.string().min(2).optional(),
  personalEmail: z.string().email().optional(),
  workEmail: z.string().email().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR']).optional(),
  status: z.enum(['CANDIDATE', 'OFFER_SENT', 'OFFER_SIGNED', 'HIRED_PENDING_START', 'ACTIVE', 'OFFBOARDING', 'EXITED']).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  salaryAmount: z.number().nullable().optional(),
  salaryCurrency: z.string().optional(),
  contractType: z.enum(['PERMANENT', 'FIXED_TERM', 'CONTRACTOR', 'INTERN']).nullable().optional(),
  addressStreet: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),
  addressPostal: z.string().nullable().optional(),
  addressCountry: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactRelation: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  emergencyContactEmail: z.string().nullable().optional(),
  meta: z.record(z.unknown()).optional(),
  profileImageUrl: z.string().nullable().optional(),
})

const selfUpdateSchema = z.object({
  addressStreet: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),
  addressPostal: z.string().nullable().optional(),
  addressCountry: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactRelation: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
})

export const employeeRouter = router({
  list: hrAdminProcedure
    .input(z.object({
      status: z.string().optional(),
      department: z.string().optional(),
      managerId: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      await autoActivateEmployees(ctx.prisma)
      const { status, department, managerId, search, page = 1, limit = 20 } = input || {}

      const where: any = {}

      if (status && status.trim()) where.status = status
      if (department && department.trim()) where.department = department
      if (managerId && managerId.trim()) where.managerId = managerId
      if (search && search.trim()) {
        where.OR = [
          { fullName: { contains: search.trim(), mode: 'insensitive' } },
          { personalEmail: { contains: search.trim(), mode: 'insensitive' } },
          { workEmail: { contains: search.trim(), mode: 'insensitive' } },
          { jobTitle: { contains: search.trim(), mode: 'insensitive' } },
        ]
      }

      const [employees, total] = await Promise.all([
        ctx.prisma.employee.findMany({
          where,
          include: {
            manager: { select: { id: true, fullName: true } },
            _count: { select: { directReports: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.employee.count({ where }),
      ])

      return {
        employees,
        total,
        pages: Math.ceil(total / limit),
      }
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      await autoActivateEmployees(ctx.prisma, id)
      const employee = await ctx.prisma.employee.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          manager: { select: { id: true, fullName: true, workEmail: true } },
          directReports: { select: { id: true, fullName: true, jobTitle: true, status: true } },
          offers: { orderBy: { createdAt: 'desc' }, take: 5 },
          appAccounts: { include: { app: true } },
          onboardingWorkflows: { orderBy: { createdAt: 'desc' }, take: 1, include: { tasks: true } },
          offboardingWorkflows: { orderBy: { createdAt: 'desc' }, take: 1, include: { tasks: true } },
        },
      })

      if (!employee) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' })
      }

      // Check access - HR can see all, managers can see their reports, employees can see themselves
      const user = ctx.user as { role: string; employeeId?: string }
      const canAccess = 
        user.role === 'SUPER_ADMIN' ||
        user.role === 'HR_ADMIN' ||
        user.role === 'IT_ADMIN' ||
        (user.role === 'MANAGER' && employee.managerId === user.employeeId) ||
        user.employeeId === employee.id

      if (!canAccess) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Hide sensitive fields for non-HR users
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_ADMIN') {
        return {
          ...employee,
          salaryAmount: null,
          salaryCurrency: null,
          contractType: null,
        }
      }

      return employee
    }),

  getMyProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.user as { employeeId?: string }
      
      if (!user.employeeId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No employee profile linked to your account' })
      }

      return ctx.prisma.employee.findUnique({
        where: { id: user.employeeId },
        include: {
          manager: { select: { id: true, fullName: true, workEmail: true } },
          appAccounts: { include: { app: true } },
        },
      })
    }),

  getDirectReports: managerProcedure
    .query(async ({ ctx }) => {
      const user = ctx.user as { employeeId?: string }
      
      if (!user.employeeId) {
        return []
      }

      return ctx.prisma.employee.findMany({
        where: { managerId: user.employeeId },
        include: {
          onboardingWorkflows: {
            where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
            take: 1,
            include: { tasks: { where: { status: { not: 'SUCCESS' } } } },
          },
        },
        orderBy: { fullName: 'asc' },
      })
    }),

  create: hrAdminProcedure
    .input(employeeCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const employee = await ctx.prisma.employee.create({
        data: {
          fullName: input.fullName,
          personalEmail: input.personalEmail,
          status: 'CANDIDATE',
          jobTitle: input.jobTitle,
          department: input.department,
          managerId: input.managerId,
          location: input.location,
          employmentType: input.employmentType,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          salaryAmount: input.salaryAmount,
          salaryCurrency: input.salaryCurrency,
          contractType: input.contractType,
        },
      })

      // Log event (non-blocking)
      try {
        const userId = (ctx.user as { id?: string })?.id
        if (userId) {
          await logEmployeeEvent({
            actorId: userId,
            action: 'EMPLOYEE_CREATED',
            employeeId: employee.id,
            metadata: { fullName: employee.fullName },
          })
        }
      } catch (error) {
        console.error('Failed to log employee creation event:', error)
        // Don't fail the mutation if audit logging fails
      }

      return employee
    }),

  update: hrAdminProcedure
    .input(employeeUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, meta, ...data } = input

      const existingEmployee = await ctx.prisma.employee.findUnique({ where: { id } })
      if (!existingEmployee) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const updateData: Record<string, unknown> = {}
      const existingMeta =
        existingEmployee.meta && typeof existingEmployee.meta === 'object' && !Array.isArray(existingEmployee.meta)
          ? (existingEmployee.meta as Record<string, unknown>)
          : {}
      const nextMeta: Record<string, unknown> = { ...existingMeta }
      let metaUpdated = false
      
      // Process date fields
      if (data.startDate !== undefined) {
        updateData.startDate = data.startDate ? new Date(data.startDate) : null
      }
      if (data.endDate !== undefined) {
        updateData.endDate = data.endDate ? new Date(data.endDate) : null
      }

      // Copy other fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'startDate' && key !== 'endDate' && value !== undefined) {
          updateData[key] = value
        }
      })

      if (meta && typeof meta === 'object') {
        Object.assign(nextMeta, meta)
        metaUpdated = true
      }

      if (metaUpdated) {
        updateData.meta = nextMeta
      }

      const employee = await ctx.prisma.employee.update({
        where: { id },
        data: updateData,
      })

      // Log status change if applicable
      if (data.status && data.status !== existingEmployee.status) {
        await logEmployeeEvent({
          actorId: (ctx.user as { id: string }).id,
          action: 'EMPLOYEE_STATUS_CHANGED',
          employeeId: id,
          metadata: { 
            previousStatus: existingEmployee.status, 
            newStatus: data.status,
          },
        })
      } else {
        const updatedFields = Object.keys(data)
        if (metaUpdated) updatedFields.push('meta')
        await logEmployeeEvent({
          actorId: (ctx.user as { id: string }).id,
          action: 'EMPLOYEE_UPDATED',
          employeeId: id,
          metadata: { updatedFields },
        })
      }

      return employee
    }),

  updateSelf: protectedProcedure
    .input(selfUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user as { id: string; employeeId?: string }
      
      if (!user.employeeId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No employee profile linked' })
      }

      const employee = await ctx.prisma.employee.update({
        where: { id: user.employeeId },
        data: input,
      })

      await logEmployeeEvent({
        actorId: user.id,
        action: 'EMPLOYEE_UPDATED',
        employeeId: employee.id,
        metadata: { selfUpdate: true, updatedFields: Object.keys(input) },
      })

      return employee
    }),

  getDepartments: protectedProcedure
    .query(async ({ ctx }) => {
      const employees = await ctx.prisma.employee.findMany({
        where: { department: { not: null } },
        select: { department: true },
      })

      // Get unique departments
      const uniqueDepartments = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[]
      return uniqueDepartments.sort()
    }),

  getManagers: hrAdminProcedure
    .query(async ({ ctx }) => {
      await autoActivateEmployees(ctx.prisma)
      return ctx.prisma.employee.findMany({
        where: { 
          status: 'ACTIVE',
          directReports: { some: {} },
        },
        select: { id: true, fullName: true, jobTitle: true, department: true },
        orderBy: { fullName: 'asc' },
      })
    }),

  getAllActive: hrAdminProcedure
    .query(async ({ ctx }) => {
      await autoActivateEmployees(ctx.prisma)
      return ctx.prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, fullName: true, jobTitle: true, department: true, workEmail: true },
        orderBy: { fullName: 'asc' },
      })
    }),
})
