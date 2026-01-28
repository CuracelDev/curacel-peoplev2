import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc'
import { v4 as uuidv4 } from 'uuid'

export const recruiterRouter = router({
  // =====================
  // PROTECTED PROCEDURES (Admin)
  // =====================

  // List all recruiters
  list: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where = input?.includeInactive ? {} : { isActive: true }

      return ctx.prisma.recruiter.findMany({
        where,
        include: {
          jobAccess: {
            include: {
              job: {
                select: { id: true, title: true, status: true },
              },
            },
          },
          _count: {
            select: { candidates: true, jobAccess: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  // Get a single recruiter
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const recruiter = await ctx.prisma.recruiter.findUnique({
        where: { id: input.id },
        include: {
          jobAccess: {
            include: {
              job: {
                select: { id: true, title: true, status: true, department: true },
              },
            },
          },
          candidates: {
            include: {
              candidate: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  stage: true,
                  job: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
      })

      if (!recruiter) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recruiter not found',
        })
      }

      return recruiter
    }),

  // Create a new recruiter
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        organizationName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if recruiter already exists
      const existing = await ctx.prisma.recruiter.findUnique({
        where: { email: input.email },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A recruiter with this email already exists',
        })
      }

      return ctx.prisma.recruiter.create({
        data: input,
      })
    }),

  // Update a recruiter
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        organizationName: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      return ctx.prisma.recruiter.update({
        where: { id },
        data,
      })
    }),

  // Add recruiter access to a job
  addToJob: protectedProcedure
    .input(
      z.object({
        recruiterId: z.string(),
        jobId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if access already exists
      const existing = await ctx.prisma.recruiterJob.findUnique({
        where: {
          recruiterId_jobId: {
            recruiterId: input.recruiterId,
            jobId: input.jobId,
          },
        },
      })

      if (existing) {
        return existing
      }

      return ctx.prisma.recruiterJob.create({
        data: {
          recruiterId: input.recruiterId,
          jobId: input.jobId,
          accessToken: uuidv4(),
        },
        include: {
          job: { select: { id: true, title: true } },
        },
      })
    }),

  // Remove recruiter access from a job
  removeFromJob: protectedProcedure
    .input(
      z.object({
        recruiterId: z.string(),
        jobId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.recruiterJob.deleteMany({
        where: {
          recruiterId: input.recruiterId,
          jobId: input.jobId,
        },
      })
      return { success: true }
    }),

  // Regenerate access token for a recruiter-job pair
  regenerateToken: protectedProcedure
    .input(
      z.object({
        recruiterId: z.string(),
        jobId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.recruiterJob.update({
        where: {
          recruiterId_jobId: {
            recruiterId: input.recruiterId,
            jobId: input.jobId,
          },
        },
        data: {
          accessToken: uuidv4(),
        },
      })
    }),

  // Get all job access links for a recruiter
  getAccessLinks: protectedProcedure
    .input(z.object({ recruiterId: z.string() }))
    .query(async ({ ctx, input }) => {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

      const access = await ctx.prisma.recruiterJob.findMany({
        where: { recruiterId: input.recruiterId },
        include: {
          job: {
            select: { id: true, title: true, status: true, department: true },
          },
        },
      })

      return access.map((a) => ({
        ...a,
        portalUrl: `${baseUrl}/recruiter/${a.accessToken}`,
      }))
    }),

  // =====================
  // PUBLIC PROCEDURES (Token-based access)
  // =====================

  // Get portal data by access token
  getPortalByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const recruiterJob = await ctx.prisma.recruiterJob.findUnique({
        where: { accessToken: input.token },
        include: {
          recruiter: {
            select: { id: true, name: true, email: true, organizationName: true },
          },
          job: {
            include: {
              jobDescription: {
                select: { id: true, name: true, content: true },
              },
            },
          },
        },
      })

      if (!recruiterJob) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid or expired access link',
        })
      }

      // Check if recruiter is active
      const recruiter = await ctx.prisma.recruiter.findUnique({
        where: { id: recruiterJob.recruiterId },
      })

      if (!recruiter?.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your recruiter access has been deactivated',
        })
      }

      // Update last accessed
      await ctx.prisma.recruiterJob.update({
        where: { id: recruiterJob.id },
        data: { lastAccessedAt: new Date() },
      })

      return {
        recruiter: recruiterJob.recruiter,
        job: recruiterJob.job,
        accessId: recruiterJob.id,
      }
    }),

  // Get candidates submitted by this recruiter for this job
  getCandidatesByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const recruiterJob = await ctx.prisma.recruiterJob.findUnique({
        where: { accessToken: input.token },
      })

      if (!recruiterJob) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid access token',
        })
      }

      // Get candidates submitted by this recruiter for this job
      const recruiterCandidates = await ctx.prisma.recruiterCandidate.findMany({
        where: {
          recruiterId: recruiterJob.recruiterId,
          candidate: {
            jobId: recruiterJob.jobId,
          },
        },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              stage: true,
              score: true,
              appliedAt: true,
              linkedinUrl: true,
              resumeUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return recruiterCandidates.map((rc) => rc.candidate)
    }),

  // Submit a candidate via recruiter portal
  submitCandidate: publicProcedure
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(2, 'Name is required'),
        email: z.string().email('Invalid email address'),
        phone: z.string().optional(),
        linkedinUrl: z.string()
          .transform((val) => {
            if (!val || val === '') return ''
            // Add https:// if no protocol is present
            if (!val.startsWith('http://') && !val.startsWith('https://')) {
              return `https://${val}`
            }
            return val
          })
          .pipe(z.string().url().optional().or(z.literal(''))),
        bio: z.string().optional(),
        notes: z.string().optional(),
        resumeUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { token, ...candidateData } = input

      const recruiterJob = await ctx.prisma.recruiterJob.findUnique({
        where: { accessToken: token },
        include: {
          recruiter: true,
          job: true,
        },
      })

      if (!recruiterJob) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid access token',
        })
      }

      if (!recruiterJob.recruiter.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your recruiter access has been deactivated',
        })
      }

      if (recruiterJob.job.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This job is no longer accepting applications',
        })
      }

      // Check if candidate already exists for this job
      const existing = await ctx.prisma.jobCandidate.findFirst({
        where: {
          jobId: recruiterJob.jobId,
          email: input.email,
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A candidate with this email has already been submitted for this position',
        })
      }

      // Create candidate with RECRUITER source
      const candidate = await ctx.prisma.jobCandidate.create({
        data: {
          ...candidateData,
          jobId: recruiterJob.jobId,
          source: 'RECRUITER',
          stage: 'APPLIED',
        },
      })

      // Link to recruiter
      await ctx.prisma.recruiterCandidate.create({
        data: {
          recruiterId: recruiterJob.recruiterId,
          candidateId: candidate.id,
        },
      })

      return { success: true, candidateId: candidate.id }
    }),
})
