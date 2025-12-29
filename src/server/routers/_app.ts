import { router } from '@/lib/trpc'
import { employeeRouter } from './employee'
import { offerRouter } from './offer'
import { offerTemplateRouter } from './offer-template'
import { onboardingRouter } from './onboarding'
import { offboardingRouter } from './offboarding'
import { integrationRouter } from './integration'
import { auditRouter } from './audit'
import { dashboardRouter } from './dashboard'
import { userRouter } from './user'
import { organizationRouter } from './organization'
import { signatureRouter } from './signature'
import { apiTokenRouter } from './api-token'
import { notificationSettingsRouter } from './notification-settings'
import { notificationRouter } from './notification'
import { legalEntityRouter } from './legal-entity'
import { assistantRouter } from './assistant'
import { teamRouter } from './team'
import { jobDescriptionRouter } from './job-description'
import { hiringRubricRouter } from './hiring-rubric'
import { competencyRouter } from './competency'

export const appRouter = router({
  employee: employeeRouter,
  offer: offerRouter,
  offerTemplate: offerTemplateRouter,
  onboarding: onboardingRouter,
  offboarding: offboardingRouter,
  integration: integrationRouter,
  audit: auditRouter,
  dashboard: dashboardRouter,
  user: userRouter,
  organization: organizationRouter,
  signature: signatureRouter,
  apiToken: apiTokenRouter,
  notificationSettings: notificationSettingsRouter,
  notifications: notificationRouter,
  legalEntity: legalEntityRouter,
  assistant: assistantRouter,
  team: teamRouter,
  jobDescription: jobDescriptionRouter,
  hiringRubric: hiringRubricRouter,
  competency: competencyRouter,
})

export type AppRouter = typeof appRouter
