-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('CANDIDATE', 'OFFER_SENT', 'OFFER_SIGNED', 'HIRED_PENDING_START', 'ACTIVE', 'OFFBOARDING', 'EXITED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('PERMANENT', 'FIXED_TERM', 'CONTRACTOR', 'INTERN');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppType" AS ENUM ('GOOGLE_WORKSPACE', 'SLACK', 'BITBUCKET', 'JIRA', 'PASSBOLT', 'HUBSPOT', 'STANDUPNINJA', 'FIREFLIES', 'WEBFLOW', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ConnectionTestStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AppAccountStatus" AS ENUM ('PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED', 'DISABLED', 'DEPROVISIONED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('AUTOMATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('OFFER_CREATED', 'OFFER_UPDATED', 'OFFER_SENT', 'OFFER_VIEWED', 'OFFER_SIGNED', 'OFFER_DECLINED', 'OFFER_CANCELLED', 'OFFER_WEBHOOK_RECEIVED', 'EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'EMPLOYEE_STATUS_CHANGED', 'WORK_EMAIL_SYNCED', 'BULK_UPDATE', 'BULK_DELETE', 'ONBOARDING_STARTED', 'ONBOARDING_TASK_COMPLETED', 'ONBOARDING_COMPLETED', 'OFFBOARDING_STARTED', 'OFFBOARDING_TASK_COMPLETED', 'OFFBOARDING_COMPLETED', 'APP_CREATED', 'APP_ARCHIVED', 'APP_RESTORED', 'APP_CONNECTED', 'APP_DISCONNECTED', 'APP_ACCOUNT_PROVISIONED', 'APP_ACCOUNT_DEPROVISIONED', 'GOOGLE_USER_CREATED', 'GOOGLE_USER_DISABLED', 'GOOGLE_USER_DELETED', 'GOOGLE_GROUPS_UPDATED', 'SLACK_USER_CREATED', 'SLACK_USER_DISABLED', 'SLACK_CHANNELS_UPDATED', 'PROVISIONING_RULE_CREATED', 'PROVISIONING_RULE_UPDATED', 'PROVISIONING_RULE_DELETED', 'USER_LOGIN', 'USER_LOGOUT', 'ASSISTANT_ACTION', 'CANDIDATE_STAGE_CHANGED', 'CANDIDATE_STAGE_EMAIL_QUEUED', 'CANDIDATE_STAGE_EMAIL_SKIPPED', 'CANDIDATE_RESUME_PARSED');

-- CreateEnum
CREATE TYPE "NotificationRecipientMode" AS ENUM ('ALL_ADMINS', 'INITIATOR', 'SELECTED');

-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI');

-- CreateEnum
CREATE TYPE "AIChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "JobCandidateStage" AS ENUM ('APPLIED', 'SHORTLISTED', 'HR_SCREEN', 'TEAM_CHAT', 'ADVISOR_CHAT', 'TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'HIRED');

-- CreateEnum
CREATE TYPE "CandidateSource" AS ENUM ('INBOUND', 'OUTBOUND', 'RECRUITER', 'EXCELLER');

-- CreateEnum
CREATE TYPE "InboundChannel" AS ENUM ('YC', 'PEOPLEOS', 'COMPANY_SITE', 'OTHER');

-- CreateEnum
CREATE TYPE "OutboundChannel" AS ENUM ('LINKEDIN', 'JOB_BOARDS', 'GITHUB', 'TWITTER', 'OTHER');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('COMPETENCY_TEST', 'CODING_TEST', 'PERSONALITY_TEST', 'WORK_TRIAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('NOT_STARTED', 'INVITED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssessmentInputMethod" AS ENUM ('CANDIDATE', 'ADMIN', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "CandidateSubmissionType" AS ENUM ('FILE', 'TEXT', 'URL');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailCategory" AS ENUM ('APPLICATION', 'INTERVIEW_SCHEDULING', 'INTERVIEW_FOLLOWUP', 'ASSESSMENT', 'OFFER', 'ONBOARDING', 'GENERAL_FOLLOWUP', 'OTHER');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('APPLICATION_REVIEW', 'STAGE_SUMMARY', 'INTERVIEW_ANALYSIS', 'ASSESSMENT_REVIEW', 'COMPREHENSIVE', 'SENTIMENT_CHANGE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "employeeId" TEXT,
    "passwordHash" TEXT,
    "passwordSetAt" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpires" TIMESTAMP(3),
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "personalEmail" TEXT NOT NULL,
    "workEmail" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'CANDIDATE',
    "candidateId" TEXT,
    "companyStageFlowSnapshotId" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "managerId" TEXT,
    "location" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "probationEndDate" TIMESTAMP(3),
    "onboardedAt" TIMESTAMP(3),
    "offboardedAt" TIMESTAMP(3),
    "salaryAmount" DECIMAL(12,2),
    "salaryCurrency" TEXT DEFAULT 'USD',
    "contractType" "ContractType",
    "addressStreet" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressPostal" TEXT,
    "addressCountry" TEXT,
    "phone" TEXT,
    "profileImageUrl" TEXT,
    "gender" TEXT,
    "maritalStatus" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT,
    "taxId" TEXT,
    "bankName" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "accountSortCode" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactRelation" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactEmail" TEXT,
    "lifeValues" JSONB,
    "knowAboutMe" JSONB,
    "mbtiType" TEXT,
    "mbtiImageUrl" TEXT,
    "bigFiveUrl" TEXT,
    "bigFiveImageUrl" TEXT,
    "personalityCompleted" BOOLEAN NOT NULL DEFAULT false,
    "personalityCompletedAt" TIMESTAMP(3),
    "formerOfferLetterUrl" TEXT,
    "formerLastPayslipUrl" TEXT,
    "formerResignationLetterUrl" TEXT,
    "formerResignationConfirmUrl" TEXT,
    "formerHrContactName" TEXT,
    "formerHrContactPhone" TEXT,
    "formerHrContactEmail" TEXT,
    "formerCompanyAddress" TEXT,
    "formerEmploymentSubmittedAt" TIMESTAMP(3),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeRoleHistory" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fromJobTitle" TEXT,
    "toJobTitle" TEXT NOT NULL,
    "fromDepartment" TEXT,
    "toDepartment" TEXT,
    "fromSalary" DECIMAL(12,2),
    "toSalary" DECIMAL(12,2),
    "changeType" TEXT NOT NULL,
    "reason" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "EmployeeRoleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "relationship" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "bodyMarkdown" TEXT,
    "employmentType" "EmploymentType",
    "includeNda" BOOLEAN NOT NULL DEFAULT true,
    "includePii" BOOLEAN NOT NULL DEFAULT true,
    "variableSchema" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferTemplateAttachment" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contentHtml" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferTemplateAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "candidateEmail" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "renderedHtml" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "esignEnvelopeId" TEXT,
    "esignProvider" TEXT,
    "esignStatus" TEXT,
    "esignSentAt" TIMESTAMP(3),
    "esignViewedAt" TIMESTAMP(3),
    "esignSignedAt" TIMESTAMP(3),
    "esignDeclinedAt" TIMESTAMP(3),
    "esignExpiresAt" TIMESTAMP(3),
    "signedDocUrl" TEXT,
    "sentBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferEvent" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "type" "AppType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConnection" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "configEncrypted" TEXT NOT NULL,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastTestStatus" "ConnectionTestStatus",
    "lastTestedAt" TIMESTAMP(3),
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppProvisioningRule" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "condition" JSONB NOT NULL,
    "provisionData" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppProvisioningRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppAccount" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "externalUserId" TEXT,
    "externalEmail" TEXT,
    "externalUsername" TEXT,
    "status" "AppAccountStatus" NOT NULL DEFAULT 'PENDING',
    "statusMessage" TEXT,
    "provisionedResources" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "provisionedAt" TIMESTAMP(3),
    "deprovisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebflowFieldMapping" (
    "id" TEXT NOT NULL,
    "appConnectionId" TEXT NOT NULL,
    "fieldMappings" JSONB NOT NULL,
    "collectionSchema" JSONB,
    "schemaFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebflowFieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingWorkflow" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "automationType" TEXT,
    "automationConfig" JSONB,
    "statusMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingWorkflow" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "isImmediate" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reason" TEXT,
    "notes" TEXT,
    "googleDeleteAccount" BOOLEAN NOT NULL DEFAULT false,
    "googleTransferToEmail" TEXT,
    "googleTransferApps" JSONB,
    "googleAliasToEmail" TEXT,
    "initiatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffboardingWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingTask" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "automationType" TEXT,
    "appId" TEXT,
    "statusMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorType" TEXT,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "auditLogId" TEXT,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "actorName" TEXT,
    "actorEmail" TEXT,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobExecution" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "jobId" TEXT,
    "status" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "oneSentenceDescription" TEXT,
    "careerPageUrl" TEXT,
    "detailedDescription" TEXT,
    "letterheadEmail" TEXT,
    "letterheadWebsite" TEXT,
    "letterheadAddress" TEXT,
    "letterheadPhone" TEXT,
    "googleWorkspaceTransferToEmail" TEXT,
    "notificationEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationEmailActions" JSONB,
    "notificationEmailRecipients" JSONB,
    "notificationEmailRecipientMode" "NotificationRecipientMode" NOT NULL DEFAULT 'ALL_ADMINS',
    "sidebarBadgesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sidebarBadgeSettings" JSONB,
    "publicPageSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advisor" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "leaderId" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingTaskTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL,
    "automationType" TEXT,
    "appId" TEXT,
    "appType" "AppType",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingTaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingTaskTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL,
    "automationType" TEXT,
    "appId" TEXT,
    "appType" "AppType",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffboardingTaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingEmployeeTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffboardingEmployeeTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureBlock" (
    "id" TEXT NOT NULL,
    "signatoryName" TEXT NOT NULL,
    "signatoryTitle" TEXT NOT NULL,
    "signatureText" TEXT,
    "signatureImageUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AISettings" (
    "id" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL DEFAULT 'OPENAI',
    "openaiKeyEncrypted" TEXT,
    "anthropicKeyEncrypted" TEXT,
    "geminiKeyEncrypted" TEXT,
    "openaiModel" TEXT NOT NULL DEFAULT 'gpt-4o',
    "anthropicModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    "geminiModel" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "systemPrompt" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "requireConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AISettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIChat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIChatMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" "AIChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "isError" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICustomTool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "executionType" TEXT NOT NULL,
    "executionConfig" JSONB NOT NULL,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "allowedRoles" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "autoCreated" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "ApprovalStatus",
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "sourceContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "AICustomTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantApproval" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "dryRunData" JSONB NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyBrief" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingSettings" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT,
    "sheetRosterRange" TEXT NOT NULL DEFAULT 'Status!A2:J',
    "sheetRefreshMs" INTEGER NOT NULL DEFAULT 30000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringFlow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stages" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringFlowSnapshot" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "stages" JSONB NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiringFlowSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyStageFlow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stages" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyStageFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyStageFlowSnapshot" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "stages" JSONB NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyStageFlowSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDescription" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringRubric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringRubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriteria" (
    "id" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RubricCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencyFrameworkSource" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "sheetUrl" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "gidOrTabName" TEXT,
    "formatType" TEXT NOT NULL,
    "levelNames" JSONB NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "maxLevel" INTEGER NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "cacheValidUntil" TIMESTAMP(3),
    "syncedByUserId" TEXT,
    "columnMapping" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetencyFrameworkSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreCompetency" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "functionArea" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubCompetency" (
    "id" TEXT NOT NULL,
    "coreCompetencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "levelDescriptions" JSON NOT NULL,
    "hasBehavioralIndicators" BOOLEAN NOT NULL DEFAULT false,
    "behavioralIndicators" JSON,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCompetencyRequirement" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "subCompetencyId" TEXT NOT NULL,
    "requiredLevel" INTEGER NOT NULL,
    "requiredLevelName" TEXT NOT NULL,
    "validationStage" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCompetencyRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateCompetencyScore" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "subCompetencyId" TEXT NOT NULL,
    "rawScore" INTEGER NOT NULL,
    "scoreLevelName" TEXT NOT NULL,
    "normalizedScore" DOUBLE PRECISION NOT NULL,
    "evidence" TEXT,
    "evaluatorNotes" TEXT,
    "checkedIndicators" JSON,
    "evaluatedAtStage" TEXT,
    "interviewId" TEXT,
    "evaluatorId" TEXT,
    "evaluatorName" TEXT,
    "evaluatorEmail" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateCompetencyScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCompetencyScore" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "subCompetencyId" TEXT NOT NULL,
    "currentLevel" INTEGER NOT NULL,
    "currentLevelName" TEXT NOT NULL,
    "normalizedScore" DOUBLE PRECISION NOT NULL,
    "targetLevel" INTEGER,
    "targetLevelName" TEXT,
    "lastAssessedAt" TIMESTAMP(3) NOT NULL,
    "nextAssessmentDue" TIMESTAMP(3),
    "assessmentPeriod" TEXT,
    "assessorId" TEXT,
    "assessorName" TEXT,
    "strengths" TEXT,
    "areasForGrowth" TEXT,
    "developmentPlan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCompetencyScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencySyncLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "syncDetails" JSON,
    "triggeredBy" TEXT,
    "syncDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetencySyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'full-time',
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "deadline" TIMESTAMP(3),
    "hiresCount" INTEGER NOT NULL DEFAULT 1,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT DEFAULT 'USD',
    "salaryFrequency" TEXT DEFAULT 'annually',
    "equityMin" DOUBLE PRECISION,
    "equityMax" DOUBLE PRECISION,
    "locations" JSONB NOT NULL DEFAULT '[]',
    "hiringFlowId" TEXT,
    "hiringFlowSnapshotId" TEXT,
    "jobDescriptionId" TEXT,
    "defaultOfferTemplateId" TEXT,
    "hiringManagerId" TEXT,
    "autoArchiveLocation" BOOLEAN NOT NULL DEFAULT false,
    "decisionSupportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "personalityProfilesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "teamProfilesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "interestFormId" TEXT,
    "slug" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "lastWebhookAt" TIMESTAMP(3),
    "webflowItemId" TEXT,
    "webflowSyncStatus" TEXT,
    "webflowSyncError" TEXT,
    "webflowLastSyncAt" TIMESTAMP(3),
    "webflowPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scorecard" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "mission" TEXT NOT NULL,
    "outcomes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobFollower" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFollower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAction" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCompetency" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCandidate" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "resumeUrl" TEXT,
    "linkedinUrl" TEXT,
    "otherContactInfo" TEXT,
    "avatarUrl" TEXT,
    "currentRole" TEXT,
    "currentCompany" TEXT,
    "yearsOfExperience" DOUBLE PRECISION,
    "location" TEXT,
    "workExperience" JSONB,
    "education" JSONB,
    "skills" JSONB,
    "resumeSummary" TEXT,
    "stage" "JobCandidateStage" NOT NULL DEFAULT 'APPLIED',
    "customStageName" TEXT,
    "score" INTEGER,
    "experienceMatchScore" INTEGER,
    "skillsMatchScore" INTEGER,
    "domainFitScore" INTEGER,
    "educationScore" INTEGER,
    "scoreExplanation" TEXT,
    "whyCuracel" TEXT,
    "salaryExpMin" INTEGER,
    "salaryExpMax" INTEGER,
    "salaryExpCurrency" TEXT DEFAULT 'USD',
    "noticePeriod" TEXT,
    "mbtiType" TEXT,
    "pressValuesScores" JSONB,
    "pressValuesAvg" INTEGER,
    "competencyScores" JSONB,
    "personalityProfile" JSONB,
    "teamFitAnalysis" JSONB,
    "mustValidate" JSONB,
    "redFlags" JSONB,
    "suggestedQuestions" JSONB,
    "recommendation" TEXT,
    "recommendationConfidence" INTEGER,
    "recommendationSummary" TEXT,
    "recommendationStrengths" JSONB,
    "recommendationRisks" JSONB,
    "decisionStatus" TEXT,
    "decisionNotes" TEXT,
    "decisionBy" TEXT,
    "decisionAt" TIMESTAMP(3),
    "source" "CandidateSource" NOT NULL DEFAULT 'INBOUND',
    "inboundChannel" "InboundChannel",
    "outboundChannel" "OutboundChannel",
    "addedById" TEXT,
    "referredBy" TEXT,
    "bio" TEXT,
    "coverLetter" TEXT,
    "notes" TEXT,
    "documents" JSONB,
    "processingStatus" TEXT,
    "processedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateInterview" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "stageName" TEXT,
    "interviewers" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "score" INTEGER,
    "feedback" TEXT,
    "scorecard" JSONB,
    "stageTemplateId" TEXT,
    "interviewTypeId" TEXT,
    "overallScore" INTEGER,
    "firefliesMeetingId" TEXT,
    "firefliesTranscript" TEXT,
    "firefliesSummary" TEXT,
    "firefliesActionItems" JSONB,
    "firefliesHighlights" JSONB,
    "transcriptUrl" TEXT,
    "recordingUrl" TEXT,
    "meetingLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewerToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'INTERVIEWER',
    "interviewerId" TEXT,
    "interviewerName" TEXT NOT NULL,
    "interviewerEmail" TEXT NOT NULL,
    "interviewerRole" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accessedAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "evaluationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "overallRating" INTEGER,
    "recommendation" TEXT,
    "evaluationNotes" TEXT,
    "customQuestions" JSONB,
    "questionResponses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewerToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recruiter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recruiter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterJob" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruiterJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterCandidate" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruiterCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "globalWebhookUrl" TEXT,
    "globalWebhookSecret" TEXT,
    "companyLogoUrl" TEXT,
    "companyDescription" TEXT,
    "socialLinks" JSONB,
    "customInboundChannels" JSONB,
    "customOutboundChannels" JSONB,
    "candidateScoreWeights" JSONB,
    "jobScoreDisplay" TEXT NOT NULL DEFAULT 'average',
    "decisionSupportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "personalityProfilesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "teamProfilesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoArchiveUnqualified" BOOLEAN NOT NULL DEFAULT false,
    "autoArchiveLocationMismatch" BOOLEAN NOT NULL DEFAULT false,
    "allowBackwardStageMovement" BOOLEAN NOT NULL DEFAULT false,
    "probationLengthFullTimeMonths" INTEGER NOT NULL DEFAULT 3,
    "probationLengthPartTimeMonths" INTEGER NOT NULL DEFAULT 3,
    "probationLengthContractorMonths" INTEGER NOT NULL DEFAULT 3,
    "probationLengthInternMonths" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestFormTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterestFormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestFormQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "scaleMin" INTEGER DEFAULT 1,
    "scaleMax" INTEGER DEFAULT 5,
    "scaleMinLabel" TEXT,
    "scaleMaxLabel" TEXT,
    "fieldMapping" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterestFormQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestFormResponse" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "candidateId" TEXT,
    "candidateEmail" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "submissionToken" TEXT,
    "aiAnalysis" JSONB,
    "aiAnalyzedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterestFormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "defaultDuration" INTEGER NOT NULL DEFAULT 60,
    "isFeatured" BOOLEAN NOT NULL DEFAULT true,
    "rubricTemplateId" TEXT,
    "allowedRoles" TEXT[],
    "questionCategories" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewStageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stage" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewStageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewStageCriteria" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "scoreScale" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewStageCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewEvaluation" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "stageTemplateId" TEXT,
    "evaluatorId" TEXT,
    "evaluatorName" TEXT NOT NULL,
    "evaluatorEmail" TEXT,
    "overallScore" INTEGER,
    "overallNotes" TEXT,
    "recommendation" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewCriteriaScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "criteriaId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewCriteriaScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AssessmentType" NOT NULL,
    "inputMethod" "AssessmentInputMethod" NOT NULL DEFAULT 'CANDIDATE',
    "candidateSubmissionTypes" "CandidateSubmissionType"[],
    "durationMinutes" INTEGER,
    "passingScore" INTEGER,
    "instructions" TEXT,
    "externalUrl" TEXT,
    "externalPlatform" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "scoringRubric" JSONB,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "aiModel" TEXT,
    "questions" JSONB,
    "integrationConfig" JSONB,
    "scoringDimensions" JSONB,
    "benchmarkData" JSONB,
    "isFeatured" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateAssessment" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "overallScore" INTEGER,
    "scores" JSONB,
    "percentile" INTEGER,
    "resultUrl" TEXT,
    "resultData" JSONB,
    "recommendation" TEXT,
    "summary" TEXT,
    "strengths" JSONB,
    "risks" JSONB,
    "questionsForCandidate" JSONB,
    "responses" JSONB,
    "aiAnalysis" JSONB,
    "aiRecommendation" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "dimensionScores" JSONB,
    "benchmarkComparison" JSONB,
    "teamFitScore" DOUBLE PRECISION,
    "predictedPerformance" DOUBLE PRECISION,
    "predictedTenure" INTEGER,
    "submissionMethod" "AssessmentInputMethod",
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "submissionText" TEXT,
    "submissionUrl" TEXT,
    "submissionFiles" JSONB,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "extractedData" JSONB,
    "dashboardUrl" TEXT,
    "dashboardData" JSONB,
    "dailyUpdates" JSONB,
    "completionPercent" INTEGER,
    "qualityScore" INTEGER,
    "inviteSentAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "inviteToken" TEXT,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "notes" TEXT,
    "evaluatedBy" TEXT,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkTrialTemplate" (
    "id" TEXT NOT NULL,
    "assessmentTemplateId" TEXT NOT NULL,
    "tasks" JSONB NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 5,
    "defaultBuddyId" TEXT,
    "checkInSchedule" JSONB,
    "dashboardTemplateUrl" TEXT,
    "dashboardMetrics" JSONB,
    "evaluationCriteria" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkTrialTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAssessmentTemplate" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "triggerStage" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAssessmentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "followUp" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "jobId" TEXT,
    "interviewTypeId" TEXT,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "createdById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestionUsage" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "askedById" TEXT,
    "askedByName" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "wasAsked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewQuestionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAssignedQuestion" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "questionId" TEXT,
    "customText" TEXT,
    "category" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "wasAsked" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "saveToBank" BOOLEAN NOT NULL DEFAULT false,
    "assignedToInterviewerId" TEXT,
    "assignedToInterviewerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewAssignedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEmailThread" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "gmailThreadId" TEXT,
    "subject" TEXT NOT NULL,
    "recruiterEmail" TEXT NOT NULL,
    "recruiterId" TEXT,
    "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateEmailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEmail" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "gmailMessageId" TEXT,
    "messageIdHeader" TEXT,
    "inReplyTo" TEXT,
    "references" TEXT,
    "direction" "EmailDirection" NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "toEmails" TEXT[],
    "ccEmails" TEXT[],
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "attachments" JSONB,
    "status" "EmailStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickedAt" TIMESTAMP(3),
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "totalReadTime" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT,
    "category" "EmailCategory",
    "categoryConfidence" DOUBLE PRECISION,
    "categorizedAt" TIMESTAMP(3),
    "categorizedBy" TEXT,
    "isInHiringPeriod" BOOLEAN NOT NULL DEFAULT false,
    "participants" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "jobId" TEXT,
    "stage" TEXT,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "aiEnhancementEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiEnhancementPrompt" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailReminder" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "triggerAfterHours" INTEGER NOT NULL DEFAULT 72,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "escalateAfterHours" INTEGER,
    "escalatedToId" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTrackingEvent" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEmailSync" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailsFound" INTEGER NOT NULL DEFAULT 0,
    "emailsNew" INTEGER NOT NULL DEFAULT 0,
    "emailsFailed" INTEGER NOT NULL DEFAULT 0,
    "syncStatus" TEXT NOT NULL,
    "errorMessage" TEXT,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "categorizationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "categorizedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateEmailSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateAIAnalysis" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "analysisType" "AnalysisType" NOT NULL,
    "triggerStage" TEXT,
    "triggerEvent" TEXT,
    "interviewId" TEXT,
    "assessmentId" TEXT,
    "summary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "concerns" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "overallScore" INTEGER,
    "scoreBreakdown" JSONB,
    "sentimentScore" INTEGER,
    "sentimentChange" INTEGER,
    "sentimentReason" TEXT,
    "tabSummaries" JSONB,
    "pressValues" JSONB,
    "recommendation" TEXT,
    "confidence" INTEGER,
    "mustValidatePoints" JSONB,
    "nextStageQuestions" JSONB,
    "aiProvider" TEXT,
    "aiModel" TEXT,
    "generatedBy" TEXT,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateAIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "gmailConnected" BOOLEAN NOT NULL DEFAULT false,
    "gmailDomain" TEXT,
    "gmailServiceAccountKey" TEXT,
    "defaultFromName" TEXT,
    "defaultCcEmail" TEXT,
    "defaultReplyTo" TEXT,
    "trackOpens" BOOLEAN NOT NULL DEFAULT true,
    "trackClicks" BOOLEAN NOT NULL DEFAULT true,
    "autoSendStages" JSONB,
    "autoSendOnApplication" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueuedStageEmail" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "templateId" TEXT,
    "recruiterId" TEXT NOT NULL,
    "recruiterEmail" TEXT NOT NULL,
    "recruiterName" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "emailId" TEXT,
    "skipAutoEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueuedStageEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "daysBeforeFirstReminder" INTEGER NOT NULL DEFAULT 3,
    "daysBetweenReminders" INTEGER NOT NULL DEFAULT 3,
    "maxReminders" INTEGER NOT NULL DEFAULT 3,
    "reminderTemplateId" TEXT,
    "daysBeforeEscalation" INTEGER NOT NULL DEFAULT 7,
    "escalationMethod" TEXT NOT NULL DEFAULT 'both',
    "escalateTo" TEXT NOT NULL DEFAULT 'assigned',
    "stageOverrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueAIInterviewsSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "analyzeOnApplication" BOOLEAN NOT NULL DEFAULT true,
    "analyzeOnStageComplete" BOOLEAN NOT NULL DEFAULT true,
    "analyzeOnInterview" BOOLEAN NOT NULL DEFAULT true,
    "analyzeOnAssessment" BOOLEAN NOT NULL DEFAULT true,
    "analysisDepth" TEXT NOT NULL DEFAULT 'standard',
    "trackSentiment" BOOLEAN NOT NULL DEFAULT true,
    "sentimentAlertThreshold" INTEGER NOT NULL DEFAULT 20,
    "customAnalysisPrompt" TEXT,
    "enableTabSummaries" BOOLEAN NOT NULL DEFAULT true,
    "tabSummaryRefresh" TEXT NOT NULL DEFAULT 'on_view',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueAIInterviewsSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSettings" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "apiSecretEncrypted" TEXT,
    "webhookSecretEncrypted" TEXT,
    "config" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "assessmentId" TEXT,
    "candidateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandupSyncSettings" (
    "id" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncOnHire" BOOLEAN NOT NULL DEFAULT true,
    "syncOnTermination" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastTestAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandupSyncSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandupTeamMapping" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "standupTeamName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandupTeamMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_token_key" ON "UserInvite"("token");

-- CreateIndex
CREATE INDEX "UserInvite_email_idx" ON "UserInvite"("email");

-- CreateIndex
CREATE INDEX "UserInvite_invitedById_idx" ON "UserInvite"("invitedById");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_createdById_idx" ON "ApiToken"("createdById");

-- CreateIndex
CREATE INDEX "ApiToken_revokedAt_idx" ON "ApiToken"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_personalEmail_key" ON "Employee"("personalEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_workEmail_key" ON "Employee"("workEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_candidateId_key" ON "Employee"("candidateId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_department_idx" ON "Employee"("department");

-- CreateIndex
CREATE INDEX "Employee_managerId_idx" ON "Employee"("managerId");

-- CreateIndex
CREATE INDEX "Employee_candidateId_idx" ON "Employee"("candidateId");

-- CreateIndex
CREATE INDEX "Employee_companyStageFlowSnapshotId_idx" ON "Employee"("companyStageFlowSnapshotId");

-- CreateIndex
CREATE INDEX "EmployeeRoleHistory_employeeId_effectiveDate_idx" ON "EmployeeRoleHistory"("employeeId", "effectiveDate");

-- CreateIndex
CREATE INDEX "EmergencyContact_employeeId_idx" ON "EmergencyContact"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_esignEnvelopeId_key" ON "Offer"("esignEnvelopeId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE INDEX "Offer_candidateEmail_idx" ON "Offer"("candidateEmail");

-- CreateIndex
CREATE INDEX "App_type_idx" ON "App"("type");

-- CreateIndex
CREATE INDEX "App_archivedAt_idx" ON "App"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "App_type_name_key" ON "App"("type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AppConnection_appId_domain_key" ON "AppConnection"("appId", "domain");

-- CreateIndex
CREATE INDEX "AppProvisioningRule_appId_isActive_idx" ON "AppProvisioningRule"("appId", "isActive");

-- CreateIndex
CREATE INDEX "AppAccount_status_idx" ON "AppAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AppAccount_employeeId_appId_key" ON "AppAccount"("employeeId", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "WebflowFieldMapping_appConnectionId_key" ON "WebflowFieldMapping"("appConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingWorkflow_accessToken_key" ON "OnboardingWorkflow"("accessToken");

-- CreateIndex
CREATE INDEX "OnboardingWorkflow_employeeId_idx" ON "OnboardingWorkflow"("employeeId");

-- CreateIndex
CREATE INDEX "OnboardingWorkflow_status_idx" ON "OnboardingWorkflow"("status");

-- CreateIndex
CREATE INDEX "OnboardingTask_workflowId_status_idx" ON "OnboardingTask"("workflowId", "status");

-- CreateIndex
CREATE INDEX "OffboardingWorkflow_employeeId_idx" ON "OffboardingWorkflow"("employeeId");

-- CreateIndex
CREATE INDEX "OffboardingWorkflow_status_idx" ON "OffboardingWorkflow"("status");

-- CreateIndex
CREATE INDEX "OffboardingWorkflow_scheduledFor_idx" ON "OffboardingWorkflow"("scheduledFor");

-- CreateIndex
CREATE INDEX "OffboardingTask_workflowId_status_idx" ON "OffboardingTask"("workflowId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_archivedAt_idx" ON "Notification"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "JobExecution_jobName_status_idx" ON "JobExecution"("jobName", "status");

-- CreateIndex
CREATE INDEX "JobExecution_createdAt_idx" ON "JobExecution"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_id_key" ON "Organization"("id");

-- CreateIndex
CREATE INDEX "LegalEntity_organizationId_isActive_idx" ON "LegalEntity"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_organizationId_name_key" ON "LegalEntity"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Advisor_email_key" ON "Advisor"("email");

-- CreateIndex
CREATE INDEX "Advisor_email_idx" ON "Advisor"("email");

-- CreateIndex
CREATE INDEX "Advisor_isActive_idx" ON "Advisor"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Team_isActive_idx" ON "Team"("isActive");

-- CreateIndex
CREATE INDEX "Team_parentId_idx" ON "Team"("parentId");

-- CreateIndex
CREATE INDEX "OnboardingTaskTemplate_organizationId_sortOrder_idx" ON "OnboardingTaskTemplate"("organizationId", "sortOrder");

-- CreateIndex
CREATE INDEX "OnboardingTaskTemplate_organizationId_isActive_idx" ON "OnboardingTaskTemplate"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "OnboardingTaskTemplate_organizationId_appId_idx" ON "OnboardingTaskTemplate"("organizationId", "appId");

-- CreateIndex
CREATE INDEX "OffboardingTaskTemplate_organizationId_sortOrder_idx" ON "OffboardingTaskTemplate"("organizationId", "sortOrder");

-- CreateIndex
CREATE INDEX "OffboardingTaskTemplate_organizationId_isActive_idx" ON "OffboardingTaskTemplate"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "OffboardingTaskTemplate_organizationId_appId_idx" ON "OffboardingTaskTemplate"("organizationId", "appId");

-- CreateIndex
CREATE INDEX "OffboardingEmployeeTask_organizationId_sortOrder_idx" ON "OffboardingEmployeeTask"("organizationId", "sortOrder");

-- CreateIndex
CREATE INDEX "OffboardingEmployeeTask_organizationId_isActive_idx" ON "OffboardingEmployeeTask"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "SignatureBlock_signatoryName_idx" ON "SignatureBlock"("signatoryName");

-- CreateIndex
CREATE INDEX "AIChat_userId_updatedAt_idx" ON "AIChat"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AIChatMessage_chatId_createdAt_idx" ON "AIChatMessage"("chatId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AICustomTool_name_key" ON "AICustomTool"("name");

-- CreateIndex
CREATE INDEX "AICustomTool_category_isActive_idx" ON "AICustomTool"("category", "isActive");

-- CreateIndex
CREATE INDEX "AICustomTool_isActive_isBuiltIn_idx" ON "AICustomTool"("isActive", "isBuiltIn");

-- CreateIndex
CREATE INDEX "AICustomTool_approvalStatus_idx" ON "AICustomTool"("approvalStatus");

-- CreateIndex
CREATE INDEX "AICustomTool_autoCreated_idx" ON "AICustomTool"("autoCreated");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantApproval_planId_key" ON "AssistantApproval"("planId");

-- CreateIndex
CREATE INDEX "AssistantApproval_userId_status_idx" ON "AssistantApproval"("userId", "status");

-- CreateIndex
CREATE INDEX "AssistantApproval_expiresAt_idx" ON "AssistantApproval"("expiresAt");

-- CreateIndex
CREATE INDEX "DailyBrief_orgId_date_idx" ON "DailyBrief"("orgId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBrief_orgId_date_key" ON "DailyBrief"("orgId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HiringFlow_name_key" ON "HiringFlow"("name");

-- CreateIndex
CREATE INDEX "HiringFlow_isActive_idx" ON "HiringFlow"("isActive");

-- CreateIndex
CREATE INDEX "HiringFlow_isDefault_idx" ON "HiringFlow"("isDefault");

-- CreateIndex
CREATE INDEX "HiringFlowSnapshot_flowId_idx" ON "HiringFlowSnapshot"("flowId");

-- CreateIndex
CREATE UNIQUE INDEX "HiringFlowSnapshot_flowId_version_key" ON "HiringFlowSnapshot"("flowId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyStageFlow_name_key" ON "CompanyStageFlow"("name");

-- CreateIndex
CREATE INDEX "CompanyStageFlow_isActive_idx" ON "CompanyStageFlow"("isActive");

-- CreateIndex
CREATE INDEX "CompanyStageFlow_isDefault_idx" ON "CompanyStageFlow"("isDefault");

-- CreateIndex
CREATE INDEX "CompanyStageFlowSnapshot_flowId_idx" ON "CompanyStageFlowSnapshot"("flowId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyStageFlowSnapshot_flowId_version_key" ON "CompanyStageFlowSnapshot"("flowId", "version");

-- CreateIndex
CREATE INDEX "JobDescription_name_idx" ON "JobDescription"("name");

-- CreateIndex
CREATE INDEX "JobDescription_department_idx" ON "JobDescription"("department");

-- CreateIndex
CREATE INDEX "JobDescription_isActive_idx" ON "JobDescription"("isActive");

-- CreateIndex
CREATE INDEX "HiringRubric_name_idx" ON "HiringRubric"("name");

-- CreateIndex
CREATE INDEX "HiringRubric_isActive_idx" ON "HiringRubric"("isActive");

-- CreateIndex
CREATE INDEX "RubricCriteria_rubricId_sortOrder_idx" ON "RubricCriteria"("rubricId", "sortOrder");

-- CreateIndex
CREATE INDEX "Competency_category_idx" ON "Competency"("category");

-- CreateIndex
CREATE INDEX "Competency_isActive_idx" ON "Competency"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Competency_name_category_key" ON "Competency"("name", "category");

-- CreateIndex
CREATE INDEX "CompetencyFrameworkSource_type_idx" ON "CompetencyFrameworkSource"("type");

-- CreateIndex
CREATE INDEX "CompetencyFrameworkSource_lastSyncedAt_idx" ON "CompetencyFrameworkSource"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "CompetencyFrameworkSource_cacheValidUntil_idx" ON "CompetencyFrameworkSource"("cacheValidUntil");

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyFrameworkSource_type_department_key" ON "CompetencyFrameworkSource"("type", "department");

-- CreateIndex
CREATE INDEX "CoreCompetency_sourceId_sortOrder_idx" ON "CoreCompetency"("sourceId", "sortOrder");

-- CreateIndex
CREATE INDEX "SubCompetency_coreCompetencyId_sortOrder_idx" ON "SubCompetency"("coreCompetencyId", "sortOrder");

-- CreateIndex
CREATE INDEX "SubCompetency_isActive_idx" ON "SubCompetency"("isActive");

-- CreateIndex
CREATE INDEX "JobCompetencyRequirement_jobId_idx" ON "JobCompetencyRequirement"("jobId");

-- CreateIndex
CREATE INDEX "JobCompetencyRequirement_subCompetencyId_idx" ON "JobCompetencyRequirement"("subCompetencyId");

-- CreateIndex
CREATE INDEX "JobCompetencyRequirement_validationStage_idx" ON "JobCompetencyRequirement"("validationStage");

-- CreateIndex
CREATE UNIQUE INDEX "JobCompetencyRequirement_jobId_subCompetencyId_key" ON "JobCompetencyRequirement"("jobId", "subCompetencyId");

-- CreateIndex
CREATE INDEX "CandidateCompetencyScore_candidateId_idx" ON "CandidateCompetencyScore"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateCompetencyScore_subCompetencyId_idx" ON "CandidateCompetencyScore"("subCompetencyId");

-- CreateIndex
CREATE INDEX "CandidateCompetencyScore_evaluatedAtStage_idx" ON "CandidateCompetencyScore"("evaluatedAtStage");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateCompetencyScore_candidateId_subCompetencyId_evalua_key" ON "CandidateCompetencyScore"("candidateId", "subCompetencyId", "evaluatedAtStage");

-- CreateIndex
CREATE INDEX "EmployeeCompetencyScore_employeeId_idx" ON "EmployeeCompetencyScore"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeCompetencyScore_subCompetencyId_idx" ON "EmployeeCompetencyScore"("subCompetencyId");

-- CreateIndex
CREATE INDEX "EmployeeCompetencyScore_lastAssessedAt_idx" ON "EmployeeCompetencyScore"("lastAssessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeCompetencyScore_employeeId_subCompetencyId_assessme_key" ON "EmployeeCompetencyScore"("employeeId", "subCompetencyId", "assessmentPeriod");

-- CreateIndex
CREATE INDEX "CompetencySyncLog_sourceId_createdAt_idx" ON "CompetencySyncLog"("sourceId", "createdAt");

-- CreateIndex
CREATE INDEX "CompetencySyncLog_status_idx" ON "CompetencySyncLog"("status");

-- CreateIndex
CREATE INDEX "CompetencySyncLog_createdAt_idx" ON "CompetencySyncLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_department_idx" ON "Job"("department");

-- CreateIndex
CREATE INDEX "Job_deadline_idx" ON "Job"("deadline");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Job_interestFormId_idx" ON "Job"("interestFormId");

-- CreateIndex
CREATE INDEX "Job_hiringFlowSnapshotId_idx" ON "Job"("hiringFlowSnapshotId");

-- CreateIndex
CREATE INDEX "Job_slug_idx" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "Job_isPublic_idx" ON "Job"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "Scorecard_jobId_key" ON "Scorecard"("jobId");

-- CreateIndex
CREATE INDEX "Scorecard_jobId_idx" ON "Scorecard"("jobId");

-- CreateIndex
CREATE INDEX "JobFollower_employeeId_idx" ON "JobFollower"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "JobFollower_jobId_employeeId_key" ON "JobFollower"("jobId", "employeeId");

-- CreateIndex
CREATE INDEX "JobAction_jobId_idx" ON "JobAction"("jobId");

-- CreateIndex
CREATE INDEX "JobAction_actionId_idx" ON "JobAction"("actionId");

-- CreateIndex
CREATE UNIQUE INDEX "JobAction_jobId_actionId_key" ON "JobAction"("jobId", "actionId");

-- CreateIndex
CREATE INDEX "JobCompetency_competencyId_idx" ON "JobCompetency"("competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "JobCompetency_jobId_competencyId_key" ON "JobCompetency"("jobId", "competencyId");

-- CreateIndex
CREATE INDEX "JobCandidate_jobId_stage_idx" ON "JobCandidate"("jobId", "stage");

-- CreateIndex
CREATE INDEX "JobCandidate_email_idx" ON "JobCandidate"("email");

-- CreateIndex
CREATE INDEX "JobCandidate_score_idx" ON "JobCandidate"("score");

-- CreateIndex
CREATE UNIQUE INDEX "JobCandidate_jobId_email_key" ON "JobCandidate"("jobId", "email");

-- CreateIndex
CREATE INDEX "CandidateInterview_candidateId_stage_idx" ON "CandidateInterview"("candidateId", "stage");

-- CreateIndex
CREATE INDEX "CandidateInterview_scheduledAt_idx" ON "CandidateInterview"("scheduledAt");

-- CreateIndex
CREATE INDEX "CandidateInterview_stageTemplateId_idx" ON "CandidateInterview"("stageTemplateId");

-- CreateIndex
CREATE INDEX "CandidateInterview_interviewTypeId_idx" ON "CandidateInterview"("interviewTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewerToken_token_key" ON "InterviewerToken"("token");

-- CreateIndex
CREATE INDEX "InterviewerToken_token_idx" ON "InterviewerToken"("token");

-- CreateIndex
CREATE INDEX "InterviewerToken_interviewId_idx" ON "InterviewerToken"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewerToken_interviewerEmail_idx" ON "InterviewerToken"("interviewerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Recruiter_email_key" ON "Recruiter"("email");

-- CreateIndex
CREATE INDEX "Recruiter_email_idx" ON "Recruiter"("email");

-- CreateIndex
CREATE INDEX "Recruiter_isActive_idx" ON "Recruiter"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterJob_accessToken_key" ON "RecruiterJob"("accessToken");

-- CreateIndex
CREATE INDEX "RecruiterJob_accessToken_idx" ON "RecruiterJob"("accessToken");

-- CreateIndex
CREATE INDEX "RecruiterJob_jobId_idx" ON "RecruiterJob"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterJob_recruiterId_jobId_key" ON "RecruiterJob"("recruiterId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterCandidate_candidateId_key" ON "RecruiterCandidate"("candidateId");

-- CreateIndex
CREATE INDEX "RecruiterCandidate_recruiterId_idx" ON "RecruiterCandidate"("recruiterId");

-- CreateIndex
CREATE UNIQUE INDEX "HiringSettings_organizationId_key" ON "HiringSettings"("organizationId");

-- CreateIndex
CREATE INDEX "InterestFormTemplate_isActive_idx" ON "InterestFormTemplate"("isActive");

-- CreateIndex
CREATE INDEX "InterestFormTemplate_isDefault_idx" ON "InterestFormTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "InterestFormQuestion_templateId_sortOrder_idx" ON "InterestFormQuestion"("templateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "InterestFormResponse_submissionToken_key" ON "InterestFormResponse"("submissionToken");

-- CreateIndex
CREATE INDEX "InterestFormResponse_templateId_idx" ON "InterestFormResponse"("templateId");

-- CreateIndex
CREATE INDEX "InterestFormResponse_candidateId_idx" ON "InterestFormResponse"("candidateId");

-- CreateIndex
CREATE INDEX "InterestFormResponse_candidateEmail_idx" ON "InterestFormResponse"("candidateEmail");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewType_slug_key" ON "InterviewType"("slug");

-- CreateIndex
CREATE INDEX "InterviewType_slug_idx" ON "InterviewType"("slug");

-- CreateIndex
CREATE INDEX "InterviewType_isActive_idx" ON "InterviewType"("isActive");

-- CreateIndex
CREATE INDEX "InterviewStageTemplate_stage_idx" ON "InterviewStageTemplate"("stage");

-- CreateIndex
CREATE INDEX "InterviewStageTemplate_jobId_idx" ON "InterviewStageTemplate"("jobId");

-- CreateIndex
CREATE INDEX "InterviewStageTemplate_isActive_idx" ON "InterviewStageTemplate"("isActive");

-- CreateIndex
CREATE INDEX "InterviewStageCriteria_stageId_sortOrder_idx" ON "InterviewStageCriteria"("stageId", "sortOrder");

-- CreateIndex
CREATE INDEX "InterviewEvaluation_interviewId_idx" ON "InterviewEvaluation"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewEvaluation_evaluatorId_idx" ON "InterviewEvaluation"("evaluatorId");

-- CreateIndex
CREATE INDEX "InterviewEvaluation_stageTemplateId_idx" ON "InterviewEvaluation"("stageTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewEvaluation_interviewId_evaluatorEmail_key" ON "InterviewEvaluation"("interviewId", "evaluatorEmail");

-- CreateIndex
CREATE INDEX "InterviewCriteriaScore_criteriaId_idx" ON "InterviewCriteriaScore"("criteriaId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewCriteriaScore_evaluationId_criteriaId_key" ON "InterviewCriteriaScore"("evaluationId", "criteriaId");

-- CreateIndex
CREATE INDEX "AssessmentTemplate_organizationId_type_idx" ON "AssessmentTemplate"("organizationId", "type");

-- CreateIndex
CREATE INDEX "AssessmentTemplate_teamId_idx" ON "AssessmentTemplate"("teamId");

-- CreateIndex
CREATE INDEX "AssessmentTemplate_isActive_idx" ON "AssessmentTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateAssessment_inviteToken_key" ON "CandidateAssessment"("inviteToken");

-- CreateIndex
CREATE INDEX "CandidateAssessment_candidateId_idx" ON "CandidateAssessment"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateAssessment_templateId_idx" ON "CandidateAssessment"("templateId");

-- CreateIndex
CREATE INDEX "CandidateAssessment_status_idx" ON "CandidateAssessment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateAssessment_candidateId_templateId_key" ON "CandidateAssessment"("candidateId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkTrialTemplate_assessmentTemplateId_key" ON "WorkTrialTemplate"("assessmentTemplateId");

-- CreateIndex
CREATE INDEX "JobAssessmentTemplate_jobId_idx" ON "JobAssessmentTemplate"("jobId");

-- CreateIndex
CREATE INDEX "JobAssessmentTemplate_templateId_idx" ON "JobAssessmentTemplate"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "JobAssessmentTemplate_jobId_templateId_key" ON "JobAssessmentTemplate"("jobId", "templateId");

-- CreateIndex
CREATE INDEX "InterviewQuestion_category_idx" ON "InterviewQuestion"("category");

-- CreateIndex
CREATE INDEX "InterviewQuestion_jobId_idx" ON "InterviewQuestion"("jobId");

-- CreateIndex
CREATE INDEX "InterviewQuestion_interviewTypeId_idx" ON "InterviewQuestion"("interviewTypeId");

-- CreateIndex
CREATE INDEX "InterviewQuestion_isActive_idx" ON "InterviewQuestion"("isActive");

-- CreateIndex
CREATE INDEX "InterviewQuestionUsage_interviewId_idx" ON "InterviewQuestionUsage"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewQuestionUsage_questionId_idx" ON "InterviewQuestionUsage"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewQuestionUsage_questionId_interviewId_key" ON "InterviewQuestionUsage"("questionId", "interviewId");

-- CreateIndex
CREATE INDEX "InterviewAssignedQuestion_interviewId_idx" ON "InterviewAssignedQuestion"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewAssignedQuestion_questionId_idx" ON "InterviewAssignedQuestion"("questionId");

-- CreateIndex
CREATE INDEX "InterviewAssignedQuestion_assignedToInterviewerId_idx" ON "InterviewAssignedQuestion"("assignedToInterviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateEmailThread_gmailThreadId_key" ON "CandidateEmailThread"("gmailThreadId");

-- CreateIndex
CREATE INDEX "CandidateEmailThread_candidateId_idx" ON "CandidateEmailThread"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateEmailThread_recruiterId_idx" ON "CandidateEmailThread"("recruiterId");

-- CreateIndex
CREATE INDEX "CandidateEmailThread_lastMessageAt_idx" ON "CandidateEmailThread"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateEmail_gmailMessageId_key" ON "CandidateEmail"("gmailMessageId");

-- CreateIndex
CREATE INDEX "CandidateEmail_threadId_idx" ON "CandidateEmail"("threadId");

-- CreateIndex
CREATE INDEX "CandidateEmail_status_idx" ON "CandidateEmail"("status");

-- CreateIndex
CREATE INDEX "CandidateEmail_sentAt_idx" ON "CandidateEmail"("sentAt");

-- CreateIndex
CREATE INDEX "CandidateEmail_category_idx" ON "CandidateEmail"("category");

-- CreateIndex
CREATE INDEX "CandidateEmail_isInHiringPeriod_idx" ON "CandidateEmail"("isInHiringPeriod");

-- CreateIndex
CREATE INDEX "EmailTemplate_category_idx" ON "EmailTemplate"("category");

-- CreateIndex
CREATE INDEX "EmailTemplate_stage_idx" ON "EmailTemplate"("stage");

-- CreateIndex
CREATE INDEX "EmailTemplate_isActive_idx" ON "EmailTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_slug_jobId_key" ON "EmailTemplate"("slug", "jobId");

-- CreateIndex
CREATE INDEX "EmailReminder_scheduledFor_idx" ON "EmailReminder"("scheduledFor");

-- CreateIndex
CREATE INDEX "EmailReminder_emailId_idx" ON "EmailReminder"("emailId");

-- CreateIndex
CREATE INDEX "EmailReminder_isCancelled_idx" ON "EmailReminder"("isCancelled");

-- CreateIndex
CREATE INDEX "EmailTrackingEvent_emailId_idx" ON "EmailTrackingEvent"("emailId");

-- CreateIndex
CREATE INDEX "EmailTrackingEvent_eventType_idx" ON "EmailTrackingEvent"("eventType");

-- CreateIndex
CREATE INDEX "EmailTrackingEvent_occurredAt_idx" ON "EmailTrackingEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "CandidateEmailSync_candidateId_idx" ON "CandidateEmailSync"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateEmailSync_syncStatus_idx" ON "CandidateEmailSync"("syncStatus");

-- CreateIndex
CREATE INDEX "CandidateAIAnalysis_candidateId_isLatest_idx" ON "CandidateAIAnalysis"("candidateId", "isLatest");

-- CreateIndex
CREATE INDEX "CandidateAIAnalysis_candidateId_analysisType_idx" ON "CandidateAIAnalysis"("candidateId", "analysisType");

-- CreateIndex
CREATE INDEX "CandidateAIAnalysis_triggerStage_idx" ON "CandidateAIAnalysis"("triggerStage");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateAIAnalysis_candidateId_version_key" ON "CandidateAIAnalysis"("candidateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSettings_organizationId_key" ON "EmailSettings"("organizationId");

-- CreateIndex
CREATE INDEX "QueuedStageEmail_status_scheduledFor_idx" ON "QueuedStageEmail"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "QueuedStageEmail_candidateId_idx" ON "QueuedStageEmail"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSettings_organizationId_key" ON "ReminderSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueAIInterviewsSettings_organizationId_key" ON "BlueAIInterviewsSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSettings_platform_key" ON "IntegrationSettings"("platform");

-- CreateIndex
CREATE INDEX "IntegrationSettings_platform_idx" ON "IntegrationSettings"("platform");

-- CreateIndex
CREATE INDEX "IntegrationSettings_isEnabled_idx" ON "IntegrationSettings"("isEnabled");

-- CreateIndex
CREATE INDEX "WebhookLog_source_idx" ON "WebhookLog"("source");

-- CreateIndex
CREATE INDEX "WebhookLog_status_idx" ON "WebhookLog"("status");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StandupTeamMapping_department_key" ON "StandupTeamMapping"("department");

-- CreateIndex
CREATE INDEX "StandupTeamMapping_department_idx" ON "StandupTeamMapping"("department");

-- CreateIndex
CREATE INDEX "StandupTeamMapping_isActive_idx" ON "StandupTeamMapping"("isActive");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "JobCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyStageFlowSnapshotId_fkey" FOREIGN KEY ("companyStageFlowSnapshotId") REFERENCES "CompanyStageFlowSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRoleHistory" ADD CONSTRAINT "EmployeeRoleHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferTemplateAttachment" ADD CONSTRAINT "OfferTemplateAttachment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OfferTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OfferTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferEvent" ADD CONSTRAINT "OfferEvent_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppConnection" ADD CONSTRAINT "AppConnection_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppProvisioningRule" ADD CONSTRAINT "AppProvisioningRule_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppAccount" ADD CONSTRAINT "AppAccount_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppAccount" ADD CONSTRAINT "AppAccount_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebflowFieldMapping" ADD CONSTRAINT "WebflowFieldMapping_appConnectionId_fkey" FOREIGN KEY ("appConnectionId") REFERENCES "AppConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingWorkflow" ADD CONSTRAINT "OnboardingWorkflow_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "OnboardingWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingWorkflow" ADD CONSTRAINT "OffboardingWorkflow_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingTask" ADD CONSTRAINT "OffboardingTask_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "OffboardingWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_auditLogId_fkey" FOREIGN KEY ("auditLogId") REFERENCES "AuditLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTaskTemplate" ADD CONSTRAINT "OnboardingTaskTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTaskTemplate" ADD CONSTRAINT "OnboardingTaskTemplate_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingTaskTemplate" ADD CONSTRAINT "OffboardingTaskTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingTaskTemplate" ADD CONSTRAINT "OffboardingTaskTemplate_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingEmployeeTask" ADD CONSTRAINT "OffboardingEmployeeTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIChat" ADD CONSTRAINT "AIChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIChatMessage" ADD CONSTRAINT "AIChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "AIChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringFlowSnapshot" ADD CONSTRAINT "HiringFlowSnapshot_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "HiringFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyStageFlowSnapshot" ADD CONSTRAINT "CompanyStageFlowSnapshot_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "CompanyStageFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriteria" ADD CONSTRAINT "RubricCriteria_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "HiringRubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreCompetency" ADD CONSTRAINT "CoreCompetency_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CompetencyFrameworkSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCompetency" ADD CONSTRAINT "SubCompetency_coreCompetencyId_fkey" FOREIGN KEY ("coreCompetencyId") REFERENCES "CoreCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCompetencyRequirement" ADD CONSTRAINT "JobCompetencyRequirement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCompetencyRequirement" ADD CONSTRAINT "JobCompetencyRequirement_subCompetencyId_fkey" FOREIGN KEY ("subCompetencyId") REFERENCES "SubCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCompetencyScore" ADD CONSTRAINT "CandidateCompetencyScore_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "JobCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCompetencyScore" ADD CONSTRAINT "CandidateCompetencyScore_subCompetencyId_fkey" FOREIGN KEY ("subCompetencyId") REFERENCES "SubCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompetencyScore" ADD CONSTRAINT "EmployeeCompetencyScore_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompetencyScore" ADD CONSTRAINT "EmployeeCompetencyScore_subCompetencyId_fkey" FOREIGN KEY ("subCompetencyId") REFERENCES "SubCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencySyncLog" ADD CONSTRAINT "CompetencySyncLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CompetencyFrameworkSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_hiringFlowSnapshotId_fkey" FOREIGN KEY ("hiringFlowSnapshotId") REFERENCES "HiringFlowSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "JobDescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_defaultOfferTemplateId_fkey" FOREIGN KEY ("defaultOfferTemplateId") REFERENCES "OfferTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_hiringManagerId_fkey" FOREIGN KEY ("hiringManagerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_interestFormId_fkey" FOREIGN KEY ("interestFormId") REFERENCES "InterestFormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFollower" ADD CONSTRAINT "JobFollower_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFollower" ADD CONSTRAINT "JobFollower_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAction" ADD CONSTRAINT "JobAction_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAction" ADD CONSTRAINT "JobAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "AICustomTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCompetency" ADD CONSTRAINT "JobCompetency_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCompetency" ADD CONSTRAINT "JobCompetency_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCandidate" ADD CONSTRAINT "JobCandidate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCandidate" ADD CONSTRAINT "JobCandidate_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInterview" ADD CONSTRAINT "CandidateInterview_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "JobCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInterview" ADD CONSTRAINT "CandidateInterview_interviewTypeId_fkey" FOREIGN KEY ("interviewTypeId") REFERENCES "InterviewType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewerToken" ADD CONSTRAINT "InterviewerToken_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "CandidateInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterJob" ADD CONSTRAINT "RecruiterJob_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterJob" ADD CONSTRAINT "RecruiterJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterCandidate" ADD CONSTRAINT "RecruiterCandidate_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterCandidate" ADD CONSTRAINT "RecruiterCandidate_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "JobCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestFormQuestion" ADD CONSTRAINT "InterestFormQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InterestFormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestFormResponse" ADD CONSTRAINT "InterestFormResponse_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InterestFormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestFormResponse" ADD CONSTRAINT "InterestFormResponse_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "JobCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewType" ADD CONSTRAINT "InterviewType_rubricTemplateId_fkey" FOREIGN KEY ("rubricTemplateId") REFERENCES "InterviewStageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewStageTemplate" ADD CONSTRAINT "InterviewStageTemplate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewStageCriteria" ADD CONSTRAINT "InterviewStageCriteria_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "InterviewStageTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "CandidateInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_stageTemplateId_fkey" FOREIGN KEY ("stageTemplateId") REFERENCES "InterviewStageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewCriteriaScore" ADD CONSTRAINT "InterviewCriteriaScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "InterviewEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewCriteriaScore" ADD CONSTRAINT "InterviewCriteriaScore_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "InterviewStageCriteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAssessment" ADD CONSTRAINT "CandidateAssessment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "JobCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAssessment" ADD CONSTRAINT "CandidateAssessment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTrialTemplate" ADD CONSTRAINT "WorkTrialTemplate_assessmentTemplateId_fkey" FOREIGN KEY ("assessmentTemplateId") REFERENCES "AssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssessmentTemplate" ADD CONSTRAINT "JobAssessmentTemplate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssessmentTemplate" ADD CONSTRAINT "JobAssessmentTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_interviewTypeId_fkey" FOREIGN KEY ("interviewTypeId") REFERENCES "InterviewType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestionUsage" ADD CONSTRAINT "InterviewQuestionUsage_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestionUsage" ADD CONSTRAINT "InterviewQuestionUsage_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "CandidateInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAssignedQuestion" ADD CONSTRAINT "InterviewAssignedQuestion_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "CandidateInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAssignedQuestion" ADD CONSTRAINT "InterviewAssignedQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEmailThread" ADD CONSTRAINT "CandidateEmailThread_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "JobCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEmail" ADD CONSTRAINT "CandidateEmail_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CandidateEmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEmail" ADD CONSTRAINT "CandidateEmail_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailReminder" ADD CONSTRAINT "EmailReminder_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "CandidateEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEmailSync" ADD CONSTRAINT "CandidateEmailSync_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "JobCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAIAnalysis" ADD CONSTRAINT "CandidateAIAnalysis_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "JobCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueuedStageEmail" ADD CONSTRAINT "QueuedStageEmail_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "JobCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

