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
import { competencyFrameworkRouter } from './competency-framework'
import { jobRouter } from './job'
import { interestFormRouter } from './interest-form'
import { interviewStageRouter } from './interview-stage'
import { interviewRouter } from './interview'
import { interviewTypeRouter } from './interview-type'
import { assessmentRouter } from './assessment'
import { assessmentAnalyticsRouter } from './assessment-analytics'
import { analyticsRouter } from './analytics'
import { recruiterRouter } from './recruiter'
import { hiringSettingsRouter } from './hiring-settings'
import { hiringFlowRouter } from './hiringFlow'
import { questionRouter } from './question'
import { candidateEmailRouter } from './candidate-email'
import { auntyPelzAnalysisRouter } from './auntypelz-analysis'
import { publicPagesRouter } from './public-pages'
import { webflowRouter } from './webflow'
import { advisorRouter } from './advisor'
import { emailSettingsRouter } from './email-settings'

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
  competencyFramework: competencyFrameworkRouter,
  job: jobRouter,
  interestForm: interestFormRouter,
  interviewStage: interviewStageRouter,
  interview: interviewRouter,
  interviewType: interviewTypeRouter,
  assessment: assessmentRouter,
  assessmentAnalytics: assessmentAnalyticsRouter,
  analytics: analyticsRouter,
  recruiter: recruiterRouter,
  hiringSettings: hiringSettingsRouter,
  hiringFlow: hiringFlowRouter,
  question: questionRouter,
  candidateEmail: candidateEmailRouter,
  auntyPelzAnalysis: auntyPelzAnalysisRouter,
  publicPages: publicPagesRouter,
  webflow: webflowRouter,
  advisor: advisorRouter,
  emailSettings: emailSettingsRouter,
})

export type AppRouter = typeof appRouter
