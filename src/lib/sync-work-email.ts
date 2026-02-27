/**
 * Work Email Sync Utility
 * 
 * Syncs the workEmail field on Employee records from their Google Workspace
 * AppAccount records. This ensures consistency when:
 * - Offboarding needs the correct email for deprovisioning
 * - Email was provisioned but workEmail wasn't updated
 * - Manual corrections are needed
 */

import prisma from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export interface SyncResult {
  success: boolean
  updated: number
  errors: string[]
  details: Array<{
    employeeId: string
    employeeName: string
    oldEmail: string | null
    newEmail: string
  }>
}

/**
 * Sync workEmail for a single employee from their Google Workspace AppAccount
 */
export async function syncEmployeeWorkEmail(
  employeeId: string,
  actorId?: string
): Promise<{ updated: boolean; newEmail?: string; error?: string }> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        fullName: true,
        workEmail: true,
        personalEmail: true,
        appAccounts: {
          where: {
            app: { type: 'GOOGLE_WORKSPACE' },
            status: { in: ['ACTIVE', 'PENDING'] },
            externalEmail: { not: null },
          },
          select: {
            externalEmail: true,
            app: { select: { type: true } },
          },
        },
      },
    })

    if (!employee) {
      return { updated: false, error: 'Employee not found' }
    }

    // Find Google Workspace account with an email
    const googleAccount = employee.appAccounts.find(
      acc => acc.app.type === 'GOOGLE_WORKSPACE' && acc.externalEmail
    )

    if (!googleAccount?.externalEmail) {
      return { updated: false } // No Google account to sync from
    }

    // Check if update is needed
    if (employee.workEmail === googleAccount.externalEmail) {
      return { updated: false } // Already in sync
    }

    // Update workEmail
    await prisma.employee.update({
      where: { id: employeeId },
      data: { workEmail: googleAccount.externalEmail },
    })

    // Log the sync
    await createAuditLog({
      actorId,
      actorType: actorId ? 'user' : 'system',
      action: 'WORK_EMAIL_SYNCED',
      resourceType: 'employee',
      resourceId: employeeId,
      metadata: {
        previousEmail: employee.workEmail,
        newEmail: googleAccount.externalEmail,
        source: 'GOOGLE_WORKSPACE',
      },
    })

    return {
      updated: true,
      newEmail: googleAccount.externalEmail,
    }
  } catch (error) {
    console.error(`Failed to sync workEmail for employee ${employeeId}:`, error)
    return {
      updated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Sync workEmail for all employees who have a Google Workspace account
 * but their workEmail doesn't match or is missing
 */
export async function syncAllWorkEmails(actorId?: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    updated: 0,
    errors: [],
    details: [],
  }

  try {
    // Find all employees with Google Workspace accounts where email might need sync
    const employeesWithMismatch = await prisma.employee.findMany({
      where: {
        status: { notIn: ['EXITED'] },
        appAccounts: {
          some: {
            app: { type: 'GOOGLE_WORKSPACE' },
            status: { in: ['ACTIVE', 'PENDING'] },
            externalEmail: { not: null },
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        workEmail: true,
        personalEmail: true,
        appAccounts: {
          where: {
            app: { type: 'GOOGLE_WORKSPACE' },
            status: { in: ['ACTIVE', 'PENDING'] },
            externalEmail: { not: null },
          },
          select: {
            externalEmail: true,
          },
        },
      },
    })

    for (const employee of employeesWithMismatch) {
      const googleEmail = employee.appAccounts[0]?.externalEmail
      
      if (!googleEmail) continue
      
      // Skip if already in sync
      if (employee.workEmail === googleEmail) continue

      const syncResult = await syncEmployeeWorkEmail(employee.id, actorId)

      if (syncResult.updated) {
        result.updated++
        result.details.push({
          employeeId: employee.id,
          employeeName: employee.fullName,
          oldEmail: employee.workEmail,
          newEmail: syncResult.newEmail!,
        })
      } else if (syncResult.error) {
        result.errors.push(`${employee.fullName}: ${syncResult.error}`)
      }
    }

    console.log(`[WorkEmailSync] Synced ${result.updated} employees, ${result.errors.length} errors`)
    
  } catch (error) {
    console.error('[WorkEmailSync] Failed to sync work emails:', error)
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

/**
 * Get employees with potential email mismatches
 * (useful for preview before running sync)
 */
export async function getWorkEmailMismatches(): Promise<Array<{
  id: string
  fullName: string
  status: string
  workEmail: string | null
  personalEmail: string
  googleWorkspaceEmail: string | null
}>> {
  const employees = await prisma.employee.findMany({
    where: {
      status: { notIn: ['EXITED'] },
      appAccounts: {
        some: {
          app: { type: 'GOOGLE_WORKSPACE' },
          status: { in: ['ACTIVE', 'PENDING'] },
          externalEmail: { not: null },
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      status: true,
      workEmail: true,
      personalEmail: true,
      appAccounts: {
        where: {
          app: { type: 'GOOGLE_WORKSPACE' },
          status: { in: ['ACTIVE', 'PENDING'] },
        },
        select: {
          externalEmail: true,
        },
      },
    },
  })

  return employees
    .filter(emp => {
      const googleEmail = emp.appAccounts[0]?.externalEmail
      return googleEmail && emp.workEmail !== googleEmail
    })
    .map(emp => ({
      id: emp.id,
      fullName: emp.fullName,
      status: emp.status,
      workEmail: emp.workEmail,
      personalEmail: emp.personalEmail,
      googleWorkspaceEmail: emp.appAccounts[0]?.externalEmail || null,
    }))
}
