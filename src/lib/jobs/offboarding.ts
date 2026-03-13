
import PgBoss from 'pg-boss'
import { prisma } from '../prisma'
import { runOffboardingTask } from '../../server/routers/offboarding'

export const OFFBOARDING_JOB_NAME = 'process-scheduled-offboarding'

export async function initOffboardingJob(boss: PgBoss) {
  await boss.work(OFFBOARDING_JOB_NAME, async () => {
    console.log('[Worker] Checking for scheduled offboarding workflows...')
    
    const today = new Date()
    // Find due pending workflows
    const dueWorkflows = await prisma.offboardingWorkflow.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: today },
      },
      include: {
        employee: true,
        tasks: {
          where: {
            type: 'AUTOMATED',
            status: 'PENDING',
          },
        },
      },
    })

    console.log(`[Worker] Found ${dueWorkflows.length} offboarding workflows due for processing`)

    for (const workflow of dueWorkflows) {
      try {
        console.log(`[Worker] Processing offboarding for ${workflow.employee.fullName} (${workflow.id})`)
        
        // Update workflow status
        await prisma.offboardingWorkflow.update({
          where: { id: workflow.id },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          },
        })

        // Run automated tasks
        for (const task of workflow.tasks) {
          try {
            console.log(`[Worker] Running automated task: ${task.name} for ${workflow.employee.fullName}`)
            await runOffboardingTask(prisma, task.id, 'system', workflow.employee)
          } catch (taskError) {
            console.error(`[Worker] Failed to run automated task ${task.id}:`, taskError)
          }
        }
      } catch (workflowError) {
        console.error(`[Worker] Failed to process workflow ${workflow.id}:`, workflowError)
      }
    }

    // Also check for IN_PROGRESS workflows with stuck PENDING automated tasks
    const stuckTasks = await prisma.offboardingTask.findMany({
      where: {
        type: 'AUTOMATED',
        status: 'PENDING',
        workflow: {
          status: 'IN_PROGRESS',
          scheduledFor: { lte: today },
        },
      },
      include: {
        workflow: {
          include: {
            employee: true
          }
        }
      }
    })

    if (stuckTasks.length > 0) {
      console.log(`[Worker] Found ${stuckTasks.length} stuck automated offboarding tasks`)
      for (const task of stuckTasks) {
        try {
          console.log(`[Worker] Retrying stuck task: ${task.name} for ${task.workflow.employee.fullName}`)
          await runOffboardingTask(prisma, task.id, 'system', task.workflow.employee)
        } catch (retryError) {
          console.error(`[Worker] Failed to retry stuck task ${task.id}:`, retryError)
        }
      }
    }

    return { processed: dueWorkflows.length, retried: stuckTasks.length }
  })
}

export async function scheduleOffboarding(boss: PgBoss) {
  // Run every 15 minutes
  await boss.schedule(OFFBOARDING_JOB_NAME, '*/15 * * * *', {})
  console.log('[Worker] Offboarding job scheduled every 15 minutes')
}
