import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '@/lib/trpc'
import { syncAllCandidateEmails } from '@/lib/email-sync-service'
import { categorizeAllForCandidate, recategorizeEmail } from '@/lib/ai/email-categorization'
import { EmailCategory } from '@prisma/client'

export const candidateCommunicationsRouter = router({
  /**
   * Get all emails for a candidate (from database)
   * Includes category, hiring period filtering, and sorting
   */
  getAllEmails: protectedProcedure
    .input(
      z.object({
        candidateId: z.string(),
        category: z.nativeEnum(EmailCategory).optional(),
        hiringPeriodOnly: z.boolean().default(false),
        sortBy: z.enum(['date', 'category']).default('date'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { candidateId, category, hiringPeriodOnly, sortBy, sortOrder } = input

      // Build where clause
      const where: any = {
        thread: {
          candidateId,
        },
      }

      if (category) {
        where.category = category
      }

      if (hiringPeriodOnly) {
        where.isInHiringPeriod = true
      }

      // Query emails
      const emails = await ctx.prisma.candidateEmail.findMany({
        where,
        include: {
          thread: {
            select: {
              id: true,
              subject: true,
              gmailThreadId: true,
            },
          },
        },
        orderBy: sortBy === 'category'
          ? [
              { category: sortOrder },
              { sentAt: sortOrder },
            ]
          : { sentAt: sortOrder },
      })

      // Group by category for easier display
      const grouped = emails.reduce((acc, email) => {
        const cat = email.category || 'OTHER'
        if (!acc[cat]) {
          acc[cat] = []
        }
        acc[cat].push(email)
        return acc
      }, {} as Record<string, typeof emails>)

      return {
        emails,
        grouped,
        total: emails.length,
        hiringPeriodCount: emails.filter(e => e.isInHiringPeriod).length,
      }
    }),

  /**
   * Get sync status for a candidate
   */
  getSyncStatus: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const latestSync = await ctx.prisma.candidateEmailSync.findFirst({
        where: { candidateId: input.candidateId },
        orderBy: { createdAt: 'desc' },
      })

      if (!latestSync) {
        return {
          hasSync: false,
          lastSyncAt: null,
          syncStatus: null,
          emailsFound: 0,
          emailsNew: 0,
          categorizationStatus: null,
          categorizedCount: 0,
        }
      }

      return {
        hasSync: true,
        lastSyncAt: latestSync.lastSyncAt,
        syncStatus: latestSync.syncStatus,
        emailsFound: latestSync.emailsFound,
        emailsNew: latestSync.emailsNew,
        emailsFailed: latestSync.emailsFailed,
        categorizationStatus: latestSync.categorizationStatus,
        categorizedCount: latestSync.categorizedCount,
        errorMessage: latestSync.errorMessage,
        fromDate: latestSync.fromDate,
        toDate: latestSync.toDate,
      }
    }),

  /**
   * Trigger full sync from Gmail
   * This runs async and returns immediately
   */
  syncFromGmail: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if there's already a sync in progress
      const existingSync = await ctx.prisma.candidateEmailSync.findFirst({
        where: {
          candidateId: input.candidateId,
          syncStatus: 'IN_PROGRESS',
        },
      })

      if (existingSync) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A sync is already in progress for this candidate',
        })
      }

      // Start sync in background (non-blocking)
      syncAllCandidateEmails(input.candidateId)
        .then((result) => {
          console.log(`Sync completed for candidate ${input.candidateId}:`, result)

          // Auto-trigger categorization if sync was successful
          if (result.success && result.emailsNew > 0) {
            console.log(`Auto-triggering AI categorization for ${result.emailsNew} new emails`)
            return categorizeAllForCandidate(input.candidateId)
          }
        })
        .then((catResult) => {
          if (catResult) {
            console.log(`Categorization completed for candidate ${input.candidateId}:`, catResult)
          }
        })
        .catch((error) => {
          console.error(`Background sync/categorization failed for candidate ${input.candidateId}:`, error)
        })

      return {
        success: true,
        message: 'Sync started in background. Check sync status for progress.',
      }
    }),

  /**
   * Trigger AI categorization for all uncategorized emails
   */
  categorizeEmails: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if categorization is already in progress
      const existingSync = await ctx.prisma.candidateEmailSync.findFirst({
        where: {
          candidateId: input.candidateId,
          categorizationStatus: 'IN_PROGRESS',
        },
      })

      if (existingSync) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Categorization is already in progress for this candidate',
        })
      }

      // Start categorization in background (non-blocking)
      categorizeAllForCandidate(input.candidateId)
        .then((result) => {
          console.log(`Categorization completed for candidate ${input.candidateId}:`, result)
        })
        .catch((error) => {
          console.error(`Background categorization failed for candidate ${input.candidateId}:`, error)
        })

      return {
        success: true,
        message: 'Categorization started in background. Check sync status for progress.',
      }
    }),

  /**
   * Re-categorize a single email (manual override)
   */
  recategorizeEmail: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
        category: z.nativeEnum(EmailCategory),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id

      const success = await recategorizeEmail(input.emailId, input.category, userId)

      if (!success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to recategorize email',
        })
      }

      return { success: true }
    }),

  /**
   * Get category statistics for a candidate
   */
  getCategoryStats: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const emails = await ctx.prisma.candidateEmail.findMany({
        where: {
          thread: {
            candidateId: input.candidateId,
          },
        },
        select: {
          category: true,
          isInHiringPeriod: true,
        },
      })

      const stats = emails.reduce((acc, email) => {
        const cat = email.category || 'OTHER'
        if (!acc[cat]) {
          acc[cat] = { total: 0, hiringPeriod: 0 }
        }
        acc[cat].total++
        if (email.isInHiringPeriod) {
          acc[cat].hiringPeriod++
        }
        return acc
      }, {} as Record<string, { total: number; hiringPeriod: number }>)

      return {
        stats,
        totalEmails: emails.length,
        hiringPeriodEmails: emails.filter(e => e.isInHiringPeriod).length,
        categorizedCount: emails.filter(e => e.category !== null).length,
        uncategorizedCount: emails.filter(e => e.category === null).length,
      }
    }),

  /**
   * Get email details by ID
   */
  getEmailDetails: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .query(async ({ ctx, input }) => {
      const email = await ctx.prisma.candidateEmail.findUnique({
        where: { id: input.emailId },
        include: {
          thread: {
            include: {
              candidate: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  job: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!email) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email not found',
        })
      }

      return email
    }),

  /**
   * Get hiring period date range for a candidate
   */
  getHiringPeriod: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const candidate = await ctx.prisma.jobCandidate.findUnique({
        where: { id: input.candidateId },
        select: {
          appliedAt: true,
          employee: {
            select: {
              startDate: true,
            },
          },
        },
      })

      if (!candidate) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Candidate not found',
        })
      }

      return {
        from: candidate.appliedAt,
        to: candidate.employee?.startDate || new Date(),
      }
    }),
})
