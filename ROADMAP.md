# Curacel People - Development Roadmap

## Overview

This document outlines the implementation plan for Curacel People V2 (Recruiter Agent), building on top of the existing V1 (Onboarding & Employee Management) platform.

---

## V1 - Onboarding & Employee Management (Complete)

### Features Delivered
- [x] NextAuth.js authentication with Google OAuth
- [x] Role-based access control (SUPER_ADMIN, HR_ADMIN, IT_ADMIN, MANAGER, EMPLOYEE)
- [x] Employee directory with lifecycle tracking
- [x] Offer letter management with DocuSign integration
- [x] Onboarding workflows with automated tasks
- [x] Offboarding workflows with account deprovisioning
- [x] Google Workspace integration (provisioning/deprovisioning)
- [x] Slack integration (user management)
- [x] Audit logging for all actions
- [x] Blue AI Assistant for HR queries
- [x] Uploadthing for file uploads
- [x] Email notifications

---

## V2 - Recruiter Agent (Planned)

### Phase 1: Foundation (Sprint 1-2)

**Goal:** Database schema and basic infrastructure for recruiting module

#### 1.1 Database Schema
- [ ] Add recruiting enums to Prisma schema
  - `JobPositionStatus`: DRAFT, OPEN, PAUSED, CLOSED, FILLED
  - `FlowType`: STANDARD, ENGINEERING, SALES, EXECUTIVE, CUSTOM
  - `ApplicantStatus`: NEW, SCREENING, INTERVIEWING, ASSESSMENT, OFFER_STAGE, HIRED, REJECTED, WITHDRAWN
  - `StageStatus`: PENDING, IN_PROGRESS, COMPLETED, SKIPPED
  - `AssessmentType`: TECHNICAL_TEST, PERSONALITY, SKILLS, CASE_STUDY, REFERENCE_CHECK
- [ ] Create `RecruitingSettings` model
  - Company values (PRESS framework)
  - Competency framework JSON
  - Personality templates
  - Default scoring weights
- [ ] Create `JobPosition` model
  - Title, department, description
  - Job description file/text
  - Hiring rubric
  - Scorecard template
  - Role objectives (6-12 month)
  - Flow type
  - Status
- [ ] Create `InterviewStage` model
  - Position reference
  - Stage name, order
  - Interview type
  - Duration, interviewer count
- [ ] Create `Applicant` model
  - Personal info (name, email, phone, LinkedIn)
  - Resume/CV file URL
  - Current stage
  - Overall score
  - Status
  - Employee reference (for hired candidates)
- [ ] Create `ApplicantStage` model
  - Applicant and stage references
  - Score, notes, status
  - AI analysis JSON
  - Interviewer notes
- [ ] Create `Interview` model
  - Applicant, stage references
  - Scheduled date/time
  - Interviewer assignments
  - Transcript text/file
  - Recording URL
  - AI analysis
- [ ] Create `ApplicantAssessment` model
  - Applicant reference
  - Assessment type
  - Platform (Kand.io, TestGorilla, etc.)
  - Score, results JSON
  - File URL
- [ ] Create `InterviewQuestion` model
  - Position/applicant/stage references
  - Category (behavioral, technical, etc.)
  - Questions JSON array
- [ ] Add audit actions for recruiting
- [ ] Run migration

#### 1.2 tRPC Router Setup
- [ ] Create `src/server/routers/recruiting.ts`
- [ ] Add recruiting router to `_app.ts`
- [ ] Implement settings procedures
  - `settings.get` - Get recruiting settings
  - `settings.update` - Update settings
- [ ] Implement positions procedures (basic CRUD)
  - `positions.list` - List all positions with filters
  - `positions.get` - Get single position with stages
  - `positions.create` - Create new position
  - `positions.update` - Update position
  - `positions.delete` - Delete position (soft)
  - `positions.updateStatus` - Change position status
- [ ] Implement applicants procedures (basic CRUD)
  - `applicants.list` - List applicants with filters
  - `applicants.get` - Get single applicant with all data
  - `applicants.create` - Create new applicant
  - `applicants.update` - Update applicant
  - `applicants.delete` - Delete applicant (soft)

#### 1.3 Navigation & Layout
- [ ] Add "Recruiting" to sidebar navigation
- [ ] Create recruiting layout wrapper
- [ ] Add role guards (SUPER_ADMIN, HR_ADMIN)

#### 1.4 Basic Pages
- [ ] `/recruiting` - Dashboard placeholder
- [ ] `/recruiting/positions` - Positions list page
- [ ] `/recruiting/positions/new` - Create position form
- [ ] `/recruiting/positions/[id]` - Position detail page
- [ ] `/recruiting/positions/[id]/edit` - Edit position page
- [ ] `/recruiting/settings` - Recruiting settings page

---

### Phase 2: Pipeline Management (Sprint 3-4)

**Goal:** Full applicant pipeline with stage progression

#### 2.1 Interview Stages
- [ ] Implement stages procedures
  - `stages.create` - Add stage to position
  - `stages.update` - Update stage details
  - `stages.reorder` - Reorder stages
  - `stages.delete` - Remove stage
- [ ] Create stage management UI in position detail

#### 2.2 Pipeline Board
- [ ] Create `pipeline-board.tsx` component (Kanban-style)
- [ ] Create `applicant-card.tsx` component
- [ ] Implement drag-and-drop stage advancement
- [ ] Add filtering (by stage, score, date)
- [ ] Add sorting options

#### 2.3 Applicant Profile
- [ ] Create `/recruiting/applicants/[id]` page
- [ ] Build tabbed interface:
  - Overview tab - Summary, AI scores, recommendation
  - Application tab - Resume viewer, cover letter, LinkedIn
  - Interviews tab - Stage progress, transcripts, scores
  - Assessments tab - External test results
  - Decision tab - Hire/no-hire with evidence
- [ ] Create `applicant-profile.tsx` component
- [ ] Add resume PDF viewer component
- [ ] Add LinkedIn profile display

#### 2.4 Stage Advancement
- [ ] Implement `applicants.advanceStage` procedure
- [ ] Add stage transition validation
- [ ] Create stage advancement modal
- [ ] Add notes/feedback collection on advancement

#### 2.5 Rejection Flow
- [ ] Implement `applicants.reject` procedure
- [ ] Create rejection modal with reason selection
- [ ] Add rejection email template
- [ ] Track rejection reasons for analytics

---

### Phase 3: Interview Management (Sprint 5-6)

**Goal:** Schedule, conduct, and document interviews

#### 3.1 Interview Scheduling
- [ ] Implement interviews procedures
  - `interviews.schedule` - Schedule interview
  - `interviews.reschedule` - Change time
  - `interviews.cancel` - Cancel interview
  - `interviews.complete` - Mark complete
- [ ] Create interview scheduling form
- [ ] Add interviewer assignment
- [ ] Calendar integration (optional: Google Calendar)

#### 3.2 Transcript Upload
- [ ] Add transcript file route to Uploadthing
- [ ] Create `transcript-upload.tsx` component
- [ ] Support PDF and text formats
- [ ] Parse and store transcript text

#### 3.3 Manual Scoring
- [ ] Create `score-card-form.tsx` component
- [ ] Implement rubric-based scoring UI
- [ ] Add interviewer notes field
- [ ] Save scores to `ApplicantStage`

#### 3.4 Interview Views
- [ ] Create `/recruiting/interviews` page
- [ ] List view with filters (date, position, status)
- [ ] Calendar view (optional)
- [ ] Interview detail modal

---

### Phase 4: AI Integration (Sprint 7-8)

**Goal:** AI-powered screening, analysis, and question generation

#### 4.1 Resume Screening
- [ ] Create `src/lib/ai/recruiting/screening.ts`
- [ ] Implement screening prompt template
- [ ] Add `applicants.runAiScreening` procedure
- [ ] Create `ai-screening-panel.tsx` component
- [ ] Display: score, strengths, concerns, summary
- [ ] Store screening results in applicant record

#### 4.2 Transcript Analysis
- [ ] Create `src/lib/ai/recruiting/transcript.ts`
- [ ] Implement analysis prompt template
- [ ] Add `interviews.analyzeTranscript` procedure
- [ ] Create `transcript-analyzer.tsx` component
- [ ] Display: summary, insights, red flags, strengths
- [ ] Generate follow-up questions for next stage

#### 4.3 Question Generation
- [ ] Create `src/lib/ai/recruiting/questions.ts`
- [ ] Implement generation prompt by category:
  - Behavioral
  - Technical
  - Situational
  - Cultural fit
  - Motivational
- [ ] Add `questions.generate` procedure
- [ ] Create `question-generator.tsx` component
- [ ] Add question bank storage
- [ ] Create `/recruiting/questions` page

#### 4.4 Blue AI Extension
- [ ] Add recruiting tools to Blue AI assistant
  - `list_open_positions` - Show open roles
  - `get_applicant_summary` - Applicant overview
  - `screen_applicant` - Run AI screening
  - `analyze_interview` - Analyze transcript
  - `generate_questions` - Create questions
- [ ] Update assistant router with new tools

---

### Phase 5: Decision Module & Hire (Sprint 9-10)

**Goal:** Final decision UI and applicant → employee transition

#### 5.1 Decision Interface
- [ ] Create `decision-module.tsx` component
- [ ] Aggregate scores from all stages
- [ ] Display strengths/weaknesses summary
- [ ] Show AI recommendation with confidence
- [ ] Add comparison to ideal profile
- [ ] Evidence panel with key moments

#### 5.2 Hire Flow
- [ ] Implement `applicants.hire` procedure:
  1. Create Employee record from Applicant data
  2. Link applicant to employee
  3. Create Offer in DRAFT status
  4. Set applicant status to HIRED
  5. Trigger audit log
- [ ] Create hire confirmation modal
- [ ] Auto-populate offer form with applicant data
- [ ] Redirect to offer editing flow

#### 5.3 Assessment Tracking
- [ ] Implement assessments procedures
  - `assessments.create` - Add assessment result
  - `assessments.update` - Update score/results
  - `assessments.delete` - Remove assessment
- [ ] Create assessment upload form
- [ ] Support multiple platforms:
  - Kand.io (technical)
  - TestGorilla (skills)
  - Manual entry
- [ ] Display in applicant profile

#### 5.4 Candidate Comparison
- [ ] Add comparison view for position
- [ ] Side-by-side candidate metrics
- [ ] Ranking by overall score
- [ ] Export comparison to PDF

---

### Phase 6: Settings & Analytics (Sprint 11-12)

**Goal:** Configuration and insights

#### 6.1 Recruiting Settings Page
- [ ] Company values editor (PRESS framework)
- [ ] Competency framework configuration
- [ ] Personality template management
- [ ] Default interview stages by flow type
- [ ] Scoring weight configuration
- [ ] Email template customization

#### 6.2 Analytics Dashboard
- [ ] Create `/recruiting/analytics` page
- [ ] Pipeline metrics:
  - Applications per position
  - Time-to-hire by stage
  - Conversion rates
  - Source effectiveness
- [ ] AI accuracy tracking (hire outcomes)
- [ ] Interviewer activity
- [ ] Export reports

#### 6.3 Audit Logging
- [ ] Add recruiting audit actions:
  - JOB_POSITION_CREATED
  - JOB_POSITION_UPDATED
  - JOB_POSITION_STATUS_CHANGED
  - APPLICANT_CREATED
  - APPLICANT_STAGE_ADVANCED
  - APPLICANT_REJECTED
  - APPLICANT_HIRED
  - INTERVIEW_SCHEDULED
  - INTERVIEW_COMPLETED
  - AI_SCREENING_RUN
  - AI_INTERVIEW_ANALYSIS
- [ ] Display in audit log UI

#### 6.4 Email Notifications
- [ ] Application received confirmation
- [ ] Interview scheduled notification
- [ ] Stage advancement notification (internal)
- [ ] Rejection email (configurable)
- [ ] Offer pending notification

---

### Phase 7: Integrations (Future)

**Goal:** External system connections

#### 7.1 Fireflies Integration
- [ ] Create `src/lib/integrations/fireflies.ts`
- [ ] Implement transcript search/retrieval
- [ ] Add Fireflies settings to env
- [ ] Auto-attach meeting transcripts

#### 7.2 LinkedIn Integration
- [ ] Profile scraping (if API available)
- [ ] Import from LinkedIn URL
- [ ] Display LinkedIn data in profile

#### 7.3 Job Board Integration
- [ ] Post positions to external boards
- [ ] Import applications from boards
- [ ] Track source of candidates

---

## File Structure (V2 Additions)

```
src/
├── app/(authenticated)/recruiting/
│   ├── page.tsx                    # Dashboard
│   ├── layout.tsx                  # Recruiting layout
│   ├── positions/
│   │   ├── page.tsx               # List positions
│   │   ├── new/page.tsx           # Create position
│   │   └── [id]/
│   │       ├── page.tsx           # Position detail + pipeline
│   │       └── edit/page.tsx      # Edit position
│   ├── applicants/
│   │   ├── page.tsx               # All applicants
│   │   └── [id]/page.tsx          # Applicant profile
│   ├── interviews/page.tsx         # Interview calendar/list
│   ├── questions/page.tsx          # Question bank
│   ├── analytics/page.tsx          # Analytics dashboard
│   └── settings/page.tsx           # Recruiting settings
├── components/recruiting/
│   ├── pipeline-board.tsx          # Kanban view
│   ├── applicant-card.tsx          # Card for lists/board
│   ├── applicant-profile.tsx       # Full profile component
│   ├── score-card-form.tsx         # Scorecard input
│   ├── transcript-upload.tsx       # Upload component
│   ├── transcript-analyzer.tsx     # AI analysis display
│   ├── question-generator.tsx      # AI question UI
│   ├── ai-screening-panel.tsx      # Screening results
│   ├── decision-module.tsx         # Hire/no-hire UI
│   └── interview-scheduler.tsx     # Scheduling form
├── lib/
│   ├── ai/recruiting/
│   │   ├── screening.ts           # Resume screening AI
│   │   ├── transcript.ts          # Transcript analysis AI
│   │   └── questions.ts           # Question generation AI
│   └── integrations/
│       └── fireflies.ts           # Fireflies API client
└── server/routers/
    └── recruiting.ts              # All recruiting procedures
```

---

## Database Schema (V2 Additions)

```prisma
// Enums
enum JobPositionStatus {
  DRAFT
  OPEN
  PAUSED
  CLOSED
  FILLED
}

enum FlowType {
  STANDARD
  ENGINEERING
  SALES
  EXECUTIVE
  CUSTOM
}

enum ApplicantStatus {
  NEW
  SCREENING
  INTERVIEWING
  ASSESSMENT
  OFFER_STAGE
  HIRED
  REJECTED
  WITHDRAWN
}

enum StageStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

enum AssessmentType {
  TECHNICAL_TEST
  PERSONALITY
  SKILLS
  CASE_STUDY
  REFERENCE_CHECK
}

// Models
model RecruitingSettings {
  id                  String   @id @default(cuid())
  companyValues       Json     // PRESS framework
  competencyFramework Json
  personalityTemplates Json
  scoringWeights      Json
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model JobPosition {
  id              String            @id @default(cuid())
  title           String
  department      String
  description     String            @db.Text
  jobDescriptionUrl String?
  rubric          Json?
  scorecard       Json?
  objectives      String?           @db.Text
  flowType        FlowType          @default(STANDARD)
  status          JobPositionStatus @default(DRAFT)
  stages          InterviewStage[]
  applicants      Applicant[]
  questions       InterviewQuestion[]
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

model InterviewStage {
  id              String      @id @default(cuid())
  positionId      String
  position        JobPosition @relation(fields: [positionId], references: [id])
  name            String
  order           Int
  interviewType   String?     // phone, video, in-person, panel
  duration        Int?        // minutes
  interviewerCount Int        @default(1)
  applicantStages ApplicantStage[]
  interviews      Interview[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model Applicant {
  id              String          @id @default(cuid())
  positionId      String
  position        JobPosition     @relation(fields: [positionId], references: [id])
  name            String
  email           String
  phone           String?
  linkedinUrl     String?
  resumeUrl       String?
  coverLetterUrl  String?
  currentStage    String?
  overallScore    Float?
  aiScreeningData Json?
  status          ApplicantStatus @default(NEW)
  stages          ApplicantStage[]
  interviews      Interview[]
  assessments     ApplicantAssessment[]
  questions       InterviewQuestion[]
  employeeId      String?         @unique
  employee        Employee?       @relation(fields: [employeeId], references: [id])
  rejectionReason String?
  notes           String?         @db.Text
  source          String?         // where they came from
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model ApplicantStage {
  id              String         @id @default(cuid())
  applicantId     String
  applicant       Applicant      @relation(fields: [applicantId], references: [id])
  stageId         String
  stage           InterviewStage @relation(fields: [stageId], references: [id])
  score           Float?
  status          StageStatus    @default(PENDING)
  aiAnalysis      Json?
  interviewerNotes String?       @db.Text
  rubricScores    Json?
  completedAt     DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model Interview {
  id              String         @id @default(cuid())
  applicantId     String
  applicant       Applicant      @relation(fields: [applicantId], references: [id])
  stageId         String
  stage           InterviewStage @relation(fields: [stageId], references: [id])
  scheduledAt     DateTime
  duration        Int?           // actual duration in minutes
  interviewers    String[]       // user IDs
  transcriptText  String?        @db.Text
  transcriptUrl   String?
  recordingUrl    String?
  aiAnalysis      Json?
  status          String         @default("scheduled")
  notes           String?        @db.Text
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model ApplicantAssessment {
  id              String         @id @default(cuid())
  applicantId     String
  applicant       Applicant      @relation(fields: [applicantId], references: [id])
  type            AssessmentType
  platform        String         // Kand.io, TestGorilla, etc.
  score           Float?
  maxScore        Float?
  results         Json?
  fileUrl         String?
  completedAt     DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model InterviewQuestion {
  id              String       @id @default(cuid())
  positionId      String?
  position        JobPosition? @relation(fields: [positionId], references: [id])
  applicantId     String?
  applicant       Applicant?   @relation(fields: [applicantId], references: [id])
  stageNumber     Int?
  category        String       // behavioral, technical, situational, cultural, motivational
  questions       Json         // array of question objects
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first AI score | < 2 minutes | From resume upload to score display |
| Screening accuracy | > 80% alignment | Calibration against hiring outcomes |
| Question relevance | > 4/5 rating | Interviewer feedback |
| User adoption | 100% HR team | Weekly active users |
| Time-to-hire reduction | 50% decrease | Application to decision |
| Data completion | > 90% | Fields filled per applicant |

---

## Dependencies

- Anthropic Claude API for AI features
- Uploadthing for file uploads (existing)
- NextAuth for authentication (existing)
- Prisma + PostgreSQL for data (existing)
- tRPC for API (existing)
- shadcn/ui for components (existing)

---

## Notes

- Each phase builds on the previous; deploy incrementally
- AI features (Phase 4) can be tested in isolation with mock data
- Hire flow (Phase 5) is the critical integration point with V1
- Analytics (Phase 6) requires data from earlier phases
- Integrations (Phase 7) are optional enhancements
