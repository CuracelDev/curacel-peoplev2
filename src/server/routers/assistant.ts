import { z } from 'zod'
import { router, hrAdminProcedure, adminProcedure } from '@/lib/trpc'
import { TRPCError } from '@trpc/server'
import { encrypt, decrypt } from '@/lib/encryption'
import { createAuditLog } from '@/lib/audit'
import type { AIProvider, EmployeeStatus } from '@prisma/client'

// ============================================
// TYPES
// ============================================

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ToolResult {
  status: 'ok' | 'missing_fields' | 'error' | 'confirmation_required'
  missingFields?: string[]
  message?: string
  data?: unknown
  summary?: string
}

interface ModelOption {
  id: string
  label: string
}

function getAISettingsDelegate(ctx: { prisma: any }) {
  const delegate = ctx.prisma?.aISettings ?? ctx.prisma?.aiSettings
  if (!delegate) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'AI settings are unavailable. Run `npx prisma generate` (and migrate/push) to update Prisma Client.',
    })
  }
  return delegate
}

function getAIChatDelegate(ctx: { prisma: any }) {
  const delegate = ctx.prisma?.aIChat ?? ctx.prisma?.aiChat
  if (!delegate) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'AI chat history is unavailable. Run `npx prisma generate` (and migrate/push) to update Prisma Client.',
    })
  }
  return delegate
}

function getAIChatMessageDelegate(ctx: { prisma: any }) {
  const delegate = ctx.prisma?.aIChatMessage ?? ctx.prisma?.aiChatMessage
  if (!delegate) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'AI chat history is unavailable. Run `npx prisma generate` (and migrate/push) to update Prisma Client.',
    })
  }
  return delegate
}

function encryptKeyOrThrow(key: string) {
  try {
    return encrypt(key.trim())
  } catch (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to save AI settings because ENCRYPTION_KEY is not configured on the server.',
      cause: error,
    })
  }
}

// ============================================
// SYSTEM PROMPT
// ============================================

const SYSTEM_PROMPT = `You are an AI assistant for the Curacel People HR platform. You help HR administrators with contracts, onboarding, offboarding, integrations, employee management, hiring pipeline, and candidate analysis.

## Your Capabilities
You can manage contracts (create, update, send, resend, cancel), manage onboarding and offboarding workflows, control onboarding/offboarding tasks, view integrations and test connections, search audit logs, view notifications, provide analytics, search and view candidates in the hiring pipeline, list jobs and view their pipelines, and get AI-powered candidate analysis and recommendations.

## Important Guidelines

1. **ALWAYS Use Tools for Data**: You MUST use tools for ANY question about data. NEVER guess or make up data. For questions like "how many employees" use count_employees. For any question without a specific tool, use flexible_query. Always call a tool first, then respond with the data returned.

2. **Missing Fields**: If a tool requires fields that aren't provided, use the tool anyway - it will return the specific missing fields. Only ask for those exact missing fields in your response.

3. **Confirmation Required**: For high-impact actions, you MUST get explicit user confirmation before executing:
   - **Requires confirmation**: send_contract, resend_contract, cancel_contract, start_onboarding, start_offboarding, analyze_candidate
   - First call the tool with confirmed=false to get a summary
   - Present the summary and ask "Please confirm to proceed"
   - Only call with confirmed=true after user confirms with "yes", "confirm", "proceed", or similar
   - For cancel_contract, emphasize that this action cannot be undone
   - For analyze_candidate, explain that this will use AI credits and generate a fresh analysis

4. **Response Style**: Keep responses short, professional, and business-friendly. Use bullet points for lists. Don't explain what you're about to do - just do it and report results.

5. **Deep Links**: When you receive URLs in tool responses, include them in your response using markdown links so users can click through to the relevant pages.

6. **Data Privacy**: Respect RBAC - you operate within the user's permissions. Don't reference data you don't have access to.

## Available Tools

### Contracts
- find_contracts: Search contracts by candidate name/email and status
- create_contract_draft: Create a new contract draft
- update_contract_draft: Update a contract (only DRAFT/SENT/VIEWED)
- send_contract: Send a contract for signature (requires confirmation)
- resend_contract: Resend a SENT/VIEWED contract (requires confirmation)
- cancel_contract: Cancel a contract with reason (requires confirmation)

### Employees & Analytics
- get_employee: Look up employee by ID or name/email
- count_employees: Get total employee count (defaults to active, can filter by status)
- count_hires_by_year: Get hiring analytics by year
- flexible_query: Answer ANY database question using natural language (text-to-SQL)

### Onboarding
- start_onboarding: Start onboarding workflow (requires confirmation)
- get_onboarding_status: Get onboarding workflow progress
- complete_onboarding_task: Mark a manual task as complete
- run_onboarding_task: Run/retry an automated task
- skip_onboarding_task: Skip a task with reason

### Offboarding
- start_offboarding: Start offboarding (immediate or scheduled, requires confirmation)
- get_offboarding_status: Get offboarding workflow progress

### Integrations
- list_integrations: Show enabled apps and connection status
- test_integration_connection: Test an app's connection

### Notifications & Audit
- list_notifications: View recent notifications
- search_audit_log: Search audit logs with filters

### Proactive (V3)
- get_daily_brief: Get summary of pending contracts, upcoming starts, stuck workflows

### Bulk Operations (V3 - require dry run first)
- bulk_start_onboarding: Start onboarding for multiple employees (use dryRun=true first)
- bulk_resend_contracts: Resend contracts viewed for N days (use dryRun=true first)
- bulk_deprovision_access: Deprovision access for exited employees (use dryRun=true first)

### Candidates & Jobs (V4)
- search_candidates: Search candidates by name/email, filter by job or pipeline stage
- get_candidate: Get full candidate profile with AI analysis summary
- get_candidate_timeline: View candidate journey (applications, interviews, assessments)
- list_jobs: List job postings with optional status filter (DRAFT, ACTIVE, PAUSED, HIRED)
- get_job_pipeline: View pipeline breakdown for a job (candidates grouped by stage)

### AI Analysis (V4)
- get_candidate_analysis: Get the latest AI hiring analysis for a candidate
- analyze_candidate: Generate a new AI analysis for a candidate (requires confirmation)
- get_candidate_sentiment_history: Track candidate sentiment changes over evaluations

## V3 Bulk Operation Rules
For bulk operations, you MUST follow this two-step process:
1. **Dry run first**: Call with dryRun=true to get a preview and approvalToken
2. **Execute with approval**: Call again with the approvalToken to execute
- Approvals expire after 15 minutes
- Always show the preview to the user before asking them to approve
- Never execute bulk operations without going through the approval flow`

// ============================================
// TOOL DEFINITIONS (OpenAI Function Calling format)
// ============================================

const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'find_contracts',
      description: 'Search for contracts by candidate name, email, or status. Returns a list of matching contracts.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search term for candidate name or email',
          },
          status: {
            type: 'string',
            enum: ['DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED'],
            description: 'Filter by contract status',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default 10)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_contract_draft',
      description: 'Create a new contract in DRAFT status. Required fields: candidateName, candidateEmail, roleTitle, startDate, compensationAmount, currency. Optional: templateId, legalEntityId, signatureBlockId, location.',
      parameters: {
        type: 'object',
        properties: {
          candidateName: { type: 'string', description: 'Full name of the candidate' },
          candidateEmail: { type: 'string', description: 'Email address of the candidate' },
          roleTitle: { type: 'string', description: 'Job title/role' },
          startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
          compensationAmount: { type: 'number', description: 'Salary/compensation amount' },
          currency: { type: 'string', description: 'Currency code (e.g., USD, EUR, NGN)' },
          templateId: { type: 'string', description: 'ID of the offer template to use' },
          legalEntityId: { type: 'string', description: 'ID of the legal entity' },
          signatureBlockId: { type: 'string', description: 'ID of the signature block to use' },
          location: { type: 'string', description: 'Work location' },
        },
        required: ['candidateName', 'candidateEmail', 'roleTitle', 'startDate', 'compensationAmount', 'currency'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_contract',
      description: 'Send a contract for signature. Requires the contract to be in DRAFT status. Must set confirmed=true to actually send.',
      parameters: {
        type: 'object',
        properties: {
          contractId: { type: 'string', description: 'ID of the contract to send' },
          confirmed: { type: 'boolean', description: 'Set to true to confirm and send the contract' },
        },
        required: ['contractId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_employee',
      description: 'Look up an employee by ID, name, or email. If multiple matches are found, returns a list to choose from.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Employee ID (if known)' },
          search: { type: 'string', description: 'Name or email to search for' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'start_onboarding',
      description: 'Start an onboarding workflow for an employee. The employee must be in OFFER_SIGNED or HIRED_PENDING_START status. Must set confirmed=true to actually start.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', description: 'ID of the employee to onboard' },
          startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format (optional, uses employee start date if not provided)' },
          confirmed: { type: 'boolean', description: 'Set to true to confirm and start onboarding' },
        },
        required: ['employeeId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_onboarding_status',
      description: 'Get the status of an onboarding workflow for an employee.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', description: 'ID of the employee' },
          workflowId: { type: 'string', description: 'ID of the onboarding workflow (if known)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'count_hires_by_year',
      description: 'Get the count of employees hired in a given year. Includes employees with status: ACTIVE, HIRED_PENDING_START, OFFBOARDING, EXITED, or OFFER_SIGNED.',
      parameters: {
        type: 'object',
        properties: {
          year: { type: 'number', description: 'The year to count hires for (e.g., 2024)' },
        },
        required: ['year'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'count_employees',
      description: 'REQUIRED for any question about employee counts. Use for: "how many employees", "total employees", "employee count", "headcount", "staff count", "number of employees", "current employees", "active employees". Returns count and breakdown by status.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['ACTIVE', 'HIRED_PENDING_START', 'OFFBOARDING', 'EXITED', 'OFFER_SIGNED'],
            description: 'Filter by employee status. If not provided, returns count of all ACTIVE employees by default.',
          },
          includeAll: {
            type: 'boolean',
            description: 'If true, count all employees regardless of status. Otherwise counts only ACTIVE.',
          },
        },
      },
    },
  },
  // V5 Flexible Query Tool - Text-to-SQL
  {
    type: 'function' as const,
    function: {
      name: 'flexible_query',
      description: `Answer ANY database question using natural language. Use this when no specific tool exists for the query.

Examples of questions this can answer:
- "How many candidates applied this month?"
- "Which department has the most employees?"
- "List all jobs with more than 5 candidates"
- "What's the average time to hire?"
- "Show me employees who started in the last 30 days"
- "Count contracts by status"
- "Which jobs are in ACTIVE status?"

Available data: Employee, Job, JobCandidate, Offer, OnboardingWorkflow, OffboardingWorkflow, App, AppAccount, AuditLog, Team, CandidateInterview, CandidateAssessment, CandidateAIAnalysis`,
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The natural language question to answer about the database',
          },
        },
        required: ['question'],
      },
    },
  },
  // V2 Contract Tools
  {
    type: 'function' as const,
    function: {
      name: 'update_contract_draft',
      description: 'Update a contract draft. Only works for contracts in DRAFT, SENT, or VIEWED status. Cannot update SIGNED, DECLINED, EXPIRED, or CANCELLED contracts.',
      parameters: {
        type: 'object',
        properties: {
          contractId: { type: 'string', description: 'ID of the contract to update' },
          roleTitle: { type: 'string', description: 'Updated job title/role' },
          startDate: { type: 'string', description: 'Updated start date in YYYY-MM-DD format' },
          compensationAmount: { type: 'number', description: 'Updated salary/compensation amount' },
          currency: { type: 'string', description: 'Updated currency code' },
          location: { type: 'string', description: 'Updated work location' },
          legalEntityId: { type: 'string', description: 'Updated legal entity ID' },
          signatureBlockId: { type: 'string', description: 'Updated signature block ID' },
        },
        required: ['contractId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'resend_contract',
      description: 'Resend a contract for signature. Only works for contracts in SENT or VIEWED status. Must set confirmed=true to actually resend.',
      parameters: {
        type: 'object',
        properties: {
          contractId: { type: 'string', description: 'ID of the contract to resend' },
          confirmed: { type: 'boolean', description: 'Set to true to confirm and resend the contract' },
        },
        required: ['contractId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_contract',
      description: 'Cancel a contract. Cannot cancel contracts that are already SIGNED. Requires a reason and must set confirmed=true to actually cancel.',
      parameters: {
        type: 'object',
        properties: {
          contractId: { type: 'string', description: 'ID of the contract to cancel' },
          reason: { type: 'string', description: 'Reason for cancelling the contract' },
          confirmed: { type: 'boolean', description: 'Set to true to confirm and cancel the contract' },
        },
        required: ['contractId', 'reason'],
      },
    },
  },
  // V2 Onboarding Task Tools
  {
    type: 'function' as const,
    function: {
      name: 'complete_onboarding_task',
      description: 'Mark a manual onboarding task as complete.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task to complete' },
          notes: { type: 'string', description: 'Optional completion notes' },
        },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_onboarding_task',
      description: 'Trigger or retry an automated onboarding task.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the automated task to run' },
        },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'skip_onboarding_task',
      description: 'Skip an onboarding task with a required reason.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task to skip' },
          reason: { type: 'string', description: 'Reason for skipping the task' },
        },
        required: ['taskId', 'reason'],
      },
    },
  },
  // V2 Offboarding Tools
  {
    type: 'function' as const,
    function: {
      name: 'start_offboarding',
      description: 'Start an offboarding workflow for an employee. Must set confirmed=true to actually start.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', description: 'ID of the employee to offboard' },
          isImmediate: { type: 'boolean', description: 'Whether offboarding should start immediately (default: false)' },
          endDate: { type: 'string', description: 'Employee end date in YYYY-MM-DD format (required if not immediate)' },
          reason: { type: 'string', description: 'Reason for offboarding (e.g., resignation, termination)' },
          notes: { type: 'string', description: 'Additional notes' },
          confirmed: { type: 'boolean', description: 'Set to true to confirm and start offboarding' },
        },
        required: ['employeeId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_offboarding_status',
      description: 'Get the status of an offboarding workflow for an employee.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', description: 'ID of the employee' },
          workflowId: { type: 'string', description: 'ID of the offboarding workflow (if known)' },
        },
      },
    },
  },
  // V2 Integration Tools
  {
    type: 'function' as const,
    function: {
      name: 'list_integrations',
      description: 'List all enabled app integrations and their connection status.',
      parameters: {
        type: 'object',
        properties: {
          includeDisabled: { type: 'boolean', description: 'Include disabled apps (default: false)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'test_integration_connection',
      description: 'Test the connection for an app integration.',
      parameters: {
        type: 'object',
        properties: {
          appId: { type: 'string', description: 'ID of the app to test' },
        },
        required: ['appId'],
      },
    },
  },
  // V2 Notification & Audit Tools
  {
    type: 'function' as const,
    function: {
      name: 'list_notifications',
      description: 'List recent notifications for the current user.',
      parameters: {
        type: 'object',
        properties: {
          includeRead: { type: 'boolean', description: 'Include read notifications (default: false)' },
          limit: { type: 'number', description: 'Maximum number of results (default: 10)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_audit_log',
      description: 'Search the audit log with filters.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'Filter by action type (e.g., OFFER_SENT, ONBOARDING_STARTED)' },
          resourceType: { type: 'string', description: 'Filter by resource type (e.g., offer, employee)' },
          resourceId: { type: 'string', description: 'Filter by specific resource ID' },
          startDate: { type: 'string', description: 'Filter from date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'Filter to date (YYYY-MM-DD)' },
          limit: { type: 'number', description: 'Maximum number of results (default: 20)' },
        },
      },
    },
  },
  // V3 Proactive Tools
  {
    type: 'function' as const,
    function: {
      name: 'get_daily_brief',
      description: 'Get a daily brief summary of pending contracts, upcoming starts, and stuck workflows.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  // V3 Bulk Operations (require dryRun then approval)
  {
    type: 'function' as const,
    function: {
      name: 'bulk_start_onboarding',
      description: 'Start onboarding for multiple employees. Use dryRun=true first to preview, then approvalToken to execute.',
      parameters: {
        type: 'object',
        properties: {
          startDateFrom: { type: 'string', description: 'Include employees with start date from (YYYY-MM-DD)' },
          startDateTo: { type: 'string', description: 'Include employees with start date to (YYYY-MM-DD)' },
          dryRun: { type: 'boolean', description: 'If true, returns preview without executing. Required before execution.' },
          approvalToken: { type: 'string', description: 'Approval token from dry run to execute the bulk operation' },
        },
        required: ['startDateFrom', 'startDateTo'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bulk_resend_contracts',
      description: 'Resend contracts that have been in VIEWED status for N days. Use dryRun=true first to preview.',
      parameters: {
        type: 'object',
        properties: {
          viewedDaysAgo: { type: 'number', description: 'Contracts viewed more than N days ago (default: 3)' },
          dryRun: { type: 'boolean', description: 'If true, returns preview without executing. Required before execution.' },
          approvalToken: { type: 'string', description: 'Approval token from dry run to execute the bulk operation' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bulk_deprovision_access',
      description: 'Deprovision app access for exited employees. Use dryRun=true first to preview.',
      parameters: {
        type: 'object',
        properties: {
          includeOffboarding: { type: 'boolean', description: 'Include employees in OFFBOARDING status (default: false, only EXITED)' },
          dryRun: { type: 'boolean', description: 'If true, returns preview without executing. Required before execution.' },
          approvalToken: { type: 'string', description: 'Approval token from dry run to execute the bulk operation' },
        },
      },
    },
  },
  // V4 Hiring Pipeline Tools
  {
    type: 'function' as const,
    function: {
      name: 'search_candidates',
      description: 'Search for candidates by name or email. Optionally filter by job or pipeline stage.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Name or email to search' },
          jobId: { type: 'string', description: 'Filter by specific job ID' },
          stage: {
            type: 'string',
            enum: ['APPLIED', 'HR_SCREEN', 'TEAM_CHAT', 'TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED', 'REJECTED', 'ARCHIVED'],
            description: 'Filter by pipeline stage',
          },
          limit: { type: 'number', description: 'Maximum number of results (default 10)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_candidate',
      description: 'Get detailed candidate profile including AI analysis summary, scores, and recommendations.',
      parameters: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: 'ID of the candidate' },
        },
        required: ['candidateId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_candidate_timeline',
      description: 'View a candidate\'s journey: applications, interviews, assessments, and stage transitions.',
      parameters: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: 'ID of the candidate' },
        },
        required: ['candidateId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_jobs',
      description: 'List job postings. Filter by status (DRAFT, ACTIVE, PAUSED, HIRED).',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'HIRED'],
            description: 'Filter by job status',
          },
          limit: { type: 'number', description: 'Maximum number of results (default 10)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_job_pipeline',
      description: 'View candidates at each pipeline stage for a specific job.',
      parameters: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'ID of the job' },
        },
        required: ['jobId'],
      },
    },
  },
  // V4 AI Analysis Tools
  {
    type: 'function' as const,
    function: {
      name: 'get_candidate_analysis',
      description: 'Get the latest AI hiring analysis for a candidate including recommendation, scores, strengths, and concerns.',
      parameters: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: 'ID of the candidate' },
        },
        required: ['candidateId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'analyze_candidate',
      description: 'Trigger a new AI analysis for a candidate. Requires confirmation before executing.',
      parameters: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: 'ID of the candidate to analyze' },
          analysisType: {
            type: 'string',
            enum: ['APPLICATION_REVIEW', 'INTERVIEW_ANALYSIS', 'ASSESSMENT_REVIEW', 'STAGE_SUMMARY', 'COMPREHENSIVE'],
            description: 'Type of analysis to generate (default: COMPREHENSIVE)',
          },
          confirmed: { type: 'boolean', description: 'Set to true to confirm and generate the analysis' },
        },
        required: ['candidateId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_candidate_sentiment_history',
      description: 'Track sentiment and recommendation changes for a candidate across all evaluation stages.',
      parameters: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: 'ID of the candidate' },
        },
        required: ['candidateId'],
      },
    },
  },
]

// ============================================
// TOOL IMPLEMENTATIONS
// ============================================

// Sanitize args for logging (remove sensitive fields)
function sanitizeArgsForLogging(args: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'apiKey', 'token', 'secret', 'key']
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(args)) {
    if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

// ============================================
// V3: GOVERNANCE LAYER - TOOL PERMISSIONS BY ROLE
// ============================================

const TOOL_PERMISSIONS: Record<string, string[]> = {
  // SUPER_ADMIN and HR_ADMIN have full access
  SUPER_ADMIN: ['*'],
  HR_ADMIN: ['*'],

  // IT_ADMIN: integrations, onboarding/offboarding automation tasks
  IT_ADMIN: [
    'list_integrations',
    'test_integration_connection',
    'run_onboarding_task',
    'get_onboarding_status',
    'get_offboarding_status',
    'list_notifications',
    'search_audit_log',
    'get_daily_brief',
    // V3 bulk ops
    'bulk_deprovision_access',
  ],

  // MANAGER: read-only analytics + onboarding/offboarding visibility
  MANAGER: [
    'find_contracts',
    'get_employee',
    'get_onboarding_status',
    'get_offboarding_status',
    'count_hires_by_year',
    'count_employees',
    'flexible_query',
    'get_daily_brief',
    'list_notifications',
    // V4 Hiring Pipeline (read-only)
    'search_candidates',
    'get_candidate',
    'get_candidate_timeline',
    'list_jobs',
    'get_job_pipeline',
    'get_candidate_analysis',
    'get_candidate_sentiment_history',
  ],

  // EMPLOYEE: minimal profile queries only
  EMPLOYEE: [
    'get_employee', // Can only query their own profile - enforced in tool
  ],
}

function hasToolPermission(role: string, toolName: string): boolean {
  const permissions = TOOL_PERMISSIONS[role]
  if (!permissions) return false
  if (permissions.includes('*')) return true
  return permissions.includes(toolName)
}

function getRequiredRolesForTool(toolName: string): string[] {
  const roles: string[] = []
  for (const [role, permissions] of Object.entries(TOOL_PERMISSIONS)) {
    if (permissions.includes('*') || permissions.includes(toolName)) {
      roles.push(role)
    }
  }
  return roles
}

// ============================================
// V3: RATE LIMITING
// ============================================

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX_CALLS = 100

// In-memory rate limit store (would use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now()
  const key = `ratelimit:${userId}`

  let entry = rateLimitStore.get(key)

  // Reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
    rateLimitStore.set(key, entry)
  }

  const allowed = entry.count < RATE_LIMIT_MAX_CALLS
  const remaining = Math.max(0, RATE_LIMIT_MAX_CALLS - entry.count)

  if (allowed) {
    entry.count++
  }

  return { allowed, remaining, resetAt: new Date(entry.resetAt) }
}

// ============================================
// V3: DRY-RUN & APPROVAL WORKFLOW
// ============================================

const APPROVAL_TTL_MS = 15 * 60 * 1000 // 15 minutes

interface DryRunResult {
  planId: string
  preview: {
    action: string
    affectedCount: number
    items: Array<{ id: string; name: string; status?: string }>
  }
  expiresAt: Date
}

async function createApprovalPlan(
  ctx: { prisma: any; user: { id: string } },
  toolName: string,
  dryRunData: unknown,
  orgId: string
): Promise<DryRunResult> {
  const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  const expiresAt = new Date(Date.now() + APPROVAL_TTL_MS)

  await ctx.prisma.assistantApproval.create({
    data: {
      orgId,
      userId: ctx.user.id,
      planId,
      toolName,
      dryRunData: dryRunData as any,
      status: 'PENDING',
      expiresAt,
    },
  })

  return {
    planId,
    preview: dryRunData as DryRunResult['preview'],
    expiresAt,
  }
}

async function validateAndConsumeApproval(
  ctx: { prisma: any; user: { id: string } },
  approvalToken: string,
  expectedToolName: string
): Promise<{ valid: boolean; error?: string; data?: unknown }> {
  const approval = await ctx.prisma.assistantApproval.findUnique({
    where: { planId: approvalToken },
  })

  if (!approval) {
    return { valid: false, error: 'Approval token not found. Please run the command with dryRun=true first.' }
  }

  if (approval.userId !== ctx.user.id) {
    return { valid: false, error: 'This approval belongs to a different user.' }
  }

  if (approval.toolName !== expectedToolName) {
    return { valid: false, error: 'This approval is for a different operation.' }
  }

  if (approval.status !== 'PENDING') {
    return { valid: false, error: `This approval has already been ${approval.status.toLowerCase()}.` }
  }

  if (new Date() > approval.expiresAt) {
    await ctx.prisma.assistantApproval.update({
      where: { planId: approvalToken },
      data: { status: 'EXPIRED' },
    })
    return { valid: false, error: 'This approval has expired. Please run the command again with dryRun=true.' }
  }

  // Mark as approved
  await ctx.prisma.assistantApproval.update({
    where: { planId: approvalToken },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: ctx.user.id,
    },
  })

  return { valid: true, data: approval.dryRunData }
}

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string; role: string; employeeId?: string } }
): Promise<ToolResult> {
  const startTime = Date.now()
  const sanitizedArgs = sanitizeArgsForLogging(args)

  // V3: Check role-based permissions
  if (!hasToolPermission(ctx.user.role, toolName)) {
    console.log(`[Assistant] Permission denied: ${toolName}`, {
      userId: ctx.user.id,
      role: ctx.user.role,
    })
    return {
      status: 'error',
      message: `You don't have permission to use ${toolName}. This tool requires ${getRequiredRolesForTool(toolName).join(' or ')} role.`,
    }
  }

  // V3: Check rate limit
  const rateLimit = checkRateLimit(ctx.user.id)
  if (!rateLimit.allowed) {
    console.log(`[Assistant] Rate limit exceeded: ${toolName}`, {
      userId: ctx.user.id,
      resetAt: rateLimit.resetAt,
    })
    return {
      status: 'error',
      message: `Rate limit exceeded. You have used all ${RATE_LIMIT_MAX_CALLS} tool calls this hour. Limit resets at ${rateLimit.resetAt.toISOString()}.`,
    }
  }

  console.log(`[Assistant] Tool start: ${toolName}`, {
    userId: ctx.user.id,
    role: ctx.user.role,
    args: sanitizedArgs,
    rateLimitRemaining: rateLimit.remaining,
  })

  try {
    let result: ToolResult
    switch (toolName) {
      case 'find_contracts':
        result = await findContracts(args, ctx)
        break
      case 'create_contract_draft':
        result = await createContractDraft(args, ctx)
        break
      case 'send_contract':
        result = await sendContract(args, ctx)
        break
      case 'get_employee':
        result = await getEmployee(args, ctx)
        break
      case 'start_onboarding':
        result = await startOnboarding(args, ctx)
        break
      case 'get_onboarding_status':
        result = await getOnboardingStatus(args, ctx)
        break
      case 'count_hires_by_year':
        result = await countHiresByYear(args, ctx)
        break
      case 'count_employees':
        result = await countEmployees(args, ctx)
        break
      case 'flexible_query':
        result = await flexibleQuery(args, ctx)
        break
      // V2 Contract Tools
      case 'update_contract_draft':
        result = await updateContractDraft(args, ctx)
        break
      case 'resend_contract':
        result = await resendContract(args, ctx)
        break
      case 'cancel_contract':
        result = await cancelContract(args, ctx)
        break
      // V2 Onboarding Task Tools
      case 'complete_onboarding_task':
        result = await completeOnboardingTask(args, ctx)
        break
      case 'run_onboarding_task':
        result = await runOnboardingTask(args, ctx)
        break
      case 'skip_onboarding_task':
        result = await skipOnboardingTask(args, ctx)
        break
      // V2 Offboarding Tools
      case 'start_offboarding':
        result = await startOffboarding(args, ctx)
        break
      case 'get_offboarding_status':
        result = await getOffboardingStatus(args, ctx)
        break
      // V2 Integration Tools
      case 'list_integrations':
        result = await listIntegrations(args, ctx)
        break
      case 'test_integration_connection':
        result = await testIntegrationConnection(args, ctx)
        break
      // V2 Notification & Audit Tools
      case 'list_notifications':
        result = await listNotifications(args, ctx)
        break
      case 'search_audit_log':
        result = await searchAuditLog(args, ctx)
        break
      // V3 Proactive Tools
      case 'get_daily_brief':
        result = await getDailyBrief(args, ctx)
        break
      // V3 Bulk Operations
      case 'bulk_start_onboarding':
        result = await bulkStartOnboarding(args, ctx)
        break
      case 'bulk_resend_contracts':
        result = await bulkResendContracts(args, ctx)
        break
      case 'bulk_deprovision_access':
        result = await bulkDeprovisionAccess(args, ctx)
        break
      // V4 Hiring Pipeline Tools
      case 'search_candidates':
        result = await searchCandidates(args, ctx)
        break
      case 'get_candidate':
        result = await getCandidate(args, ctx)
        break
      case 'get_candidate_timeline':
        result = await getCandidateTimeline(args, ctx)
        break
      case 'list_jobs':
        result = await listJobs(args, ctx)
        break
      case 'get_job_pipeline':
        result = await getJobPipeline(args, ctx)
        break
      // V4 AI Analysis Tools
      case 'get_candidate_analysis':
        result = await getCandidateAnalysis(args, ctx)
        break
      case 'analyze_candidate':
        result = await analyzeCandidate(args, ctx)
        break
      case 'get_candidate_sentiment_history':
        result = await getCandidateSentimentHistory(args, ctx)
        break
      default:
        result = { status: 'error', message: `Unknown tool: ${toolName}` }
    }

    const latencyMs = Date.now() - startTime
    console.log(`[Assistant] Tool complete: ${toolName}`, {
      status: result.status,
      latencyMs,
      userId: ctx.user.id,
    })

    return result
  } catch (error) {
    const latencyMs = Date.now() - startTime
    console.error(`[Assistant] Tool error: ${toolName}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs,
      userId: ctx.user.id,
    })
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

async function findContracts(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { search, status, limit = 10 } = args as { search?: string; status?: string; limit?: number }

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { candidateName: { contains: search, mode: 'insensitive' } },
      { candidateEmail: { contains: search, mode: 'insensitive' } },
    ]
  }

  const offers = await ctx.prisma.offer.findMany({
    where,
    select: {
      id: true,
      candidateName: true,
      candidateEmail: true,
      status: true,
      createdAt: true,
      variables: true,
      template: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit as number, 20),
  })

  const contracts = offers.map((o: any) => ({
    id: o.id,
    candidateName: o.candidateName,
    candidateEmail: o.candidateEmail,
    status: o.status,
    roleTitle: o.variables?.role || o.variables?.job_title || null,
    startDate: o.variables?.start_date || null,
    templateName: o.template?.name || null,
    createdAt: o.createdAt,
  }))

  return {
    status: 'ok',
    data: { contracts, total: contracts.length },
    message: contracts.length === 0
      ? 'No contracts found matching your criteria.'
      : `Found ${contracts.length} contract(s).`,
  }
}

async function createContractDraft(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const requiredFields = ['candidateName', 'candidateEmail', 'roleTitle', 'startDate', 'compensationAmount', 'currency']
  const missingFields = requiredFields.filter((f) => !args[f])

  if (missingFields.length > 0) {
    return {
      status: 'missing_fields',
      missingFields,
      message: `Please provide: ${missingFields.join(', ')}`,
    }
  }

  const {
    candidateName,
    candidateEmail,
    roleTitle,
    startDate,
    compensationAmount,
    currency,
    templateId,
    location,
    signatureBlockId,
  } = args as Record<string, string | number>

  // Find or get default template
  let template = templateId
    ? await ctx.prisma.offerTemplate.findUnique({ where: { id: templateId } })
    : await ctx.prisma.offerTemplate.findFirst({ where: { isActive: true } })

  if (!template) {
    return {
      status: 'error',
      message: 'No offer template found. Please create an offer template first in Settings.',
    }
  }

  // Check if employee exists
  let employee = await ctx.prisma.employee.findUnique({
    where: { personalEmail: candidateEmail as string },
  })

  if (!employee) {
    // Create as candidate
    employee = await ctx.prisma.employee.create({
      data: {
        fullName: candidateName as string,
        personalEmail: candidateEmail as string,
        status: 'CANDIDATE',
        jobTitle: roleTitle as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        salaryAmount: compensationAmount as number,
        salaryCurrency: currency as string,
        location: location as string | undefined,
      },
    })
  }

  const variables: Record<string, string> = {
    role: roleTitle as string,
    job_title: roleTitle as string,
    start_date: startDate as string,
    salary: String(compensationAmount),
    currency: currency as string,
    candidate_name: candidateName as string,
  }

  if (location) variables.location = location as string
  if (signatureBlockId) variables.signature_block_id = signatureBlockId as string

  const offer = await ctx.prisma.offer.create({
    data: {
      employeeId: employee.id,
      candidateEmail: candidateEmail as string,
      candidateName: candidateName as string,
      templateId: template.id,
      variables,
      status: 'DRAFT',
    },
  })

  await ctx.prisma.offerEvent.create({
    data: {
      offerId: offer.id,
      type: 'created',
      description: 'Contract draft created via Blue AI',
    },
  })

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'offer',
    resourceId: offer.id,
    metadata: {
      tool: 'create_contract_draft',
      candidateName,
      candidateEmail,
      roleTitle,
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: { contractId: offer.id, candidateName, roleTitle, startDate },
    message: `Contract draft created for ${candidateName} (${roleTitle}). Contract ID: ${offer.id}`,
  }
}

async function sendContract(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { contractId, confirmed } = args as { contractId?: string; confirmed?: boolean }

  if (!contractId) {
    return { status: 'missing_fields', missingFields: ['contractId'], message: 'Please provide the contract ID.' }
  }

  const offer = await ctx.prisma.offer.findUnique({
    where: { id: contractId },
    include: { template: true, employee: true },
  })

  if (!offer) {
    return { status: 'error', message: 'Contract not found.' }
  }

  if (offer.status !== 'DRAFT') {
    return { status: 'error', message: `Contract is in ${offer.status} status and cannot be sent. Only DRAFT contracts can be sent.` }
  }

  // If not confirmed, return summary for confirmation
  if (!confirmed) {
    return {
      status: 'confirmation_required',
      missingFields: ['confirmed'],
      summary: `Ready to send contract to ${offer.candidateName} (${offer.candidateEmail}) for ${offer.variables?.role || offer.variables?.job_title || 'the role'}.`,
      message: 'Please confirm to send this contract for signature.',
      data: {
        contractId: offer.id,
        candidateName: offer.candidateName,
        candidateEmail: offer.candidateEmail,
        roleTitle: offer.variables?.role || offer.variables?.job_title,
      },
    }
  }

  // Actually send the contract
  const { createDocuSignConnector } = await import('@/lib/integrations/docusign')
  const { getOrganization } = await import('@/lib/organization')
  const { wrapAgreementHtmlWithLetterhead } = await import('@/lib/letterhead')
  const { sendOfferEmail } = await import('@/lib/email')

  const organization = await getOrganization()
  const docusign = createDocuSignConnector()

  if (docusign) {
    try {
      const documentHtml = wrapAgreementHtmlWithLetterhead(offer.renderedHtml || '', organization, {
        baseUrl: process.env.NEXTAUTH_URL,
      })

      const result = await docusign.sendEnvelope({
        signerEmail: offer.candidateEmail,
        signerName: offer.candidateName,
        subject: `Offer from ${organization.name} - ${offer.candidateName}`,
        documentHtml,
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/docusign`,
      })

      await ctx.prisma.offer.update({
        where: { id: offer.id },
        data: {
          status: 'SENT',
          esignEnvelopeId: result.envelopeId,
          esignProvider: 'docusign',
          esignStatus: result.status,
          esignSentAt: new Date(),
          sentBy: ctx.user.id,
        },
      })
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to send via DocuSign: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  } else {
    // Fallback to email
    const offerLink = `${process.env.NEXTAUTH_URL}/offer/${offer.id}/sign`
    await sendOfferEmail({
      candidateEmail: offer.candidateEmail,
      candidateName: offer.candidateName,
      offerLink,
      companyName: organization.name,
      logoUrl: organization.logoUrl || undefined,
    })

    await ctx.prisma.offer.update({
      where: { id: offer.id },
      data: {
        status: 'SENT',
        esignProvider: 'internal',
        esignStatus: 'sent',
        esignSentAt: new Date(),
        sentBy: ctx.user.id,
      },
    })
  }

  // Update employee status
  await ctx.prisma.employee.update({
    where: { id: offer.employeeId },
    data: { status: 'OFFER_SENT' },
  })

  await ctx.prisma.offerEvent.create({
    data: {
      offerId: offer.id,
      type: 'sent',
      description: 'Contract sent via Blue AI',
    },
  })

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'offer',
    resourceId: offer.id,
    metadata: {
      tool: 'send_contract',
      candidateEmail: offer.candidateEmail,
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: { contractId: offer.id, candidateEmail: offer.candidateEmail },
    message: `Contract sent to ${offer.candidateName} at ${offer.candidateEmail}.`,
  }
}

async function getEmployee(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { role: string; employeeId?: string } }
): Promise<ToolResult> {
  const { id, search } = args as { id?: string; search?: string }

  if (!id && !search) {
    return { status: 'missing_fields', missingFields: ['id or search'], message: 'Please provide an employee ID or search term.' }
  }

  const isHR = ctx.user.role === 'SUPER_ADMIN' || ctx.user.role === 'HR_ADMIN'

  if (id) {
    const employee = await ctx.prisma.employee.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, fullName: true } },
        onboardingWorkflows: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (!employee) {
      return { status: 'error', message: 'Employee not found.' }
    }

    // Build result with all fields - mask sensitive fields for non-HR
    const result = {
      // Basic info
      id: employee.id,
      fullName: employee.fullName,
      personalEmail: employee.personalEmail,
      workEmail: employee.workEmail,
      phone: employee.phone,
      profileImageUrl: employee.profileImageUrl,

      // Job details
      jobTitle: employee.jobTitle,
      department: employee.department,
      location: employee.location,
      employmentType: employee.employmentType,
      status: employee.status,
      manager: employee.manager,

      // Dates
      startDate: employee.startDate,
      endDate: employee.endDate,

      // Address
      addressStreet: employee.addressStreet,
      addressCity: employee.addressCity,
      addressState: employee.addressState,
      addressPostal: employee.addressPostal,
      addressCountry: employee.addressCountry,

      // Personal details
      gender: employee.gender,
      maritalStatus: employee.maritalStatus,
      dateOfBirth: employee.dateOfBirth,
      nationality: employee.nationality,

      // HR-only sensitive fields
      ...(isHR
        ? {
            // Compensation
            salaryAmount: employee.salaryAmount,
            salaryCurrency: employee.salaryCurrency,
            contractType: employee.contractType,
            taxId: employee.taxId,

            // Bank details
            bankName: employee.bankName,
            accountName: employee.accountName,
            accountNumber: employee.accountNumber,
            accountSortCode: employee.accountSortCode,

            // Emergency contact
            emergencyContactName: employee.emergencyContactName,
            emergencyContactRelation: employee.emergencyContactRelation,
            emergencyContactPhone: employee.emergencyContactPhone,
            emergencyContactEmail: employee.emergencyContactEmail,
          }
        : {}),

      link: buildDeepLink('employee', employee.id),
    }

    return { status: 'ok', data: { employee: result } }
  }

  // Search by name/email
  const employees = await ctx.prisma.employee.findMany({
    where: {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { personalEmail: { contains: search, mode: 'insensitive' } },
        { workEmail: { contains: search, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      personalEmail: true,
      workEmail: true,
      phone: true,
      jobTitle: true,
      department: true,
      status: true,
    },
    take: 10,
  })

  if (employees.length === 0) {
    return { status: 'ok', data: { employees: [] }, message: `No employees found matching "${search}".` }
  }

  if (employees.length === 1) {
    // Return full details for single match
    return getEmployee({ id: employees[0].id }, ctx)
  }

  return {
    status: 'ok',
    data: { employees, multiple: true },
    message: `Found ${employees.length} employees. Please specify which one.`,
  }
}

async function startOnboarding(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { employeeId, startDate, confirmed } = args as { employeeId?: string; startDate?: string; confirmed?: boolean }

  if (!employeeId) {
    return { status: 'missing_fields', missingFields: ['employeeId'], message: 'Please provide the employee ID.' }
  }

  const employee = await ctx.prisma.employee.findUnique({
    where: { id: employeeId },
    include: { manager: true },
  })

  if (!employee) {
    return { status: 'error', message: 'Employee not found.' }
  }

  if (!['OFFER_SIGNED', 'HIRED_PENDING_START'].includes(employee.status)) {
    return {
      status: 'error',
      message: `Employee is in ${employee.status} status. Onboarding can only be started for employees in OFFER_SIGNED or HIRED_PENDING_START status.`,
    }
  }

  // Check for existing active workflow
  const existingWorkflow = await ctx.prisma.onboardingWorkflow.findFirst({
    where: {
      employeeId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  })

  if (existingWorkflow) {
    return { status: 'error', message: 'Employee already has an active onboarding workflow.' }
  }

  // If not confirmed, return summary
  if (!confirmed) {
    return {
      status: 'confirmation_required',
      missingFields: ['confirmed'],
      summary: `Ready to start onboarding for ${employee.fullName} (${employee.jobTitle || 'Employee'})${employee.startDate ? ` starting ${employee.startDate.toISOString().split('T')[0]}` : ''}.`,
      message: 'Please confirm to start onboarding workflow.',
      data: {
        employeeId: employee.id,
        employeeName: employee.fullName,
        jobTitle: employee.jobTitle,
        startDate: employee.startDate,
      },
    }
  }

  // Start onboarding
  const { getOrganization } = await import('@/lib/organization')
  const { sendOnboardingEmail } = await import('@/lib/email')

  const organization = await getOrganization()

  // Get default tasks
  const templates = await ctx.prisma.onboardingTaskTemplate.findMany({
    where: { organizationId: organization.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  const tasks = templates.length > 0
    ? templates.map((t: any, idx: number) => ({
        name: t.name,
        type: t.type,
        automationType: t.automationType,
        automationConfig: t.appId ? { appId: t.appId, appType: t.appType } : t.appType ? { appType: t.appType } : undefined,
        sortOrder: idx + 1,
      }))
    : [
        { name: 'Provision Google Workspace account', type: 'AUTOMATED', automationType: 'provision_google', sortOrder: 1 },
        { name: 'Provision Slack account', type: 'AUTOMATED', automationType: 'provision_slack', sortOrder: 2 },
        { name: 'Confirm laptop/hardware has been ordered', type: 'MANUAL', sortOrder: 3 },
        { name: 'Schedule orientation meeting', type: 'MANUAL', sortOrder: 4 },
      ]

  const effectiveStartDate = startDate ? new Date(startDate) : employee.startDate || new Date()

  const workflow = await ctx.prisma.onboardingWorkflow.create({
    data: {
      employeeId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      accessTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tasks: {
        create: tasks.map((task: any) => ({
          name: task.name,
          type: task.type,
          status: 'PENDING',
          automationType: task.automationType,
          automationConfig: task.automationConfig,
          sortOrder: task.sortOrder,
        })),
      },
    },
    include: { tasks: true },
  })

  // Update employee
  await ctx.prisma.employee.update({
    where: { id: employeeId },
    data: {
      status: 'HIRED_PENDING_START',
      startDate: effectiveStartDate,
    },
  })

  // Send onboarding email
  const onboardingLink = `${process.env.NEXTAUTH_URL}/welcome/${workflow.accessToken}`
  await sendOnboardingEmail({
    employeeEmail: employee.workEmail || employee.personalEmail,
    employeeName: employee.fullName,
    onboardingLink,
    startDate: effectiveStartDate,
    managerName: employee.manager?.fullName,
    companyName: organization.name,
  })

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'employee',
    resourceId: employeeId,
    metadata: {
      tool: 'start_onboarding',
      workflowId: workflow.id,
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: { workflowId: workflow.id, employeeName: employee.fullName, taskCount: workflow.tasks.length },
    message: `Onboarding started for ${employee.fullName}. ${workflow.tasks.length} tasks created. Welcome email sent to ${employee.workEmail || employee.personalEmail}.`,
  }
}

async function getOnboardingStatus(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { employeeId, workflowId } = args as { employeeId?: string; workflowId?: string }

  if (!employeeId && !workflowId) {
    return { status: 'missing_fields', missingFields: ['employeeId or workflowId'], message: 'Please provide employee ID or workflow ID.' }
  }

  const workflow = workflowId
    ? await ctx.prisma.onboardingWorkflow.findUnique({
        where: { id: workflowId },
        include: {
          employee: { select: { id: true, fullName: true, jobTitle: true, startDate: true } },
          tasks: { orderBy: { sortOrder: 'asc' } },
        },
      })
    : await ctx.prisma.onboardingWorkflow.findFirst({
        where: { employeeId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        include: {
          employee: { select: { id: true, fullName: true, jobTitle: true, startDate: true } },
          tasks: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      })

  if (!workflow) {
    return { status: 'ok', data: null, message: 'No onboarding workflow found for this employee.' }
  }

  const completedTasks = workflow.tasks.filter((t: any) => t.status === 'SUCCESS' || t.status === 'SKIPPED').length
  const totalTasks = workflow.tasks.length
  const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const pendingTasks = workflow.tasks
    .filter((t: any) => t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'FAILED')
    .slice(0, 5)
    .map((t: any) => ({
      name: t.name,
      type: t.type,
      status: t.status,
      statusMessage: t.statusMessage,
    }))

  return {
    status: 'ok',
    data: {
      workflowId: workflow.id,
      employee: workflow.employee,
      workflowStatus: workflow.status,
      percentComplete,
      completedTasks,
      totalTasks,
      pendingTasks,
      startedAt: workflow.startedAt,
    },
    message: `Onboarding for ${workflow.employee.fullName}: ${percentComplete}% complete (${completedTasks}/${totalTasks} tasks).`,
  }
}

async function countHiresByYear(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { year } = args as { year?: number }

  if (!year) {
    return { status: 'missing_fields', missingFields: ['year'], message: 'Please provide the year.' }
  }

  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`)
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`)

  // Definition: employees with startDate in the year and status indicating hired
  // Includes: ACTIVE, HIRED_PENDING_START, OFFBOARDING, EXITED, OFFER_SIGNED
  // Excludes: CANDIDATE, OFFER_SENT (not yet hired)
  const hireStatuses: EmployeeStatus[] = ['ACTIVE', 'HIRED_PENDING_START', 'OFFBOARDING', 'EXITED', 'OFFER_SIGNED']

  const count = await ctx.prisma.employee.count({
    where: {
      startDate: { gte: startOfYear, lt: endOfYear },
      status: { in: hireStatuses },
    },
  })

  return {
    status: 'ok',
    data: { year, count, hireStatuses },
    message: `${count} employees hired in ${year}.`,
  }
}

async function countEmployees(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { status, includeAll } = args as { status?: EmployeeStatus; includeAll?: boolean }

  let whereClause: Record<string, unknown> = {}
  let description = ''

  if (includeAll) {
    // Count all employees regardless of status
    description = 'all employees (any status)'
  } else if (status) {
    // Count by specific status
    whereClause = { status }
    description = `employees with status ${status}`
  } else {
    // Default: count active employees
    whereClause = { status: 'ACTIVE' }
    description = 'active employees'
  }

  const count = await ctx.prisma.employee.count({ where: whereClause })

  // Also get breakdown by status for context
  const breakdown = await ctx.prisma.employee.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  const statusBreakdown = breakdown.reduce((acc: Record<string, number>, item: { status: string; _count: { id: number } }) => {
    acc[item.status] = item._count.id
    return acc
  }, {} as Record<string, number>)

  return {
    status: 'ok',
    data: { count, statusBreakdown },
    message: `You have ${count} ${description}.${!includeAll && !status ? ` Total across all statuses: ${(Object.values(statusBreakdown) as number[]).reduce((a, b) => a + b, 0)}.` : ''}`,
  }
}

// ============================================
// V5 FLEXIBLE QUERY (Text-to-Prisma)
// ============================================

const SCHEMA_CONTEXT = `
Available Prisma models and their key fields:

Employee:
- id, fullName, personalEmail, workEmail, status (CANDIDATE|OFFER_SENT|OFFER_SIGNED|HIRED_PENDING_START|ACTIVE|OFFBOARDING|EXITED)
- jobTitle, department, location, employmentType (FULL_TIME|PART_TIME|CONTRACTOR|INTERN)
- startDate, endDate, managerId, createdAt, updatedAt

Job:
- id, title, department, status (DRAFT|ACTIVE|PAUSED|HIRED), priority (1-5)
- employmentType, salaryMin, salaryMax, salaryCurrency, deadline, hiresCount
- hiringManagerId, isPublic, createdAt, updatedAt
- Relations: candidates (JobCandidate[]), hiringManager (Employee)

JobCandidate:
- id, jobId, name, email, phone, resumeUrl, linkedinUrl
- currentRole, currentCompany, yearsOfExperience, location
- stage (APPLIED|HR_SCREEN|TEAM_CHAT|ADVISOR_CHAT|TECHNICAL|PANEL|TRIAL|CEO_CHAT|OFFER|HIRED|REJECTED|ARCHIVED)
- score (0-100), experienceMatchScore, skillsMatchScore
- createdAt, updatedAt
- Relations: job (Job), interviews (CandidateInterview[]), assessments (CandidateAssessment[])

Offer (Contract):
- id, employeeId, candidateEmail, candidateName, templateId
- status (DRAFT|SENT|VIEWED|SIGNED|DECLINED|EXPIRED|CANCELLED)
- variables (JSON with role, salary, etc), createdAt, updatedAt

OnboardingWorkflow:
- id, employeeId, status (PENDING|IN_PROGRESS|COMPLETED|FAILED|CANCELLED)
- startedAt, completedAt, createdAt
- Relations: employee (Employee), tasks (OnboardingTask[])

OffboardingWorkflow:
- id, employeeId, status, scheduledFor, isImmediate, reason
- startedAt, completedAt, createdAt
- Relations: employee (Employee), tasks (OffboardingTask[])

CandidateInterview:
- id, candidateId, scheduledAt, duration, status (SCHEDULED|COMPLETED|CANCELLED|NO_SHOW)
- meetingUrl, location, notes, createdAt
- Relations: candidate (JobCandidate), evaluations (InterviewEvaluation[])

CandidateAssessment:
- id, candidateId, type, status (NOT_STARTED|INVITED|IN_PROGRESS|COMPLETED|EXPIRED|CANCELLED)
- score, maxScore, percentile, completedAt, createdAt
- Relations: candidate (JobCandidate)

CandidateAIAnalysis:
- id, candidateId, analysisType, recommendation (STRONG_YES|YES|MAYBE|NO|STRONG_NO)
- confidence, overallScore, summary, strengths, concerns
- createdAt
- Relations: candidate (JobCandidate)

Team:
- id, name, description, color, leaderId, parentId, isActive

AuditLog:
- id, actorId, actorEmail, action, resourceType, resourceId, metadata, createdAt

App:
- id, type, name, description, isEnabled, createdAt

AppAccount:
- id, employeeId, appId, externalUserId, status (PENDING|PROVISIONING|ACTIVE|FAILED|DISABLED|DEPROVISIONED)
`

const QUERY_GENERATION_PROMPT = `You are a Prisma query generator. Given a natural language question, generate a safe Prisma query.

RULES:
1. Only use findMany, count, aggregate, or groupBy operations (READ-ONLY)
2. Always include a take: 50 limit for findMany to prevent overwhelming results
3. Never include sensitive fields like: salaryAmount, bankName, accountNumber, taxId, passwordHash
4. Use proper date handling for time-based queries
5. Return ONLY valid JSON with the query structure, no explanation

RESPONSE FORMAT (JSON only):
{
  "model": "employee|job|jobCandidate|offer|onboardingWorkflow|offboardingWorkflow|candidateInterview|candidateAssessment|candidateAIAnalysis|team|auditLog|app|appAccount",
  "operation": "findMany|count|aggregate|groupBy",
  "args": { ... prisma args ... },
  "format": "description of how to format the result"
}

${SCHEMA_CONTEXT}
`

async function flexibleQuery(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { question } = args as { question?: string }

  if (!question) {
    return { status: 'missing_fields', missingFields: ['question'], message: 'Please provide a question.' }
  }

  try {
    // Get AI settings for the query generation
    const aiSettingsDelegate = getAISettingsDelegate(ctx)
    const settings = await aiSettingsDelegate.findFirst()

    if (!settings?.provider || !settings?.apiKey) {
      return {
        status: 'error',
        message: 'AI is not configured. Please set up an AI provider in Settings > Blue AI.',
      }
    }

    const decryptedKey = decrypt(settings.apiKey)

    // Generate the Prisma query using AI
    let querySpec: { model: string; operation: string; args: Record<string, unknown>; format: string }

    if (settings.provider === 'OPENAI') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${decryptedKey}`,
        },
        body: JSON.stringify({
          model: settings.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: QUERY_GENERATION_PROMPT },
            { role: 'user', content: `Question: ${question}` },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      querySpec = JSON.parse(data.choices[0].message.content)
    } else if (settings.provider === 'ANTHROPIC') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': decryptedKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: settings.model || 'claude-3-haiku-20240307',
          max_tokens: 1024,
          system: QUERY_GENERATION_PROMPT,
          messages: [{ role: 'user', content: `Question: ${question}\n\nRespond with JSON only.` }],
        }),
      })

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.content[0].text
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No valid JSON in response')
      querySpec = JSON.parse(jsonMatch[0])
    } else {
      return { status: 'error', message: `Provider ${settings.provider} not supported for flexible queries.` }
    }

    // Validate the query spec
    const allowedModels = ['employee', 'job', 'jobCandidate', 'offer', 'onboardingWorkflow', 'offboardingWorkflow',
                          'candidateInterview', 'candidateAssessment', 'candidateAIAnalysis', 'team', 'auditLog', 'app', 'appAccount']
    const allowedOps = ['findMany', 'count', 'aggregate', 'groupBy']

    if (!allowedModels.includes(querySpec.model)) {
      return { status: 'error', message: `Invalid model: ${querySpec.model}` }
    }
    if (!allowedOps.includes(querySpec.operation)) {
      return { status: 'error', message: `Invalid operation: ${querySpec.operation}. Only read operations allowed.` }
    }

    // Ensure safety limits
    if (querySpec.operation === 'findMany') {
      querySpec.args = querySpec.args || {}
      querySpec.args.take = Math.min((querySpec.args.take as number) || 50, 50)
    }

    // Remove sensitive fields from select if present
    const sensitiveFields = ['salaryAmount', 'bankName', 'accountNumber', 'accountSortCode', 'taxId', 'passwordHash', 'configEncrypted', 'apiKey']
    if (querySpec.args?.select) {
      for (const field of sensitiveFields) {
        delete (querySpec.args.select as Record<string, unknown>)[field]
      }
    }

    // Execute the query
    const prismaModel = ctx.prisma[querySpec.model]
    if (!prismaModel) {
      return { status: 'error', message: `Model ${querySpec.model} not found in Prisma client.` }
    }

    const result = await prismaModel[querySpec.operation](querySpec.args)

    // Format the response
    let message = ''
    if (querySpec.operation === 'count') {
      message = `Found ${result} ${querySpec.model}(s) matching your query.`
    } else if (querySpec.operation === 'groupBy') {
      const groups = Array.isArray(result) ? result : [result]
      message = `Results grouped:\n${groups.map((g: Record<string, unknown>) =>
        Object.entries(g).map(([k, v]) => `${k}: ${v}`).join(', ')
      ).join('\n')}`
    } else if (querySpec.operation === 'aggregate') {
      message = `Aggregate results: ${JSON.stringify(result, null, 2)}`
    } else {
      // findMany
      const items = Array.isArray(result) ? result : [result]
      if (items.length === 0) {
        message = 'No results found.'
      } else {
        message = `Found ${items.length} result(s):\n${items.slice(0, 10).map((item: Record<string, unknown>, i: number) =>
          `${i + 1}. ${formatQueryResult(item, querySpec.model)}`
        ).join('\n')}${items.length > 10 ? `\n... and ${items.length - 10} more` : ''}`
      }
    }

    return {
      status: 'ok',
      data: { query: querySpec, result },
      message: querySpec.format ? `${querySpec.format}\n\n${message}` : message,
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

function formatQueryResult(item: Record<string, unknown>, model: string): string {
  switch (model) {
    case 'employee':
      return `${item.fullName} (${item.status}) - ${item.jobTitle || 'No title'}, ${item.department || 'No dept'}`
    case 'job':
      return `${item.title} (${item.status}) - ${item.department || 'No dept'}`
    case 'jobCandidate':
      return `${item.name} (${item.stage}) - ${item.email}`
    case 'offer':
      return `${item.candidateName} - ${item.status}`
    case 'onboardingWorkflow':
    case 'offboardingWorkflow':
      return `Workflow ${item.id} - ${item.status}`
    case 'candidateInterview':
      return `Interview ${item.id} - ${item.status} on ${item.scheduledAt}`
    case 'candidateAssessment':
      return `Assessment ${item.id} - ${item.type}: ${item.status}`
    case 'team':
      return `${item.name}${item.description ? ` - ${item.description}` : ''}`
    default:
      return JSON.stringify(item).slice(0, 100)
  }
}

// ============================================
// V2 TOOL IMPLEMENTATIONS
// ============================================

const BASE_URL = process.env.NEXTAUTH_URL || ''

// Helper to build deep links
function buildDeepLink(type: 'contract' | 'employee' | 'onboarding' | 'offboarding' | 'integration' | 'candidate' | 'job', id: string): string {
  const paths: Record<string, string> = {
    contract: `/contracts/${id}`,
    employee: `/employees/${id}`,
    onboarding: `/onboarding/${id}`,
    offboarding: `/offboarding/${id}`,
    integration: `/integrations/${id}`,
    candidate: `/hiring/candidates/${id}`,
    job: `/hiring/positions/${id}`,
  }
  return `${BASE_URL}${paths[type]}`
}

// V2 Contract Tools
async function updateContractDraft(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { contractId, roleTitle, startDate, compensationAmount, currency, location, legalEntityId, signatureBlockId } = args as {
    contractId?: string
    roleTitle?: string
    startDate?: string
    compensationAmount?: number
    currency?: string
    location?: string
    legalEntityId?: string
    signatureBlockId?: string
  }

  if (!contractId) {
    return { status: 'missing_fields', missingFields: ['contractId'], message: 'Please provide the contract ID.' }
  }

  const offer = await ctx.prisma.offer.findUnique({
    where: { id: contractId },
    include: { template: true },
  })

  if (!offer) {
    return { status: 'error', message: 'Contract not found.' }
  }

  // Check status restrictions
  const nonEditableStatuses = ['SIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED']
  if (nonEditableStatuses.includes(offer.status)) {
    return {
      status: 'error',
      message: `Contract is in ${offer.status} status and cannot be edited. Only DRAFT, SENT, or VIEWED contracts can be updated.`,
    }
  }

  // Build update data
  const variables = { ...(offer.variables as Record<string, string>) }
  const updateData: Record<string, unknown> = {}

  if (roleTitle) {
    variables.role = roleTitle
    variables.job_title = roleTitle
  }
  if (startDate) variables.start_date = startDate
  if (compensationAmount !== undefined) variables.salary = String(compensationAmount)
  if (currency) variables.currency = currency
  if (location) variables.location = location

  updateData.variables = variables
  if (legalEntityId) updateData.legalEntityId = legalEntityId
  if (signatureBlockId) updateData.signatureBlockId = signatureBlockId

  await ctx.prisma.offer.update({
    where: { id: contractId },
    data: updateData,
  })

  await ctx.prisma.offerEvent.create({
    data: {
      offerId: contractId,
      type: 'updated',
      description: 'Contract updated via Blue AI',
    },
  })

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'offer',
    resourceId: contractId,
    metadata: {
      tool: 'update_contract_draft',
      updates: { roleTitle, startDate, compensationAmount, currency, location },
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: {
      contractId,
      candidateName: offer.candidateName,
      url: buildDeepLink('contract', contractId),
    },
    message: `Contract for ${offer.candidateName} has been updated. [View contract](${buildDeepLink('contract', contractId)})`,
  }
}

async function resendContract(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { contractId, confirmed } = args as { contractId?: string; confirmed?: boolean }

  if (!contractId) {
    return { status: 'missing_fields', missingFields: ['contractId'], message: 'Please provide the contract ID.' }
  }

  const offer = await ctx.prisma.offer.findUnique({
    where: { id: contractId },
    include: { template: true, employee: true },
  })

  if (!offer) {
    return { status: 'error', message: 'Contract not found.' }
  }

  // Check status restrictions
  const allowedStatuses = ['SENT', 'VIEWED']
  if (!allowedStatuses.includes(offer.status)) {
    return {
      status: 'error',
      message: `Contract is in ${offer.status} status. Only contracts in SENT or VIEWED status can be resent.`,
    }
  }

  // If not confirmed, return summary for confirmation
  if (!confirmed) {
    return {
      status: 'confirmation_required',
      missingFields: ['confirmed'],
      summary: `Ready to resend contract to ${offer.candidateName} (${offer.candidateEmail}) for ${offer.variables?.role || offer.variables?.job_title || 'the role'}.`,
      message: 'Please confirm to resend this contract for signature.',
      data: {
        contractId: offer.id,
        candidateName: offer.candidateName,
        candidateEmail: offer.candidateEmail,
        roleTitle: offer.variables?.role || offer.variables?.job_title,
        currentStatus: offer.status,
        url: buildDeepLink('contract', offer.id),
      },
    }
  }

  // Actually resend the contract
  const { createDocuSignConnector } = await import('@/lib/integrations/docusign')
  const { getOrganization } = await import('@/lib/organization')
  const { wrapAgreementHtmlWithLetterhead } = await import('@/lib/letterhead')
  const { sendOfferEmail } = await import('@/lib/email')

  const organization = await getOrganization()
  const docusign = createDocuSignConnector()

  if (docusign) {
    try {
      const documentHtml = wrapAgreementHtmlWithLetterhead(offer.renderedHtml || '', organization, {
        baseUrl: BASE_URL,
      })

      const result = await docusign.sendEnvelope({
        signerEmail: offer.candidateEmail,
        signerName: offer.candidateName,
        subject: `Reminder: Offer from ${organization.name} - ${offer.candidateName}`,
        documentHtml,
        callbackUrl: `${BASE_URL}/api/webhooks/docusign`,
      })

      await ctx.prisma.offer.update({
        where: { id: offer.id },
        data: {
          esignEnvelopeId: result.envelopeId,
          esignStatus: result.status,
          esignSentAt: new Date(),
        },
      })
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to resend via DocuSign: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  } else {
    // Fallback to email
    const offerLink = `${BASE_URL}/offer/${offer.id}/sign`
    await sendOfferEmail({
      candidateEmail: offer.candidateEmail,
      candidateName: offer.candidateName,
      offerLink,
      companyName: organization.name,
      logoUrl: organization.logoUrl || undefined,
    })
  }

  await ctx.prisma.offerEvent.create({
    data: {
      offerId: offer.id,
      type: 'resent',
      description: 'Contract resent via Blue AI',
    },
  })

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'offer',
    resourceId: offer.id,
    metadata: {
      tool: 'resend_contract',
      candidateEmail: offer.candidateEmail,
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: {
      contractId: offer.id,
      candidateEmail: offer.candidateEmail,
      url: buildDeepLink('contract', offer.id),
    },
    message: `Contract resent to ${offer.candidateName} at ${offer.candidateEmail}. [View contract](${buildDeepLink('contract', offer.id)})`,
  }
}

async function cancelContract(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { contractId, reason, confirmed } = args as { contractId?: string; reason?: string; confirmed?: boolean }

  if (!contractId) {
    return { status: 'missing_fields', missingFields: ['contractId'], message: 'Please provide the contract ID.' }
  }

  if (!reason) {
    return { status: 'missing_fields', missingFields: ['reason'], message: 'Please provide a reason for cancellation.' }
  }

  const offer = await ctx.prisma.offer.findUnique({
    where: { id: contractId },
    include: { template: true },
  })

  if (!offer) {
    return { status: 'error', message: 'Contract not found.' }
  }

  // Cannot cancel signed contracts
  if (offer.status === 'SIGNED') {
    return {
      status: 'error',
      message: 'Contract is already SIGNED and cannot be cancelled.',
    }
  }

  // If not confirmed, return summary for confirmation
  if (!confirmed) {
    return {
      status: 'confirmation_required',
      missingFields: ['confirmed'],
      summary: `⚠️ About to CANCEL contract for ${offer.candidateName} (${offer.candidateEmail}). This action cannot be undone.`,
      message: `Reason: ${reason}\n\nPlease confirm to cancel this contract.`,
      data: {
        contractId: offer.id,
        candidateName: offer.candidateName,
        candidateEmail: offer.candidateEmail,
        roleTitle: offer.variables?.role || offer.variables?.job_title,
        currentStatus: offer.status,
        reason,
        url: buildDeepLink('contract', offer.id),
      },
    }
  }

  // Void DocuSign envelope if applicable
  if (offer.esignProvider === 'docusign' && offer.esignEnvelopeId) {
    try {
      const { createDocuSignConnector } = await import('@/lib/integrations/docusign')
      const docusign = createDocuSignConnector()
      if (docusign) {
        await docusign.voidEnvelope(offer.esignEnvelopeId, reason)
      }
    } catch (error) {
      console.error('[Assistant] Failed to void DocuSign envelope:', error)
      // Continue with cancellation even if DocuSign void fails
    }
  }

  await ctx.prisma.offer.update({
    where: { id: contractId },
    data: { status: 'CANCELLED' },
  })

  await ctx.prisma.offerEvent.create({
    data: {
      offerId: contractId,
      type: 'cancelled',
      description: `Contract cancelled via Blue AI. Reason: ${reason}`,
    },
  })

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'offer',
    resourceId: contractId,
    metadata: {
      tool: 'cancel_contract',
      reason,
      previousStatus: offer.status,
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: {
      contractId,
      candidateName: offer.candidateName,
      url: buildDeepLink('contract', contractId),
    },
    message: `Contract for ${offer.candidateName} has been cancelled. Reason: ${reason}`,
  }
}

// V2 Onboarding Task Tools
async function completeOnboardingTask(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { taskId, notes } = args as { taskId?: string; notes?: string }

  if (!taskId) {
    return { status: 'missing_fields', missingFields: ['taskId'], message: 'Please provide the task ID.' }
  }

  const task = await ctx.prisma.onboardingTask.findUnique({
    where: { id: taskId },
    include: {
      workflow: {
        include: { employee: { select: { id: true, fullName: true } } },
      },
    },
  })

  if (!task) {
    return { status: 'error', message: 'Onboarding task not found.' }
  }

  if (task.type !== 'MANUAL') {
    return { status: 'error', message: 'This is an automated task. Use run_onboarding_task instead.' }
  }

  if (task.status === 'SUCCESS' || task.status === 'SKIPPED') {
    return { status: 'error', message: `Task is already ${task.status.toLowerCase()}.` }
  }

  await ctx.prisma.onboardingTask.update({
    where: { id: taskId },
    data: {
      status: 'SUCCESS',
      statusMessage: notes || null,
      completedAt: new Date(),
      completedBy: ctx.user.id,
    },
  })

  // Check if workflow should be completed
  const remainingTasks = await ctx.prisma.onboardingTask.count({
    where: {
      workflowId: task.workflowId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  })

  if (remainingTasks === 0) {
    await ctx.prisma.onboardingWorkflow.update({
      where: { id: task.workflowId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    await ctx.prisma.employee.update({
      where: { id: task.workflow.employeeId },
      data: { status: 'ACTIVE' },
    })
  }

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'onboarding_task',
    resourceId: taskId,
    metadata: {
      tool: 'complete_onboarding_task',
      taskName: task.name,
      notes,
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: {
      taskId,
      taskName: task.name,
      employeeName: task.workflow.employee.fullName,
      workflowUrl: buildDeepLink('onboarding', task.workflowId),
    },
    message: `Task "${task.name}" marked as complete for ${task.workflow.employee.fullName}. [View onboarding](${buildDeepLink('onboarding', task.workflowId)})`,
  }
}

async function runOnboardingTask(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { taskId } = args as { taskId?: string }

  if (!taskId) {
    return { status: 'missing_fields', missingFields: ['taskId'], message: 'Please provide the task ID.' }
  }

  const task = await ctx.prisma.onboardingTask.findUnique({
    where: { id: taskId },
    include: {
      workflow: {
        include: { employee: true },
      },
    },
  })

  if (!task) {
    return { status: 'error', message: 'Onboarding task not found.' }
  }

  if (task.type !== 'AUTOMATED') {
    return { status: 'error', message: 'This is a manual task. Use complete_onboarding_task instead.' }
  }

  if (task.status === 'SUCCESS') {
    return { status: 'error', message: 'Task has already been completed successfully.' }
  }

  // Update task to IN_PROGRESS
  await ctx.prisma.onboardingTask.update({
    where: { id: taskId },
    data: {
      status: 'IN_PROGRESS',
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  })

  // Run the automation
  const { provisionEmployeeInApp } = await import('@/lib/integrations')
  const employee = task.workflow.employee

  let result: { success: boolean; error?: string } = { success: false, error: 'Unknown automation type' }

  try {
    switch (task.automationType) {
      case 'provision_google':
        result = await provisionEmployeeInApp(employee, 'GOOGLE_WORKSPACE', ctx.user.id)
        break
      case 'provision_slack':
        result = await provisionEmployeeInApp(employee, 'SLACK', ctx.user.id)
        break
      case 'provision_app':
        if (task.automationConfig?.appId) {
          const { provisionEmployeeInAppById } = await import('@/lib/integrations')
          result = await provisionEmployeeInAppById(employee, task.automationConfig.appId, ctx.user.id)
        } else if (task.automationConfig?.appType) {
          result = await provisionEmployeeInApp(employee, task.automationConfig.appType, ctx.user.id)
        }
        break
      default:
        result = { success: false, error: `Unknown automation type: ${task.automationType}` }
    }
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }

  // Update task status based on result
  await ctx.prisma.onboardingTask.update({
    where: { id: taskId },
    data: {
      status: result.success ? 'SUCCESS' : 'FAILED',
      statusMessage: result.error || null,
      completedAt: result.success ? new Date() : null,
    },
  })

  // Check if workflow should be completed
  if (result.success) {
    const remainingTasks = await ctx.prisma.onboardingTask.count({
      where: {
        workflowId: task.workflowId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    })

    if (remainingTasks === 0) {
      await ctx.prisma.onboardingWorkflow.update({
        where: { id: task.workflowId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      await ctx.prisma.employee.update({
        where: { id: task.workflow.employeeId },
        data: { status: 'ACTIVE' },
      })
    }
  }

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'onboarding_task',
    resourceId: taskId,
    metadata: {
      tool: 'run_onboarding_task',
      taskName: task.name,
      automationType: task.automationType,
      success: result.success,
      error: result.error,
      assistantInitiated: true,
    },
  })

  if (result.success) {
    return {
      status: 'ok',
      data: {
        taskId,
        taskName: task.name,
        workflowUrl: buildDeepLink('onboarding', task.workflowId),
      },
      message: `Task "${task.name}" completed successfully. [View onboarding](${buildDeepLink('onboarding', task.workflowId)})`,
    }
  } else {
    return {
      status: 'error',
      message: `Task "${task.name}" failed: ${result.error}. [View onboarding](${buildDeepLink('onboarding', task.workflowId)})`,
      data: {
        taskId,
        taskName: task.name,
        error: result.error,
        workflowUrl: buildDeepLink('onboarding', task.workflowId),
      },
    }
  }
}

async function skipOnboardingTask(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { taskId, reason } = args as { taskId?: string; reason?: string }

  if (!taskId) {
    return { status: 'missing_fields', missingFields: ['taskId'], message: 'Please provide the task ID.' }
  }

  if (!reason) {
    return { status: 'missing_fields', missingFields: ['reason'], message: 'Please provide a reason for skipping the task.' }
  }

  const task = await ctx.prisma.onboardingTask.findUnique({
    where: { id: taskId },
    include: {
      workflow: {
        include: { employee: { select: { id: true, fullName: true } } },
      },
    },
  })

  if (!task) {
    return { status: 'error', message: 'Onboarding task not found.' }
  }

  if (task.status === 'SUCCESS' || task.status === 'SKIPPED') {
    return { status: 'error', message: `Task is already ${task.status.toLowerCase()}.` }
  }

  await ctx.prisma.onboardingTask.update({
    where: { id: taskId },
    data: {
      status: 'SKIPPED',
      statusMessage: reason,
      completedAt: new Date(),
      completedBy: ctx.user.id,
    },
  })

  // Check if workflow should be completed
  const remainingTasks = await ctx.prisma.onboardingTask.count({
    where: {
      workflowId: task.workflowId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  })

  if (remainingTasks === 0) {
    await ctx.prisma.onboardingWorkflow.update({
      where: { id: task.workflowId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    await ctx.prisma.employee.update({
      where: { id: task.workflow.employeeId },
      data: { status: 'ACTIVE' },
    })
  }

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'onboarding_task',
    resourceId: taskId,
    metadata: {
      tool: 'skip_onboarding_task',
      taskName: task.name,
      reason,
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: {
      taskId,
      taskName: task.name,
      reason,
      workflowUrl: buildDeepLink('onboarding', task.workflowId),
    },
    message: `Task "${task.name}" skipped. Reason: ${reason}. [View onboarding](${buildDeepLink('onboarding', task.workflowId)})`,
  }
}

// V2 Offboarding Tools
async function startOffboarding(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { employeeId, isImmediate, endDate, reason, notes, confirmed } = args as {
    employeeId?: string
    isImmediate?: boolean
    endDate?: string
    reason?: string
    notes?: string
    confirmed?: boolean
  }

  if (!employeeId) {
    return { status: 'missing_fields', missingFields: ['employeeId'], message: 'Please provide the employee ID.' }
  }

  if (!isImmediate && !endDate) {
    return {
      status: 'missing_fields',
      missingFields: ['endDate'],
      message: 'Please provide an end date for scheduled offboarding, or set isImmediate=true for immediate offboarding.',
    }
  }

  const employee = await ctx.prisma.employee.findUnique({
    where: { id: employeeId },
  })

  if (!employee) {
    return { status: 'error', message: 'Employee not found.' }
  }

  if (employee.status === 'EXITED') {
    return { status: 'error', message: 'Employee has already exited the organization.' }
  }

  // Check for existing active workflow
  const existingWorkflow = await ctx.prisma.offboardingWorkflow.findFirst({
    where: {
      employeeId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  })

  if (existingWorkflow) {
    return {
      status: 'error',
      message: `Employee already has an active offboarding workflow. [View offboarding](${buildDeepLink('offboarding', existingWorkflow.id)})`,
    }
  }

  // If not confirmed, return summary
  if (!confirmed) {
    return {
      status: 'confirmation_required',
      missingFields: ['confirmed'],
      summary: `⚠️ About to start ${isImmediate ? 'IMMEDIATE' : 'scheduled'} offboarding for ${employee.fullName} (${employee.jobTitle || 'Employee'})${endDate ? ` with end date ${endDate}` : ''}.`,
      message: 'Please confirm to start offboarding workflow.',
      data: {
        employeeId: employee.id,
        employeeName: employee.fullName,
        jobTitle: employee.jobTitle,
        isImmediate: !!isImmediate,
        endDate,
        reason,
        employeeUrl: buildDeepLink('employee', employee.id),
      },
    }
  }

  // Get offboarding task templates
  const { getOrganization } = await import('@/lib/organization')
  const organization = await getOrganization()

  const templates = await ctx.prisma.offboardingTaskTemplate.findMany({
    where: { organizationId: organization.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  const defaultTasks = templates.length > 0
    ? templates.map((t: any, idx: number) => ({
        name: t.name,
        type: t.type,
        automationType: t.automationType,
        appId: t.appId,
        sortOrder: idx + 1,
      }))
    : [
        { name: 'Collect company equipment', type: 'MANUAL', sortOrder: 1 },
        { name: 'Revoke building/office access', type: 'MANUAL', sortOrder: 2 },
        { name: 'Transfer files and documents', type: 'MANUAL', sortOrder: 3 },
        { name: 'Exit interview', type: 'MANUAL', sortOrder: 4 },
        { name: 'Deprovision Google Workspace', type: 'AUTOMATED', automationType: 'deprovision_google_workspace', sortOrder: 10 },
        { name: 'Deprovision Slack', type: 'AUTOMATED', automationType: 'deprovision_slack', sortOrder: 11 },
      ]

  const effectiveEndDate = endDate ? new Date(endDate) : new Date()

  const workflow = await ctx.prisma.offboardingWorkflow.create({
    data: {
      employeeId,
      status: isImmediate ? 'IN_PROGRESS' : 'PENDING',
      isImmediate: !!isImmediate,
      scheduledFor: !isImmediate ? effectiveEndDate : null,
      startedAt: isImmediate ? new Date() : null,
      reason,
      notes,
      initiatedBy: ctx.user.id,
      tasks: {
        create: defaultTasks.map((task: any) => ({
          name: task.name,
          type: task.type,
          status: 'PENDING',
          automationType: task.automationType,
          appId: task.appId,
          sortOrder: task.sortOrder,
        })),
      },
    },
    include: { tasks: true },
  })

  // Update employee status
  await ctx.prisma.employee.update({
    where: { id: employeeId },
    data: {
      status: 'OFFBOARDING',
      endDate: effectiveEndDate,
    },
  })

  // If immediate, run automated tasks
  if (isImmediate) {
    const automatedTasks = workflow.tasks.filter((t: any) => t.type === 'AUTOMATED')
    for (const task of automatedTasks) {
      // Fire and forget - don't wait for completion
      runOnboardingTask({ taskId: task.id }, ctx).catch((err) => {
        console.error(`[Assistant] Failed to run offboarding task ${task.id}:`, err)
      })
    }
  }

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'employee',
    resourceId: employeeId,
    metadata: {
      tool: 'start_offboarding',
      workflowId: workflow.id,
      isImmediate: !!isImmediate,
      endDate,
      reason,
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: {
      workflowId: workflow.id,
      employeeName: employee.fullName,
      taskCount: workflow.tasks.length,
      isImmediate: !!isImmediate,
      url: buildDeepLink('offboarding', workflow.id),
    },
    message: `Offboarding started for ${employee.fullName}. ${workflow.tasks.length} tasks created. [View offboarding](${buildDeepLink('offboarding', workflow.id)})`,
  }
}

async function getOffboardingStatus(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { employeeId, workflowId } = args as { employeeId?: string; workflowId?: string }

  if (!employeeId && !workflowId) {
    return { status: 'missing_fields', missingFields: ['employeeId or workflowId'], message: 'Please provide employee ID or workflow ID.' }
  }

  const workflow = workflowId
    ? await ctx.prisma.offboardingWorkflow.findUnique({
        where: { id: workflowId },
        include: {
          employee: { select: { id: true, fullName: true, jobTitle: true, endDate: true } },
          tasks: { orderBy: { sortOrder: 'asc' } },
        },
      })
    : await ctx.prisma.offboardingWorkflow.findFirst({
        where: { employeeId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        include: {
          employee: { select: { id: true, fullName: true, jobTitle: true, endDate: true } },
          tasks: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      })

  if (!workflow) {
    return { status: 'ok', data: null, message: 'No offboarding workflow found for this employee.' }
  }

  const completedTasks = workflow.tasks.filter((t: any) => t.status === 'SUCCESS' || t.status === 'SKIPPED').length
  const totalTasks = workflow.tasks.length
  const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const pendingTasks = workflow.tasks
    .filter((t: any) => t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'FAILED')
    .slice(0, 5)
    .map((t: any) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      status: t.status,
      statusMessage: t.statusMessage,
    }))

  return {
    status: 'ok',
    data: {
      workflowId: workflow.id,
      employee: workflow.employee,
      workflowStatus: workflow.status,
      isImmediate: workflow.isImmediate,
      scheduledFor: workflow.scheduledFor,
      percentComplete,
      completedTasks,
      totalTasks,
      pendingTasks,
      reason: workflow.reason,
      startedAt: workflow.startedAt,
      url: buildDeepLink('offboarding', workflow.id),
    },
    message: `Offboarding for ${workflow.employee.fullName}: ${percentComplete}% complete (${completedTasks}/${totalTasks} tasks). [View offboarding](${buildDeepLink('offboarding', workflow.id)})`,
  }
}

// V2 Integration Tools
async function listIntegrations(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { includeDisabled } = args as { includeDisabled?: boolean }

  const where: Record<string, unknown> = { archivedAt: null }
  if (!includeDisabled) {
    where.isEnabled = true
  }

  const apps = await ctx.prisma.app.findMany({
    where,
    include: {
      connections: {
        where: { isActive: true },
        select: {
          id: true,
          domain: true,
          lastTestStatus: true,
          lastTestedAt: true,
          lastTestError: true,
        },
      },
      _count: {
        select: { accounts: { where: { status: 'ACTIVE' } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  const integrations = apps.map((app: any) => ({
    id: app.id,
    name: app.name,
    type: app.type,
    isEnabled: app.isEnabled,
    connectionStatus: app.connections.length > 0
      ? app.connections[0].lastTestStatus || 'UNKNOWN'
      : 'NOT_CONNECTED',
    lastTestedAt: app.connections[0]?.lastTestedAt,
    activeAccounts: app._count.accounts,
    url: buildDeepLink('integration', app.id),
  }))

  return {
    status: 'ok',
    data: { integrations, total: integrations.length },
    message: `Found ${integrations.length} integration(s).`,
  }
}

async function testIntegrationConnection(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { appId } = args as { appId?: string }

  if (!appId) {
    return { status: 'missing_fields', missingFields: ['appId'], message: 'Please provide the app ID.' }
  }

  const app = await ctx.prisma.app.findUnique({
    where: { id: appId },
    include: {
      connections: { where: { isActive: true } },
    },
  })

  if (!app) {
    return { status: 'error', message: 'App not found.' }
  }

  if (app.connections.length === 0) {
    return {
      status: 'error',
      message: `No active connection configured for ${app.name}. [Configure integration](${buildDeepLink('integration', app.id)})`,
    }
  }

  const connection = app.connections[0]

  // Test the connection
  const { getConnector } = await import('@/lib/integrations')

  try {
    const connector = await getConnector(app)
    if (!connector) {
      return { status: 'error', message: `Could not create connector for ${app.name}.` }
    }
    const result = await connector.testConnection()

    // Update connection status
    await ctx.prisma.appConnection.update({
      where: { id: connection.id },
      data: {
        lastTestStatus: result.success ? 'SUCCESS' : 'FAILED',
        lastTestError: result.error || null,
        lastTestedAt: new Date(),
      },
    })

    await createAuditLog({
      actorId: ctx.user.id,
      action: 'ASSISTANT_ACTION',
      resourceType: 'app',
      resourceId: appId,
      metadata: {
        tool: 'test_integration_connection',
        appName: app.name,
        success: result.success,
        error: result.error,
        assistantInitiated: true,
      },
    })

    if (result.success) {
      return {
        status: 'ok',
        data: {
          appId,
          appName: app.name,
          status: 'SUCCESS',
          url: buildDeepLink('integration', appId),
        },
        message: `✓ Connection to ${app.name} successful. [View integration](${buildDeepLink('integration', appId)})`,
      }
    } else {
      return {
        status: 'error',
        message: `✗ Connection to ${app.name} failed: ${result.error}. [View integration](${buildDeepLink('integration', appId)})`,
        data: {
          appId,
          appName: app.name,
          status: 'FAILED',
          error: result.error,
          url: buildDeepLink('integration', appId),
        },
      }
    }
  } catch (error) {
    await ctx.prisma.appConnection.update({
      where: { id: connection.id },
      data: {
        lastTestStatus: 'FAILED',
        lastTestError: error instanceof Error ? error.message : 'Unknown error',
        lastTestedAt: new Date(),
      },
    })

    return {
      status: 'error',
      message: `✗ Connection test failed for ${app.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// V2 Notification & Audit Tools
async function listNotifications(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { includeRead, limit = 10 } = args as { includeRead?: boolean; limit?: number }

  const where: Record<string, unknown> = {
    userId: ctx.user.id,
    archivedAt: null,
  }

  if (!includeRead) {
    where.readAt = null
  }

  try {
    const notifications = await ctx.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    })

    const formattedNotifications = notifications.map((n: any) => ({
      id: n.id,
      action: n.action,
      resourceType: n.resourceType,
      resourceId: n.resourceId,
      actorName: n.actorName,
      actorEmail: n.actorEmail,
      isRead: !!n.readAt,
      createdAt: n.createdAt,
    }))

    return {
      status: 'ok',
      data: { notifications: formattedNotifications, total: formattedNotifications.length },
      message: formattedNotifications.length === 0
        ? 'No notifications found.'
        : `Found ${formattedNotifications.length} notification(s).`,
    }
  } catch {
    // Notification table may not exist yet
    return {
      status: 'ok',
      data: { notifications: [], total: 0 },
      message: 'No notifications found.',
    }
  }
}

async function searchAuditLog(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { action, resourceType, resourceId, startDate, endDate, limit = 20 } = args as {
    action?: string
    resourceType?: string
    resourceId?: string
    startDate?: string
    endDate?: string
    limit?: number
  }

  const where: Record<string, unknown> = {}

  if (action) where.action = action
  if (resourceType) where.resourceType = resourceType
  if (resourceId) where.resourceId = resourceId

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate)
    if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate)
  }

  const logs = await ctx.prisma.auditLog.findMany({
    where,
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  })

  const formattedLogs = logs.map((log: any) => ({
    id: log.id,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    actorName: log.actor?.name || log.actorEmail || 'System',
    actorEmail: log.actor?.email || log.actorEmail,
    metadata: log.metadata,
    createdAt: log.createdAt,
  }))

  return {
    status: 'ok',
    data: { logs: formattedLogs, total: formattedLogs.length },
    message: formattedLogs.length === 0
      ? 'No audit logs found matching your criteria.'
      : `Found ${formattedLogs.length} audit log(s).`,
  }
}

// ============================================
// V3 TOOL IMPLEMENTATIONS
// ============================================

async function getDailyBrief(
  _args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Get pending contracts (DRAFT or SENT for more than 3 days)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const pendingContracts = await ctx.prisma.offer.findMany({
    where: {
      status: { in: ['DRAFT', 'SENT', 'VIEWED'] },
      createdAt: { lt: threeDaysAgo },
    },
    select: {
      id: true,
      candidateName: true,
      candidateEmail: true,
      status: true,
      createdAt: true,
    },
    take: 10,
    orderBy: { createdAt: 'asc' },
  })

  // Get upcoming starts (employees starting in next 7 days)
  const upcomingStarts = await ctx.prisma.employee.findMany({
    where: {
      status: 'HIRED_PENDING_START',
      startDate: { gte: today, lte: weekFromNow },
    },
    select: {
      id: true,
      fullName: true,
      startDate: true,
      jobTitle: true,
    },
    take: 10,
    orderBy: { startDate: 'asc' },
  })

  // Get stuck workflows (onboarding/offboarding with failed tasks)
  const stuckOnboarding = await ctx.prisma.onboardingWorkflow.findMany({
    where: {
      status: 'IN_PROGRESS',
      tasks: { some: { status: 'FAILED' } },
    },
    include: {
      employee: { select: { id: true, fullName: true } },
      tasks: { where: { status: 'FAILED' }, take: 3 },
    },
    take: 5,
  })

  const stuckOffboarding = await ctx.prisma.offboardingWorkflow.findMany({
    where: {
      status: 'IN_PROGRESS',
      tasks: { some: { status: 'FAILED' } },
    },
    include: {
      employee: { select: { id: true, fullName: true } },
      tasks: { where: { status: 'FAILED' }, take: 3 },
    },
    take: 5,
  })

  const summary = {
    pendingContracts: pendingContracts.map((c: any) => ({
      id: c.id,
      name: c.candidateName,
      status: c.status,
      daysOld: Math.floor((Date.now() - new Date(c.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
      url: buildDeepLink('contract', c.id),
    })),
    upcomingStarts: upcomingStarts.map((e: any) => ({
      id: e.id,
      name: e.fullName,
      role: e.jobTitle,
      startDate: e.startDate?.toISOString().split('T')[0],
      url: buildDeepLink('employee', e.id),
    })),
    stuckWorkflows: [
      ...stuckOnboarding.map((w: any) => ({
        type: 'onboarding',
        id: w.id,
        employeeName: w.employee.fullName,
        failedTasks: w.tasks.length,
        url: buildDeepLink('onboarding', w.id),
      })),
      ...stuckOffboarding.map((w: any) => ({
        type: 'offboarding',
        id: w.id,
        employeeName: w.employee.fullName,
        failedTasks: w.tasks.length,
        url: buildDeepLink('offboarding', w.id),
      })),
    ],
  }

  let message = '## Daily Brief\n\n'

  if (summary.pendingContracts.length > 0) {
    message += `### ⏳ Pending Contracts (${summary.pendingContracts.length})\n`
    summary.pendingContracts.forEach((c: { name: string; status: string; daysOld: number }) => {
      message += `- ${c.name}: ${c.status} (${c.daysOld} days old)\n`
    })
    message += '\n'
  } else {
    message += '### ✓ No pending contracts requiring attention\n\n'
  }

  if (summary.upcomingStarts.length > 0) {
    message += `### 🗓 Upcoming Starts (${summary.upcomingStarts.length})\n`
    summary.upcomingStarts.forEach((e: { name: string; role: string; startDate: string }) => {
      message += `- ${e.name} (${e.role}) - ${e.startDate}\n`
    })
    message += '\n'
  } else {
    message += '### No upcoming starts in the next 7 days\n\n'
  }

  if (summary.stuckWorkflows.length > 0) {
    message += `### ⚠️ Stuck Workflows (${summary.stuckWorkflows.length})\n`
    summary.stuckWorkflows.forEach((w) => {
      message += `- ${w.employeeName}: ${w.type} has ${w.failedTasks} failed task(s)\n`
    })
  } else {
    message += '### ✓ No stuck workflows\n'
  }

  return {
    status: 'ok',
    data: summary,
    message,
  }
}

// V3 Bulk Operations
async function bulkStartOnboarding(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { startDateFrom, startDateTo, dryRun, approvalToken } = args as {
    startDateFrom?: string
    startDateTo?: string
    dryRun?: boolean
    approvalToken?: string
  }

  if (!startDateFrom || !startDateTo) {
    return {
      status: 'missing_fields',
      missingFields: ['startDateFrom', 'startDateTo'],
      message: 'Please provide both startDateFrom and startDateTo.',
    }
  }

  // Find eligible employees
  const employees = await ctx.prisma.employee.findMany({
    where: {
      status: { in: ['OFFER_SIGNED', 'HIRED_PENDING_START'] },
      startDate: {
        gte: new Date(startDateFrom),
        lte: new Date(startDateTo),
      },
      onboardingWorkflows: {
        none: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      },
    },
    select: {
      id: true,
      fullName: true,
      jobTitle: true,
      startDate: true,
      status: true,
    },
    take: 50,
  })

  if (employees.length === 0) {
    return {
      status: 'ok',
      data: { affectedCount: 0 },
      message: 'No eligible employees found for onboarding in this date range.',
    }
  }

  const preview = {
    action: 'bulk_start_onboarding',
    affectedCount: employees.length,
    items: employees.map((e: any) => ({
      id: e.id,
      name: e.fullName,
      role: e.jobTitle,
      startDate: e.startDate?.toISOString().split('T')[0],
      status: e.status,
    })),
  }

  // Dry run mode - create approval plan
  if (dryRun || (!dryRun && !approvalToken)) {
    const { getOrganization } = await import('@/lib/organization')
    const organization = await getOrganization()

    const plan = await createApprovalPlan(ctx, 'bulk_start_onboarding', preview, organization.id)

    return {
      status: 'confirmation_required',
      summary: `Ready to start onboarding for ${employees.length} employee(s). Expires in 15 minutes.`,
      message: `**Preview:**\n${employees.map((e: any) => `- ${e.fullName} (${e.jobTitle})`).join('\n')}\n\nTo execute, call bulk_start_onboarding with approvalToken="${plan.planId}"`,
      data: { planId: plan.planId, preview, expiresAt: plan.expiresAt },
    }
  }

  // Execute with approval token
  if (!approvalToken) {
    return { status: 'error', message: 'Approval token is required to start onboarding.' }
  }
  const approval = await validateAndConsumeApproval(ctx, approvalToken, 'bulk_start_onboarding')
  if (!approval.valid) {
    return { status: 'error', message: approval.error! }
  }

  // Execute bulk onboarding
  const results: Array<{ employeeId: string; name: string; success: boolean; error?: string }> = []

  for (const emp of employees) {
    try {
      const result = await startOnboarding({ employeeId: emp.id, confirmed: true }, ctx)
      results.push({
        employeeId: emp.id,
        name: emp.fullName,
        success: result.status === 'ok',
        error: result.status !== 'ok' ? result.message : undefined,
      })
    } catch (error) {
      results.push({
        employeeId: emp.id,
        name: emp.fullName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'bulk_operation',
    metadata: {
      tool: 'bulk_start_onboarding',
      totalAttempted: results.length,
      successful,
      failed,
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: { results, successful, failed },
    message: `Bulk onboarding completed: ${successful} successful, ${failed} failed.`,
  }
}

async function bulkResendContracts(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { viewedDaysAgo = 3, dryRun, approvalToken } = args as {
    viewedDaysAgo?: number
    dryRun?: boolean
    approvalToken?: string
  }

  const cutoffDate = new Date(Date.now() - viewedDaysAgo * 24 * 60 * 60 * 1000)

  // Find contracts viewed but not signed after N days
  const contracts = await ctx.prisma.offer.findMany({
    where: {
      status: 'VIEWED',
      esignSentAt: { lt: cutoffDate },
    },
    select: {
      id: true,
      candidateName: true,
      candidateEmail: true,
      status: true,
      esignSentAt: true,
    },
    take: 50,
  })

  if (contracts.length === 0) {
    return {
      status: 'ok',
      data: { affectedCount: 0 },
      message: `No contracts found that have been in VIEWED status for more than ${viewedDaysAgo} days.`,
    }
  }

  const preview = {
    action: 'bulk_resend_contracts',
    affectedCount: contracts.length,
    items: contracts.map((c: any) => ({
      id: c.id,
      name: c.candidateName,
      email: c.candidateEmail,
      daysSinceSent: Math.floor((Date.now() - new Date(c.esignSentAt).getTime()) / (24 * 60 * 60 * 1000)),
    })),
  }

  // Dry run mode
  if (dryRun || (!dryRun && !approvalToken)) {
    const { getOrganization } = await import('@/lib/organization')
    const organization = await getOrganization()

    const plan = await createApprovalPlan(ctx, 'bulk_resend_contracts', preview, organization.id)

    return {
      status: 'confirmation_required',
      summary: `Ready to resend ${contracts.length} contract(s). Expires in 15 minutes.`,
      message: `**Preview:**\n${contracts.map((c: any) => `- ${c.candidateName} (viewed ${Math.floor((Date.now() - new Date(c.esignSentAt).getTime()) / (24 * 60 * 60 * 1000))} days ago)`).join('\n')}\n\nTo execute, call bulk_resend_contracts with approvalToken="${plan.planId}"`,
      data: { planId: plan.planId, preview, expiresAt: plan.expiresAt },
    }
  }

  // Execute with approval token
  if (!approvalToken) {
    return { status: 'error', message: 'Approval token is required to resend contracts.' }
  }
  const approval = await validateAndConsumeApproval(ctx, approvalToken, 'bulk_resend_contracts')
  if (!approval.valid) {
    return { status: 'error', message: approval.error! }
  }

  const results: Array<{ contractId: string; name: string; success: boolean; error?: string }> = []

  for (const contract of contracts) {
    try {
      const result = await resendContract({ contractId: contract.id, confirmed: true }, ctx)
      results.push({
        contractId: contract.id,
        name: contract.candidateName,
        success: result.status === 'ok',
        error: result.status !== 'ok' ? result.message : undefined,
      })
    } catch (error) {
      results.push({
        contractId: contract.id,
        name: contract.candidateName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'bulk_operation',
    metadata: {
      tool: 'bulk_resend_contracts',
      totalAttempted: results.length,
      successful,
      failed,
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: { results, successful, failed },
    message: `Bulk resend completed: ${successful} successful, ${failed} failed.`,
  }
}

async function bulkDeprovisionAccess(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { includeOffboarding = false, dryRun, approvalToken } = args as {
    includeOffboarding?: boolean
    dryRun?: boolean
    approvalToken?: string
  }

  const statuses = includeOffboarding ? ['EXITED', 'OFFBOARDING'] : ['EXITED']

  // Find employees with active app accounts that need deprovisioning
  const employeesWithActiveAccounts = await ctx.prisma.employee.findMany({
    where: {
      status: { in: statuses },
      appAccounts: { some: { status: 'ACTIVE' } },
    },
    include: {
      appAccounts: {
        where: { status: 'ACTIVE' },
        include: { app: { select: { id: true, name: true, type: true } } },
      },
    },
    take: 50,
  })

  if (employeesWithActiveAccounts.length === 0) {
    return {
      status: 'ok',
      data: { affectedCount: 0 },
      message: 'No employees found with active app accounts that need deprovisioning.',
    }
  }

  const preview = {
    action: 'bulk_deprovision_access',
    affectedCount: employeesWithActiveAccounts.length,
    items: employeesWithActiveAccounts.map((e: any) => ({
      id: e.id,
      name: e.fullName,
      status: e.status,
      activeApps: e.appAccounts.map((a: any) => a.app.name),
    })),
  }

  // Dry run mode
  if (dryRun || (!dryRun && !approvalToken)) {
    const { getOrganization } = await import('@/lib/organization')
    const organization = await getOrganization()

    const plan = await createApprovalPlan(ctx, 'bulk_deprovision_access', preview, organization.id)

    return {
      status: 'confirmation_required',
      summary: `Ready to deprovision access for ${employeesWithActiveAccounts.length} employee(s). Expires in 15 minutes.`,
      message: `**Preview:**\n${employeesWithActiveAccounts.map((e: any) => `- ${e.fullName}: ${e.appAccounts.length} active app(s)`).join('\n')}\n\nTo execute, call bulk_deprovision_access with approvalToken="${plan.planId}"`,
      data: { planId: plan.planId, preview, expiresAt: plan.expiresAt },
    }
  }

  // Execute with approval token
  const approvalTokenValue = approvalToken ?? ''
  if (!approvalTokenValue) {
    return { status: 'error', message: 'Approval token is required to deprovision access.' }
  }
  const approval = await validateAndConsumeApproval(ctx, approvalTokenValue, 'bulk_deprovision_access')
  if (!approval.valid) {
    return { status: 'error', message: approval.error! }
  }

  const { deprovisionEmployeeFromAllApps } = await import('@/lib/integrations')

  const results: Array<{ employeeId: string; name: string; success: boolean; appsDeprovisioned: number; error?: string }> = []

  for (const emp of employeesWithActiveAccounts) {
    try {
      const resultMap = await deprovisionEmployeeFromAllApps(emp, ctx.user.id)
      const appResults = Object.values(resultMap)
      const successCount = appResults.filter((r) => r.success).length
      const allSucceeded = appResults.length > 0 && successCount === appResults.length
      const firstError = appResults.find((r) => !r.success && r.error)?.error
      results.push({
        employeeId: emp.id,
        name: emp.fullName,
        success: allSucceeded,
        appsDeprovisioned: successCount,
        error: firstError,
      })
    } catch (error) {
      results.push({
        employeeId: emp.id,
        name: emp.fullName,
        success: false,
        appsDeprovisioned: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  const totalAppsDeprovisioned = results.reduce((sum, r) => sum + r.appsDeprovisioned, 0)

  await createAuditLog({
    actorId: ctx.user.id,
    action: 'ASSISTANT_ACTION',
    resourceType: 'bulk_operation',
    metadata: {
      tool: 'bulk_deprovision_access',
      totalAttempted: results.length,
      successful,
      failed,
      totalAppsDeprovisioned,
      assistantInitiated: true,
    },
  })

  return {
    status: 'ok',
    data: { results, successful, failed, totalAppsDeprovisioned },
    message: `Bulk deprovisioning completed: ${successful} employees processed (${failed} failed), ${totalAppsDeprovisioned} app(s) deprovisioned.`,
  }
}

// ============================================
// AI PROVIDER ABSTRACTION
// ============================================

interface AIClient {
  chat(messages: Message[], tools: typeof TOOL_DEFINITIONS): Promise<{
    content: string | null
    toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>
    finishReason: string
  }>
}

const OPENAI_MODEL_EXCLUDE_TOKENS = ['audio', 'realtime', 'transcribe', 'translate', 'embeddings', 'instruct', 'tts']

const isOpenAIChatModel = (id: string) =>
  id.startsWith('gpt-') && !OPENAI_MODEL_EXCLUDE_TOKENS.some((token) => id.includes(token))

const normalizeModelLabel = (id: string) => id

async function listOpenAIModels(apiKey: string): Promise<ModelOption[]> {
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey })
  const models: Array<{ id: string; created?: number }> = []

  for await (const model of client.models.list()) {
    models.push(model)
  }

  return models
    .filter((model: { id: string }) => isOpenAIChatModel(model.id))
    .sort((a: { created?: number }, b: { created?: number }) => (b.created ?? 0) - (a.created ?? 0))
    .map((model: { id: string }) => ({
      id: model.id,
      label: normalizeModelLabel(model.id),
    }))
}

async function listAnthropicModels(apiKey: string): Promise<ModelOption[]> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey })
  const models: Array<{ id: string; created_at?: string; display_name?: string }> = []

  for await (const model of client.models.list()) {
    models.push(model)
  }

  return models
    .filter((model: { id: string }) => model.id.startsWith('claude-'))
    .sort((a: { created_at?: string }, b: { created_at?: string }) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      return bTime - aTime
    })
    .map((model: { id: string; display_name?: string }) => ({
      id: model.id,
      label: model.display_name || model.id,
    }))
}

async function listGeminiModels(apiKey: string): Promise<ModelOption[]> {
  const url = new URL('https://generativelanguage.googleapis.com/v1beta/models')
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString(), {
    headers: {
      'x-goog-api-key': apiKey,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Failed to load Gemini models.')
  }

  const payload = (await response.json()) as {
    models?: Array<{
      name?: string
      displayName?: string
      supportedGenerationMethods?: string[]
    }>
  }

  const models = payload.models ?? []

  return models
    .filter((model) => (model.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((model) => {
      const rawName = model.name || ''
      const id = rawName.replace(/^models\//, '')
      return {
        id,
        label: model.displayName || id,
      }
    })
    .filter((model) => model.id)
}

const OPENAI_MAX_COMPLETION_TOKEN_MODELS = [/^gpt-5/i, /^o\d/i]
const OPENAI_FIXED_TEMPERATURE_MODELS = [/^gpt-5/i, /^o\d/i]

const usesMaxCompletionTokens = (modelId: string) =>
  OPENAI_MAX_COMPLETION_TOKEN_MODELS.some((pattern) => pattern.test(modelId))

const usesFixedTemperature = (modelId: string) =>
  OPENAI_FIXED_TEMPERATURE_MODELS.some((pattern) => pattern.test(modelId))

async function createOpenAIClient(apiKey: string, model: string): Promise<AIClient> {
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey })

  return {
    async chat(messages, tools) {
      const tokenParams = usesMaxCompletionTokens(model)
        ? { max_completion_tokens: 1024 }
        : { max_tokens: 1024 }

      const samplingParams = usesFixedTemperature(model) ? {} : { temperature: 0.7 }

      const response = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
        tools,
        tool_choice: 'auto',
        ...samplingParams,
        ...tokenParams,
      })

      const choice = response.choices[0]
      const toolCalls = choice.message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }))

      return {
        content: choice.message.content,
        toolCalls,
        finishReason: choice.finish_reason || 'stop',
      }
    },
  }
}

async function createAnthropicClient(apiKey: string, model: string): Promise<AIClient> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey })

  // Convert OpenAI tool format to Anthropic format
  const convertTools = (tools: typeof TOOL_DEFINITIONS) =>
    tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: {
        type: 'object' as const,
        properties: t.function.parameters.properties,
        required: t.function.parameters.required,
      },
    }))

  return {
    async chat(messages, tools) {
      const systemMessage = messages.find((m) => m.role === 'system')
      const chatMessages = messages.filter((m) => m.role !== 'system')

      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: systemMessage?.content || SYSTEM_PROMPT,
        messages: chatMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        tools: convertTools(tools) as any,
      })

      const textContent = response.content.find((c) => c.type === 'text')
      const toolUses = response.content.filter((c) => c.type === 'tool_use')

      return {
        content: textContent && textContent.type === 'text' ? textContent.text : null,
        toolCalls: toolUses.map((tu) => {
          if (tu.type !== 'tool_use') throw new Error('Unexpected content type')
          return {
            id: tu.id,
            name: tu.name,
            arguments: tu.input as Record<string, unknown>,
          }
        }),
        finishReason: response.stop_reason || 'end_turn',
      }
    },
  }
}

async function createGeminiClient(apiKey: string, model: string): Promise<AIClient> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(apiKey)

  // Convert OpenAI tool format to Gemini format
  const convertTools = (tools: typeof TOOL_DEFINITIONS): any[] => [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: {
          type: 'OBJECT',
          properties: t.function.parameters.properties,
          required: t.function.parameters.required || [],
        },
      })),
    },
  ]

  return {
    async chat(messages, tools) {
      const systemMessage = messages.find((m) => m.role === 'system')
      const chatMessages = messages.filter((m) => m.role !== 'system')

      const geminiModel = genAI.getGenerativeModel({
        model,
        systemInstruction: systemMessage?.content || SYSTEM_PROMPT,
        tools: convertTools(tools),
      })

      const chat = geminiModel.startChat({
        history: chatMessages.slice(0, -1).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      })

      const lastMessage = chatMessages[chatMessages.length - 1]
      const result = await chat.sendMessage(lastMessage.content)
      const response = result.response

      const text = response.text()
      const functionCalls = response.functionCalls()

      return {
        content: text || null,
        toolCalls: functionCalls?.map((fc, idx) => ({
          id: `call_${idx}`,
          name: fc.name,
          arguments: fc.args as Record<string, unknown>,
        })),
        finishReason: 'stop',
      }
    },
  }
}

async function getAIClient(settings: {
  provider: AIProvider
  openaiKeyEncrypted?: string | null
  anthropicKeyEncrypted?: string | null
  geminiKeyEncrypted?: string | null
  openaiModel: string
  anthropicModel: string
  geminiModel: string
}): Promise<AIClient> {
  switch (settings.provider) {
    case 'OPENAI': {
      if (!settings.openaiKeyEncrypted) {
        throw new Error('OpenAI API key not configured. Go to Settings > Blue AI to add your API key.')
      }
      const apiKey = decrypt(settings.openaiKeyEncrypted)
      return createOpenAIClient(apiKey, settings.openaiModel)
    }
    case 'ANTHROPIC': {
      if (!settings.anthropicKeyEncrypted) {
        throw new Error('Anthropic API key not configured. Go to Settings > Blue AI to add your API key.')
      }
      const apiKey = decrypt(settings.anthropicKeyEncrypted)
      return createAnthropicClient(apiKey, settings.anthropicModel)
    }
    case 'GEMINI': {
      if (!settings.geminiKeyEncrypted) {
        throw new Error('Gemini API key not configured. Go to Settings > Blue AI to add your API key.')
      }
      const apiKey = decrypt(settings.geminiKeyEncrypted)
      return createGeminiClient(apiKey, settings.geminiModel)
    }
    default:
      throw new Error(`Unknown AI provider: ${settings.provider}`)
  }
}

// ============================================
// V4 HIRING PIPELINE TOOL IMPLEMENTATIONS
// ============================================

async function searchCandidates(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { query, jobId, stage, limit = 10 } = args as {
    query?: string
    jobId?: string
    stage?: string
    limit?: number
  }

  const where: Record<string, unknown> = {}

  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ]
  }

  if (jobId) where.jobId = jobId
  if (stage) where.stage = stage

  const candidates = await ctx.prisma.jobCandidate.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: { updatedAt: 'desc' },
    include: {
      job: { select: { id: true, title: true } },
    },
  })

  const results = candidates.map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    stage: c.stage,
    jobTitle: c.job?.title || null,
    jobId: c.job?.id || null,
    appliedAt: c.appliedAt,
    url: buildDeepLink('candidate', c.id),
  }))

  return {
    status: 'ok',
    data: { candidates: results, total: results.length },
    message: results.length === 0
      ? 'No candidates found matching your criteria.'
      : `Found ${results.length} candidate(s).`,
  }
}

async function getCandidate(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { candidateId } = args as { candidateId?: string }

  if (!candidateId) {
    return { status: 'missing_fields', missingFields: ['candidateId'], message: 'Please provide the candidate ID.' }
  }

  const candidate = await ctx.prisma.jobCandidate.findUnique({
    where: { id: candidateId },
    include: {
      job: { select: { id: true, title: true, department: true } },
      interviews: {
        orderBy: { scheduledAt: 'desc' },
        take: 3,
        select: {
          id: true,
          stageName: true,
          status: true,
          scheduledAt: true,
          overallScore: true,
        },
      },
      assessments: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          status: true,
          overallScore: true,
          recommendation: true,
        },
      },
    },
  })

  if (!candidate) {
    return { status: 'error', message: 'Candidate not found.' }
  }

  // Get latest AI analysis
  const analysis = await ctx.prisma.candidateAIAnalysis.findFirst({
    where: { candidateId, isLatest: true },
    select: {
      recommendation: true,
      confidence: true,
      overallScore: true,
      summary: true,
      strengths: true,
      concerns: true,
    },
  })

  const profile = {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    stage: candidate.stage,
    source: candidate.source,
    appliedAt: candidate.appliedAt,
    job: candidate.job,
    // Scores
    experienceScore: candidate.experienceScore,
    skillsScore: candidate.skillsScore,
    domainScore: candidate.domainScore,
    overallAIScore: candidate.overallAIScore,
    // AI Analysis summary
    aiAnalysis: analysis ? {
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      overallScore: analysis.overallScore,
      summary: analysis.summary,
      strengths: analysis.strengths?.slice(0, 3),
      concerns: (analysis.concerns as any[])?.slice(0, 3)?.map((c: any) => c.title || c),
    } : null,
    // Recent activity
    recentInterviews: candidate.interviews,
    recentAssessments: candidate.assessments,
    url: buildDeepLink('candidate', candidate.id),
  }

  return {
    status: 'ok',
    data: { candidate: profile },
    message: `${candidate.name} - ${candidate.stage} stage for ${candidate.job?.title || 'Unknown Role'}`,
  }
}

async function getCandidateTimeline(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { candidateId } = args as { candidateId?: string }

  if (!candidateId) {
    return { status: 'missing_fields', missingFields: ['candidateId'], message: 'Please provide the candidate ID.' }
  }

  const candidate = await ctx.prisma.jobCandidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      name: true,
      email: true,
      stage: true,
      appliedAt: true,
      job: { select: { title: true } },
    },
  })

  if (!candidate) {
    return { status: 'error', message: 'Candidate not found.' }
  }

  // Get interviews
  const interviews = await ctx.prisma.candidateInterview.findMany({
    where: { candidateId },
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true,
      stageName: true,
      status: true,
      scheduledAt: true,
      completedAt: true,
      overallScore: true,
    },
  })

  // Get assessments
  const assessments = await ctx.prisma.candidateAssessment.findMany({
    where: { candidateId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      overallScore: true,
      createdAt: true,
      completedAt: true,
      template: { select: { name: true } },
    },
  })

  // Get AI analyses
  const analyses = await ctx.prisma.candidateAIAnalysis.findMany({
    where: { candidateId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      analysisType: true,
      recommendation: true,
      createdAt: true,
    },
  })

  // Build timeline
  const timeline: Array<{ date: Date; type: string; title: string; status?: string; score?: number }> = []

  // Add application
  if (candidate.appliedAt) {
    timeline.push({
      date: candidate.appliedAt,
      type: 'APPLICATION',
      title: `Applied for ${candidate.job?.title || 'position'}`,
    })
  }

  // Add interviews
  interviews.forEach((i: any) => {
    timeline.push({
      date: i.scheduledAt,
      type: 'INTERVIEW',
      title: i.stageName || 'Interview',
      status: i.status,
      score: i.overallScore,
    })
  })

  // Add assessments
  assessments.forEach((a: any) => {
    timeline.push({
      date: a.createdAt,
      type: 'ASSESSMENT',
      title: a.template?.name || 'Assessment',
      status: a.status,
      score: a.overallScore,
    })
  })

  // Add AI analyses
  analyses.forEach((a: any) => {
    timeline.push({
      date: a.createdAt,
      type: 'AI_ANALYSIS',
      title: `${a.analysisType} - ${a.recommendation || 'Pending'}`,
    })
  })

  // Sort by date
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return {
    status: 'ok',
    data: {
      candidate: { id: candidate.id, name: candidate.name, currentStage: candidate.stage },
      timeline,
    },
    message: `Timeline for ${candidate.name}: ${timeline.length} events`,
  }
}

async function listJobs(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { status, limit = 10 } = args as { status?: string; limit?: number }

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const jobs = await ctx.prisma.job.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { candidates: true } },
    },
  })

  const results = jobs.map((j: any) => ({
    id: j.id,
    title: j.title,
    status: j.status,
    department: j.department,
    location: j.location,
    employmentType: j.employmentType,
    candidateCount: j._count.candidates,
    createdAt: j.createdAt,
    url: buildDeepLink('job', j.id),
  }))

  return {
    status: 'ok',
    data: { jobs: results, total: results.length },
    message: results.length === 0
      ? 'No jobs found matching your criteria.'
      : `Found ${results.length} job(s).`,
  }
}

async function getJobPipeline(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { jobId } = args as { jobId?: string }

  if (!jobId) {
    return { status: 'missing_fields', missingFields: ['jobId'], message: 'Please provide the job ID.' }
  }

  const job = await ctx.prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      status: true,
      department: true,
    },
  })

  if (!job) {
    return { status: 'error', message: 'Job not found.' }
  }

  // Get candidates grouped by stage
  const candidates = await ctx.prisma.jobCandidate.findMany({
    where: { jobId },
    select: {
      id: true,
      name: true,
      email: true,
      stage: true,
      overallAIScore: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Group by stage
  const stageOrder = ['APPLIED', 'HR_SCREEN', 'TEAM_CHAT', 'TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED', 'REJECTED', 'ARCHIVED']
  const pipeline: Record<string, Array<{ id: string; name: string; email: string; score?: number }>> = {}

  stageOrder.forEach(stage => {
    pipeline[stage] = []
  })

  candidates.forEach((c: any) => {
    if (pipeline[c.stage]) {
      pipeline[c.stage].push({
        id: c.id,
        name: c.name,
        email: c.email,
        score: c.overallAIScore,
      })
    }
  })

  // Build summary
  const activeCandidates = candidates.filter((c: any) => !['REJECTED', 'ARCHIVED', 'HIRED'].includes(c.stage))
  const summary = {
    total: candidates.length,
    active: activeCandidates.length,
    hired: pipeline['HIRED'].length,
    rejected: pipeline['REJECTED'].length,
  }

  return {
    status: 'ok',
    data: { job, pipeline, summary },
    message: `${job.title}: ${summary.active} active candidates across stages. ${summary.hired} hired, ${summary.rejected} rejected.`,
  }
}

// ============================================
// V4 AI ANALYSIS TOOL IMPLEMENTATIONS
// ============================================

async function getCandidateAnalysis(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { candidateId } = args as { candidateId?: string }

  if (!candidateId) {
    return { status: 'missing_fields', missingFields: ['candidateId'], message: 'Please provide the candidate ID.' }
  }

  const candidate = await ctx.prisma.jobCandidate.findUnique({
    where: { id: candidateId },
    select: { id: true, name: true, stage: true },
  })

  if (!candidate) {
    return { status: 'error', message: 'Candidate not found.' }
  }

  const analysis = await ctx.prisma.candidateAIAnalysis.findFirst({
    where: { candidateId, isLatest: true },
  })

  if (!analysis) {
    return {
      status: 'ok',
      data: null,
      message: `No AI analysis found for ${candidate.name}. Use analyze_candidate to generate one.`,
    }
  }

  const result = {
    id: analysis.id,
    version: analysis.version,
    analysisType: analysis.analysisType,
    recommendation: analysis.recommendation,
    confidence: analysis.confidence,
    overallScore: analysis.overallScore,
    summary: analysis.summary,
    strengths: analysis.strengths,
    concerns: analysis.concerns,
    mustValidatePoints: analysis.mustValidatePoints,
    nextStageQuestions: analysis.nextStageQuestions,
    scoreBreakdown: analysis.scoreBreakdown,
    sentimentScore: analysis.sentimentScore,
    sentimentReason: analysis.sentimentReason,
    pressValues: analysis.pressValues,
    createdAt: analysis.createdAt,
    candidateUrl: buildDeepLink('candidate', candidateId),
  }

  return {
    status: 'ok',
    data: { analysis: result },
    message: `${candidate.name}: ${analysis.recommendation} (${analysis.confidence}% confidence). Score: ${analysis.overallScore}/100`,
  }
}

async function analyzeCandidate(
  args: Record<string, unknown>,
  ctx: { prisma: any; user: { id: string } }
): Promise<ToolResult> {
  const { candidateId, analysisType = 'COMPREHENSIVE', confirmed } = args as {
    candidateId?: string
    analysisType?: string
    confirmed?: boolean
  }

  if (!candidateId) {
    return { status: 'missing_fields', missingFields: ['candidateId'], message: 'Please provide the candidate ID.' }
  }

  const candidate = await ctx.prisma.jobCandidate.findUnique({
    where: { id: candidateId },
    include: { job: { select: { title: true } } },
  })

  if (!candidate) {
    return { status: 'error', message: 'Candidate not found.' }
  }

  // If not confirmed, return confirmation request
  if (!confirmed) {
    return {
      status: 'confirmation_required',
      missingFields: ['confirmed'],
      summary: `Ready to generate ${analysisType} analysis for ${candidate.name} (${candidate.job?.title || 'candidate'}).`,
      message: 'This will use AI credits. Please confirm to proceed.',
      data: { candidateId, candidateName: candidate.name, analysisType },
    }
  }

  // Generate analysis using the AI analysis library
  try {
    const { generateCandidateAnalysis } = await import('@/lib/ai/hiring/analysis')
    const analysis = await generateCandidateAnalysis({
      candidateId,
      analysisType: analysisType as any,
      triggerEvent: 'assistant_request',
    })

    return {
      status: 'ok',
      data: {
        analysisId: analysis.id,
        recommendation: analysis.recommendation,
        confidence: analysis.confidence,
        overallScore: analysis.overallScore,
        summary: analysis.summary,
      },
      message: `Analysis generated for ${candidate.name}: ${analysis.recommendation} (${analysis.confidence}% confidence). [View candidate](${buildDeepLink('candidate', candidateId)})`,
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to generate analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

async function getCandidateSentimentHistory(
  args: Record<string, unknown>,
  ctx: { prisma: any }
): Promise<ToolResult> {
  const { candidateId } = args as { candidateId?: string }

  if (!candidateId) {
    return { status: 'missing_fields', missingFields: ['candidateId'], message: 'Please provide the candidate ID.' }
  }

  const candidate = await ctx.prisma.jobCandidate.findUnique({
    where: { id: candidateId },
    select: { id: true, name: true },
  })

  if (!candidate) {
    return { status: 'error', message: 'Candidate not found.' }
  }

  const analyses = await ctx.prisma.candidateAIAnalysis.findMany({
    where: { candidateId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      version: true,
      analysisType: true,
      recommendation: true,
      confidence: true,
      overallScore: true,
      sentimentScore: true,
      sentimentChange: true,
      sentimentReason: true,
      triggerStage: true,
      createdAt: true,
    },
  })

  if (analyses.length === 0) {
    return {
      status: 'ok',
      data: { history: [] },
      message: `No analysis history found for ${candidate.name}.`,
    }
  }

  const history = analyses.map((a: any) => ({
    version: a.version,
    type: a.analysisType,
    stage: a.triggerStage,
    recommendation: a.recommendation,
    confidence: a.confidence,
    overallScore: a.overallScore,
    sentimentScore: a.sentimentScore,
    sentimentChange: a.sentimentChange,
    sentimentReason: a.sentimentReason,
    date: a.createdAt,
  }))

  // Calculate trend
  const firstScore = history[0]?.overallScore || 0
  const lastScore = history[history.length - 1]?.overallScore || 0
  const trend = lastScore > firstScore ? 'improving' : lastScore < firstScore ? 'declining' : 'stable'

  return {
    status: 'ok',
    data: { candidate: { id: candidate.id, name: candidate.name }, history, trend },
    message: `${candidate.name}: ${history.length} analyses. Trend: ${trend}. Latest: ${history[history.length - 1]?.recommendation || 'N/A'}`,
  }
}

// ============================================
// ROUTER
// ============================================

export const assistantRouter = router({
  // Chat history
  listChats: adminProcedure.query(async ({ ctx }) => {
    const aiChats = getAIChatDelegate(ctx)
    const chats = (await aiChats.findMany({
      where: { userId: ctx.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })) as Array<{ id: string; title: string | null; updatedAt: Date; messages: Array<{ content: string; createdAt: Date }> }>

    return chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt,
      lastMessage: chat.messages[0]
        ? {
            content: chat.messages[0].content,
            createdAt: chat.messages[0].createdAt,
          }
        : null,
    }))
  }),

  getChat: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const aiChats = getAIChatDelegate(ctx)
      const chat = await aiChats.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (!chat) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat not found.' })
      }

      return {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messages: chat.messages.map((message: { id: string; role: string; content: string; isError: boolean | null; createdAt: Date }) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          isError: message.isError,
          createdAt: message.createdAt,
        })),
      }
    }),

  createChat: adminProcedure
    .input(z.object({ title: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const aiChats = getAIChatDelegate(ctx)
      const chat = await aiChats.create({
        data: {
          userId: ctx.user.id,
          title: input.title?.trim() || undefined,
        },
      })

      return {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      }
    }),

  addMessage: adminProcedure
    .input(
      z.object({
        chatId: z.string(),
        role: z.enum(['USER', 'ASSISTANT']),
        content: z.string(),
        isError: z.boolean().optional(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const aiChats = getAIChatDelegate(ctx)
      const aiMessages = getAIChatMessageDelegate(ctx)
      const chat = await aiChats.findFirst({
        where: { id: input.chatId, userId: ctx.user.id },
      })

      if (!chat) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat not found.' })
      }

      const message = await aiMessages.create({
        data: {
          chatId: input.chatId,
          role: input.role,
          content: input.content,
          isError: input.isError ?? false,
        },
      })

      const updatedChat = await aiChats.update({
        where: { id: input.chatId },
        data: {
          title: input.title?.trim() || undefined,
          updatedAt: new Date(),
        },
      })

      return {
        chatId: updatedChat.id,
        updatedAt: updatedChat.updatedAt,
        title: updatedChat.title,
        message: {
          id: message.id,
          role: message.role,
          content: message.content,
          isError: message.isError,
          createdAt: message.createdAt,
        },
      }
    }),

  // Get or create AI settings
  getSettings: adminProcedure.query(async ({ ctx }) => {
    const aiSettings = getAISettingsDelegate(ctx)
    let settings = await aiSettings.findFirst()

    if (!settings) {
      settings = await aiSettings.create({
        data: {},
      })
    }

    // Return settings without exposing raw keys
    return {
      id: settings.id,
      provider: settings.provider,
      openaiModel: settings.openaiModel,
      anthropicModel: settings.anthropicModel,
      geminiModel: settings.geminiModel,
      isEnabled: settings.isEnabled,
      requireConfirmation: settings.requireConfirmation,
      hasOpenaiKey: !!settings.openaiKeyEncrypted,
      hasAnthropicKey: !!settings.anthropicKeyEncrypted,
      hasGeminiKey: !!settings.geminiKeyEncrypted,
    }
  }),

  // Update AI settings
  updateSettings: adminProcedure
    .input(
      z.object({
        provider: z.enum(['OPENAI', 'ANTHROPIC', 'GEMINI']).optional(),
        openaiKey: z.string().optional(),
        anthropicKey: z.string().optional(),
        geminiKey: z.string().optional(),
        openaiModel: z.string().optional(),
        anthropicModel: z.string().optional(),
        geminiModel: z.string().optional(),
        isEnabled: z.boolean().optional(),
        requireConfirmation: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const aiSettings = getAISettingsDelegate(ctx)
      let settings = await aiSettings.findFirst()

      const updateData: Record<string, unknown> = {}

      if (input.provider) updateData.provider = input.provider
      if (input.openaiKey?.trim()) updateData.openaiKeyEncrypted = encryptKeyOrThrow(input.openaiKey)
      if (input.anthropicKey?.trim()) updateData.anthropicKeyEncrypted = encryptKeyOrThrow(input.anthropicKey)
      if (input.geminiKey?.trim()) updateData.geminiKeyEncrypted = encryptKeyOrThrow(input.geminiKey)
      if (input.openaiModel) updateData.openaiModel = input.openaiModel
      if (input.anthropicModel) updateData.anthropicModel = input.anthropicModel
      if (input.geminiModel) updateData.geminiModel = input.geminiModel
      if (input.isEnabled !== undefined) updateData.isEnabled = input.isEnabled
      if (input.requireConfirmation !== undefined) updateData.requireConfirmation = input.requireConfirmation

      if (settings) {
        settings = await aiSettings.update({
          where: { id: settings.id },
          data: updateData,
        })
      } else {
        settings = await aiSettings.create({
          data: updateData,
        })
      }

      return {
        id: settings.id,
        provider: settings.provider,
        isEnabled: settings.isEnabled,
      }
    }),

  // Main chat endpoint
  chat: hrAdminProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get AI settings
      const settings = await getAISettingsDelegate(ctx).findFirst()

      if (!settings || !settings.isEnabled) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Blue AI is not enabled. Go to Settings > Blue AI to configure.',
        })
      }

      // Create AI client
      const aiClient = await getAIClient(settings)

      // Build messages with system prompt
      const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...input.messages,
      ]

      // First API call
      let response = await aiClient.chat(messages, TOOL_DEFINITIONS)
      let iterations = 0
      const maxIterations = 5

      // Tool execution loop
      while (response.toolCalls && response.toolCalls.length > 0 && iterations < maxIterations) {
        iterations++

        // Execute each tool call
        const toolResults: Array<{ id: string; name: string; result: ToolResult }> = []

        for (const toolCall of response.toolCalls) {
          const result = await executeTool(
            toolCall.name,
            toolCall.arguments,
            { prisma: ctx.prisma, user: ctx.user as { id: string; role: string; employeeId?: string } }
          )
          toolResults.push({ id: toolCall.id, name: toolCall.name, result })
        }

        // Add tool results to messages
        messages.push({
          role: 'assistant',
          content: response.content || JSON.stringify(response.toolCalls.map((tc) => ({ tool: tc.name, args: tc.arguments }))),
        })

        // Add tool responses as user message (simplified for all providers)
        const toolResponseContent = toolResults
          .map((tr) => `Tool "${tr.name}" result: ${JSON.stringify(tr.result)}`)
          .join('\n\n')

        messages.push({
          role: 'user',
          content: `[Tool Results]\n${toolResponseContent}`,
        })

        // Get next response
        response = await aiClient.chat(messages, TOOL_DEFINITIONS)
      }

      // Return final response
      return {
        content: response.content || 'I apologize, but I was unable to generate a response. Please try again.',
        toolsUsed: iterations > 0,
      }
    }),

  // Test connection to AI provider
  testConnection: adminProcedure.mutation(async ({ ctx }) => {
    const settings = await getAISettingsDelegate(ctx).findFirst()

    if (!settings) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'AI settings not configured.',
      })
    }

    try {
      const aiClient = await getAIClient(settings)
      await aiClient.chat(
        [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: 'Say "Connection successful" in exactly those words.' },
        ],
        []
      )
      return { success: true, message: 'Connection successful!' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }),

  // List available models for a provider
  listModels: adminProcedure
    .input(
      z.object({
        provider: z.enum(['OPENAI', 'ANTHROPIC', 'GEMINI']),
      })
    )
    .query(async ({ ctx, input }) => {
      const settings = await getAISettingsDelegate(ctx).findFirst()

      if (!settings) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI settings not configured.',
        })
      }

      switch (input.provider) {
        case 'OPENAI': {
          if (!settings.openaiKeyEncrypted) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: 'OpenAI API key not configured.',
            })
          }
          const apiKey = decrypt(settings.openaiKeyEncrypted)
          const models = await listOpenAIModels(apiKey)
          return { provider: input.provider, models }
        }
        case 'ANTHROPIC': {
          if (!settings.anthropicKeyEncrypted) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: 'Anthropic API key not configured.',
            })
          }
          const apiKey = decrypt(settings.anthropicKeyEncrypted)
          const models = await listAnthropicModels(apiKey)
          return { provider: input.provider, models }
        }
        case 'GEMINI': {
          if (!settings.geminiKeyEncrypted) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: 'Gemini API key not configured.',
            })
          }
          const apiKey = decrypt(settings.geminiKeyEncrypted)
          const models = await listGeminiModels(apiKey)
          return { provider: input.provider, models }
        }
        default:
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Unknown AI provider.',
          })
      }
    }),

  // Whisper transcription endpoint
  transcribe: hrAdminProcedure
    .input(
      z.object({
        audioBase64: z.string().describe('Base64 encoded audio data'),
        mimeType: z.string().default('audio/webm'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const aiSettingsDelegate = getAISettingsDelegate(ctx)
      const settings = await aiSettingsDelegate.findFirst()

      if (!settings?.openaiKeyEncrypted) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'OpenAI API key not configured. Whisper requires an OpenAI API key. Go to Settings > Blue AI to add your API key.',
        })
      }

      const apiKey = decrypt(settings.openaiKeyEncrypted)

      // Polyfill File for Node.js < 20 (required by OpenAI SDK)
      if (typeof globalThis.File === 'undefined') {
        const { File } = await import('node:buffer')
        globalThis.File = File as unknown as typeof globalThis.File
      }

      const { default: OpenAI } = await import('openai')
      const fs = await import('fs')
      const os = await import('os')
      const path = await import('path')
      const client = new OpenAI({ apiKey })

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(input.audioBase64, 'base64')

      // Determine file extension from mime type
      const extensionMap: Record<string, string> = {
        'audio/webm': 'webm',
        'audio/mp3': 'mp3',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/m4a': 'm4a',
      }
      const extension = extensionMap[input.mimeType] || 'webm'

      // Write to a temporary file (most reliable for OpenAI SDK)
      const tempDir = os.tmpdir()
      const tempFile = path.join(tempDir, `whisper-${Date.now()}.${extension}`)
      fs.writeFileSync(tempFile, audioBuffer)

      try {
        const transcription = await client.audio.transcriptions.create({
          file: fs.createReadStream(tempFile),
          model: 'whisper-1',
          language: 'en',
        })

        // Clean up temp file
        fs.unlinkSync(tempFile)

        console.log('[Whisper] Transcription completed:', {
          userId: ctx.session?.user?.id,
          textLength: transcription.text.length,
        })

        return { text: transcription.text }
      } catch (error) {
        // Clean up temp file on error
        try { fs.unlinkSync(tempFile) } catch {}
        console.error('[Whisper] Transcription failed:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to transcribe audio',
        })
      }
    }),
})
