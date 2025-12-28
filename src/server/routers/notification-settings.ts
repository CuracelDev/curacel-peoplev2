import { z } from 'zod'
import { router, adminProcedure } from '@/lib/trpc'
import { ALL_NOTIFICATION_ACTIONS } from '@/lib/notification-actions'
import {
  getNotificationEmailSettings,
  listAdminUsers,
  updateNotificationEmailSettings,
} from '@/lib/notification-settings'

const allowedActions = new Set(ALL_NOTIFICATION_ACTIONS)

export const notificationSettingsRouter = router({
  get: adminProcedure.query(async () => getNotificationEmailSettings()),
  listAdmins: adminProcedure.query(async () => listAdminUsers()),
  update: adminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        recipientMode: z.enum(['ALL_ADMINS', 'INITIATOR', 'SELECTED']),
        actions: z.array(z.string()).refine((actions) => actions.every((action) => allowedActions.has(action)), {
          message: 'Unknown notification action provided.',
        }),
        recipients: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => updateNotificationEmailSettings(input)),
})
