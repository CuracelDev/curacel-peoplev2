# Curacel People

Internal HR / People Operations platform for managing the complete employee lifecycle - from recruitment through onboarding to offboarding.

---

## Version Overview

### V1 - Onboarding & Employee Management (Current)

The foundational platform for post-hire employee lifecycle management.

**Features:**
- **Offers & Contracts**: Create offer letters from templates, send for e-signature via DocuSign, track status
- **Employee Directory**: Central employee database with lifecycle tracking
- **Onboarding**: Automated and manual task workflows for new hires
- **Offboarding**: Scheduled or immediate offboarding with account deprovisioning
- **Integrations**: Google Workspace and Slack account provisioning/deprovisioning
- **RBAC**: Role-based access (Super Admin, HR Admin, IT Admin, Manager, Employee)
- **Audit Logging**: Complete audit trail of all actions
- **Blue AI Assistant**: AI-powered HR assistant for natural language queries

---

### V2 - Recruiter Agent (Planned)

AI-powered recruitment decision support system that sits before the onboarding flow, handling the full candidate pipeline from application to hire decision.

**New Features:**
- **Job Position Management**: Create and manage open positions with JD, rubrics, and scorecards
- **Applicant Tracking**: Full candidate pipeline with stage progression (Screening → Interview → Assessment → Offer)
- **AI Resume Screening**: Automated candidate scoring based on role requirements and company values
- **Interview Management**: Schedule interviews, upload transcripts, get AI-powered analysis
- **Question Generation**: AI generates customized interview questions per candidate/stage
- **Assessment Integration**: Track results from Kand.io, TestGorilla, and other platforms
- **Hire Decision Module**: Data-driven hire/no-hire recommendations with evidence
- **Seamless Transition**: Convert hired applicants to employees → triggers existing offer/onboarding flow

**Workflow:**
```
Recruiting (V2)                          Onboarding (V1)
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Job Posted  │ → │ Applications│ → │  Interview  │ → │   Hire      │
│             │   │ + Screening │   │   Stages    │   │  Decision   │
└─────────────┘   └─────────────┘   └─────────────┘   └──────┬──────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │ Create Employee │
                                                    │ + Draft Offer   │
                                                    └────────┬────────┘
                                                              │
                      ┌───────────────────────────────────────┘
                      ▼
              ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
              │ Send Offer  │ → │  Onboarding │ → │   Active    │
              │ (DocuSign)  │   │   Workflow  │   │  Employee   │
              └─────────────┘   └─────────────┘   └─────────────┘
```

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **API**: tRPC for type-safe APIs
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Claude API (Anthropic)
- **E-Signature**: DocuSign API
- **File Upload**: Uploadthing

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Cloud project (for OAuth and Workspace API)
- Slack workspace (for Slack integration)
- DocuSign developer account (optional, for e-signatures)
- Anthropic API key (for AI features)

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/CuracelDev/curacel-peoplev2.git
cd curacel-peoplev2
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/curacel_people"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth (for SSO)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Company settings
COMPANY_NAME="Your Company"
COMPANY_DOMAIN="yourcompany.com"

# AI
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### 3. Database Setup

Run migrations to create the database schema:

```bash
npx prisma migrate dev
```

Seed the database with default data:

```bash
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable OAuth 2.0
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env`

### Google Workspace Integration

For account provisioning, you need:

1. Google Workspace admin access
2. Service account with domain-wide delegation
3. Enable Admin SDK API
4. Grant scopes:
   - `https://www.googleapis.com/auth/admin.directory.user`
   - `https://www.googleapis.com/auth/admin.directory.group`

Add to `.env`:

```env
GOOGLE_WORKSPACE_DOMAIN="yourcompany.com"
GOOGLE_WORKSPACE_ADMIN_EMAIL="admin@yourcompany.com"
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### Slack Integration

1. Create a Slack App at [api.slack.com](https://api.slack.com/apps)
2. Add Bot Token Scopes:
   - `users:read`
   - `users:read.email`
   - `channels:read`
   - `channels:manage` (for inviting to channels)
   - `groups:read`
   - `groups:write`
3. Install to workspace
4. Copy Bot Token to `.env`

```env
SLACK_BOT_TOKEN="xoxb-your-bot-token"
SLACK_SIGNING_SECRET="your-signing-secret"
```

### DocuSign Integration

1. Create a DocuSign developer account
2. Create an integration key (app)
3. Generate RSA keypair
4. Configure JWT authentication

```env
DOCUSIGN_INTEGRATION_KEY="your-integration-key"
DOCUSIGN_USER_ID="your-user-id"
DOCUSIGN_ACCOUNT_ID="your-account-id"
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
```

### Fireflies Integration (V2)

For automatic interview transcript retrieval:

```env
FIREFLIES_API_KEY="your-fireflies-api-key"
```

### Email Configuration

For sending emails (offer notifications, onboarding invites):

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@company.com"
SMTP_PASSWORD="app-specific-password"
EMAIL_FROM="HR <hr@company.com>"
```

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── (authenticated)/    # Protected routes
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── offers/
│   │   ├── onboarding/
│   │   ├── offboarding/
│   │   ├── recruiting/     # V2: Recruiter Agent
│   │   └── integrations/
│   ├── api/
│   │   ├── auth/          # NextAuth endpoints
│   │   └── trpc/          # tRPC endpoints
│   └── auth/              # Auth pages
├── components/
│   ├── layout/            # Sidebar, header
│   ├── recruiting/        # V2: Recruiting components
│   ├── providers.tsx      # React Query, tRPC, Session
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── prisma.ts          # Prisma client
│   ├── trpc.ts            # tRPC setup
│   ├── audit.ts           # Audit logging
│   ├── email.ts           # Email sending
│   ├── encryption.ts      # Data encryption
│   ├── utils.ts           # Utility functions
│   └── integrations/      # Integration connectors
│       ├── google-workspace.ts
│       ├── slack.ts
│       ├── docusign.ts
│       └── fireflies.ts   # V2: Fireflies integration
├── server/
│   └── routers/           # tRPC routers
│       ├── employee.ts
│       ├── offer.ts
│       ├── onboarding.ts
│       ├── offboarding.ts
│       ├── recruiting.ts  # V2: Recruiting router
│       └── ...
└── types/                 # TypeScript types
```

## User Roles

| Role | Permissions |
|------|-------------|
| SUPER_ADMIN | Full access to all features |
| HR_ADMIN | Manage employees, offers, onboarding/offboarding, recruiting |
| IT_ADMIN | Manage integrations, view technical logs |
| MANAGER | View direct reports, onboarding status |
| EMPLOYEE | View own profile, complete onboarding tasks |

## Main Workflows

### Recruiting Flow (V2)

1. HR creates job position with JD and rubric
2. Candidates apply (or imported from ATS)
3. AI screens applications and generates initial scores
4. HR advances qualified candidates to interview stages
5. Interviewers conduct interviews, upload transcripts
6. AI analyzes transcripts and generates insights
7. HR makes hire decision with AI recommendation
8. Hired → Creates Employee + Draft Offer

### Offer → Hire Flow (V1)

1. HR creates offer from template (or auto-generated from hire decision)
2. HR sends offer for e-signature
3. Candidate views and signs offer
4. Webhook updates offer status to SIGNED
5. Employee status changes to OFFER_SIGNED

### Onboarding Flow (V1)

1. HR starts onboarding for employee
2. System creates onboarding workflow with tasks
3. Automated tasks run (Google Workspace, Slack provisioning)
4. Manual tasks completed by HR/IT
5. Employee receives onboarding email with self-service link
6. Employee completes profile information
7. All tasks complete → Employee status changes to ACTIVE

### Offboarding Flow (V1)

1. HR initiates offboarding (immediate or scheduled)
2. System creates offboarding workflow
3. Manual tasks: collect equipment, revoke access, exit interview
4. Automated tasks: deprovision Google, Slack accounts
5. All tasks complete → Employee status changes to EXITED

## Scripts

```bash
# Development
npm run dev           # Start dev server
npm run build         # Build for production
npm run start         # Start production server

# Database
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run migrations
npm run db:push       # Push schema changes
npm run db:studio     # Open Prisma Studio
npm run db:seed       # Seed database

# Worker (for background jobs)
npm run worker        # Start job worker
```

## API Endpoints

All API endpoints are type-safe via tRPC. See `src/server/routers/` for available procedures.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed implementation plan.

## License

Proprietary - Internal use only.
