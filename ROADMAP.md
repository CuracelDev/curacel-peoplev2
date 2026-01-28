# Curacel People - Development Roadmap

## Overview

This document outlines the implementation plan for Curacel People V2 (Recruiter Agent), building on top of the existing V1 (Onboarding & Employee Management) platform.

**Core Concept: Data → Process → Decision**
- **Data**: Internal judging criteria + candidate information + hiring process artifacts
- **Process**: Stage-based pipeline where each new artifact updates the candidate's "state"
- **Decision**: Clear, explainable scoring and recommendations (hire/don't hire/proceed), plus "must validate" items and next-stage interview questions

---

## V1 - Onboarding & Employee Management (Complete)

### Features Delivered
- [x] NextAuth.js authentication with Google OAuth [done]
- [x] Role-based access control (SUPER_ADMIN, HR_ADMIN, IT_ADMIN, MANAGER, EMPLOYEE) [done]
- [x] Employee directory with lifecycle tracking [done]
- [x] Offer letter management with DocuSign integration [done]
- [x] Onboarding workflows with automated tasks [done]
- [x] Offboarding workflows with account deprovisioning [done]
- [x] Google Workspace integration (provisioning/deprovisioning) [done]
- [x] Slack integration (user management) [done]
- [x] Audit logging for all actions [done]
- [x] Blue AI Assistant for HR queries [done]
- [x] Uploadthing for file uploads [done]
- [x] Email notifications [done]

---

## Current Hiring Process (From Spreadsheet Analysis)

Based on the Executive Ops hiring sheet, the current process tracks:

### Columns/Fields Tracked
| Field | Description |
|-------|-------------|
| S/N | Sequential number |
| Applicant | Candidate name |
| Quarter | Q4 2025, etc. |
| Source | Referral source (e.g., Malcolm) |
| Email | Contact email |
| Status | Current stage (Case Study, Panel, etc.) |
| MBTI | Personality type (INTJ, ENTJ, etc.) |
| Salary Expectation | Expected compensation |
| Link to Profile | YC/LinkedIn URL |
| Big OCEAN | Big Five personality assessment |
| Assessment | Technical assessment date |
| 1st Contact | Initial contact date |
| 1st Stage | HR Screen date |
| 2nd Stage (Testify) | Personality test date |
| 3rd Stage Panel | Panel interview date |
| Case Study | Case study assignment |
| Trial | Trial period |
| CEO Interview | Final interview |
| Offer | Offer status |
| Total no of days | Days in pipeline |

### Current Pain Points (from PRD)
1. Downloads CVs, copies LinkedIn, pastes forms and test results into ChatGPT
2. Asks ChatGPT to summarize candidate strengths/weaknesses and draft interview questions
3. After interviews, repeats the process with transcripts to update evaluation
4. Data scattered across YC Apply, Google Forms, Fireflies, spreadsheets, assessment tools

---

## V2 - Recruiter Agent (Planned)

### Key Design Principles

1. **Stage Snapshots are Immutable** - Each stage generates a versioned snapshot; don't overwrite earlier evaluations
2. **Evidence-First Outputs** - Every score or claim should cite which artifact supports it
3. **1-100 Scoring System** - Consistent scoring at application, per-stage, and overall levels
4. **Full-Page Views** - No modals for complex data; table-based applicant list with collapsible navigation
5. **Selective RAG Retrieval** - Don't hold infinite memory; retrieve only relevant context when generating outputs

### Candidate Profile Tabs (from PRD)

| Tab | Content |
|-----|---------|
| Interest/Application | Resume summary, skills, application score, initial "must validate" items |
| Interview Stages | Per-stage: transcript, rubric scores, AI analysis, strengths/weaknesses, next questions |
| Curacel Fit | Values alignment, competency alignment, evidence snippets |
| Decision | Score timeline, final recommendation, human decision capture |

---

### Phase 1: Foundation (Sprint 1-2) [done]

**Goal:** Database schema and basic infrastructure for recruiting module

#### 1.1 Database Schema [done]
- [x] Add recruiting enums to Prisma schema [done]
  - `JobStatus`: DRAFT, ACTIVE, PAUSED, HIRED (implemented as JobStatus)
  - `JobCandidateStage`: APPLIED, SCREENING, INTERVIEWING, etc. (implemented)
  - `AssessmentType`: TECHNICAL_TEST, PERSONALITY, SKILLS, CASE_STUDY, etc. (implemented)
- [x] Create `RecruitingSettings` model (Company Rulebook - applies to ALL roles) [done]
  - Branding, webhook settings, custom channels
- [x] Create `Job` model (was JobPosition) [done]
  - Title, department, description, salary info, equity info
  - Job description reference, hiring flow snapshot
  - Status, priority, deadline
- [x] Create `HiringFlow` + `HiringFlowSnapshot` models (configurable stages) [done]
  - Flow name, stages array
  - Immutable snapshots for versioning
- [x] Create `JobCandidate` model (was Applicant) [done]
  - Personal info, professional info, resume data
  - Pipeline stage, scores, AI analysis
  - Source tracking
- [x] Create `CandidateInterview` model [done]
  - Stage, interviewers, scheduling
  - Scores, feedback, evaluations
- [x] Create `CandidateAssessment` model [done]
  - Assessment type, platform, scores
  - Results, recommendations
- [x] Create `InterviewQuestion` model [done]
  - Categories, tags, follow-ups
  - Usage tracking
- [x] Create `CandidateAIAnalysis` model (versioned snapshots) [done]
  - Analysis type, trigger context
  - Strengths, concerns, recommendations, scores
- [x] Run migration [done]
- [ ] Add audit actions for recruiting [not done]

#### 1.2 tRPC Router Setup [done]
- [x] Create recruiting routers (job.ts, recruiter.ts, interview.ts, etc.) [done]
- [x] Add recruiting routers to `_app.ts` [done]
- [x] Implement settings procedures [done]
  - `recruiting-settings` router with get/update
- [x] Implement job procedures (CRUD) [done]
  - `job.list`, `job.get`, `job.create`, `job.update`, `job.delete`
- [x] Implement candidate procedures (CRUD) [done]
  - List, create, update candidates via job router

#### 1.3 Navigation & Layout [done]
- [x] Add "Recruiting" to sidebar navigation (collapsible as "HIRING") [done]
- [x] Create recruiting layout wrapper [done]
- [x] Add role guards (SUPER_ADMIN, HR_ADMIN, MANAGER) [done]

#### 1.4 Basic Pages [done]
- [x] `/recruiting` - Dashboard [done]
- [x] `/recruiting/positions` - Jobs list page [done]
- [x] `/recruiting/positions/new` - Create job form [done]
  - Flow type selection, JD configuration
- [x] `/recruiting/positions/[id]/candidates` - Job detail with candidate table [done]
- [x] `/recruiting/positions/[id]/edit` - Edit job page [done]
- [x] `/recruiting/settings` - Recruiting settings page [done]

#### 1.5 Applicant Ingestion API [partially done]
- [x] External recruiter portal with candidate submission [done]
  - `submitCandidate` public procedure
  - `/recruiter/[token]` portal page
- [x] Manual candidate creation form [done]
- [ ] Dedicated webhook/API endpoint for n8n/YC automation [not done]

---

### Phase 2: Pipeline Management (Sprint 3-4) [done]

**Goal:** Full applicant pipeline with stage progression and YC-style scoring

#### 2.1 Interview Stages [done]
- [x] Implement `HiringFlow` with stage management [done]
- [x] `hiringFlow` router with CRUD [done]
- [x] Pre-configured default stages (Standard, Engineering, Sales, Executive) [done]
- [x] Immutable snapshots when flow is used by a job [done]

#### 2.2 Applicant List (YC-Style) [done]
- [x] Create candidate table with score column (0-100) [done]
- [x] Name, email, LinkedIn, current stage badge [done]
- [x] Sort by score, filter by stage [done]
- [x] Bulk actions (advance, reject) [done]
- [x] Click row to view full profile [done]

#### 2.3 Applicant Profile (Full Page with Tabs) [done]
- [x] Create `/recruiting/candidates/[id]` page [done]
- [x] Profile header with score, stage, key info [done]
- [x] Tabbed interface with: [done]
  - Overview tab (resume summary, skills, experience)
  - Interview stages tab (per-stage scores, notes)
  - AI Analysis tab (BlueAI insights)
  - Email tab (candidate communications)
- [x] Resume viewer [done]
- [x] LinkedIn URL display [done]

#### 2.4 Stage Advancement [done]
- [x] Stage progression via candidate update [done]
- [x] Stage history preserved [done]
- [x] Score tracking across stages [done]

#### 2.5 Rejection Flow [partially done]
- [x] Reject candidate action [done]
- [x] Rejection reason tracking [done]
- [ ] Configurable rejection email template [not done]
- [ ] Analytics on rejection reasons [not done]

---

### Phase 3: Interview Management (Sprint 5-6) [done]

**Goal:** Schedule, conduct, and document interviews with transcript ingestion

#### 3.1 Interview Scheduling [done]
- [x] Implement interviews procedures [done]
  - `interview.schedule`, `interview.reschedule`, `interview.cancel`
- [x] Interview scheduling dialog component [done]
- [x] Interviewer assignment with tokens [done]
- [x] Email notifications for interviews [done]

#### 3.2 Transcript Ingestion [done]
- [x] Manual transcript upload [done]
- [x] Fireflies "Attach Meeting" dialog [done]
  - Search by title/participant
  - Pull transcript, summary, video link
- [x] Store transcript in interview record [done]

#### 3.3 Manual Scoring (Rubric-Based) [done]
- [x] Interview evaluation forms [done]
- [x] Rubric-based scoring via `InterviewEvaluation` model [done]
- [x] Interviewer notes field [done]
- [x] Per-criteria scores via `InterviewCriteriaScore` [done]

#### 3.4 Interview Views [done]
- [x] Create `/recruiting/interviews` page [done]
- [x] List view with filters (date, status, interviewer) [done]
- [x] Interview detail via `/recruiting/candidates/[id]/interviews/[interviewId]` [done]

---

### Phase 4: AI Integration (Sprint 7-8) [partially done]

**Goal:** AI-powered screening, analysis, and question generation (replaces manual ChatGPT workflow)

#### 4.1 AI Context Setup [partially done]
- [x] AI settings configuration (provider, model, API key) [done]
- [x] Basic prompt templates [done]
- [ ] Full RAG retrieval with embeddings [not done]
- [ ] Selective context retrieval [not done]

#### 4.2 Resume/Application Screening [done]
- [x] Create `src/lib/ai/recruiting/analysis.ts` [done]
- [x] Implement screening with PRESS values alignment [done]
- [x] Output: score, rationale, strengths, concerns, recommendations [done]
- [x] Store in `CandidateAIAnalysis` model [done]
- [x] BlueAI analysis tab component [done]

#### 4.3 Transcript Analysis [done]
- [x] Transcript analysis via BlueAI [done]
- [x] Generate insights from interview transcripts [done]
- [x] Must-validate points generation [done]
- [x] Next-stage question suggestions [done]

#### 4.4 Question Generation [done]
- [x] Create `question` router with generation [done]
- [x] `generateAIQuestions` procedure [done]
- [x] Categories: situational, behavioral, technical, motivational, culture [done]
- [x] Create `/recruiting/questions` page (question bank) [done]
- [x] Question usage tracking [done]

#### 4.5 Blue AI Extension [not done]
- [ ] Add recruiting-specific tools to Blue AI assistant [not done]
  - `list_open_positions`
  - `get_applicant_summary`
  - `screen_applicant`
  - `analyze_interview`
  - `generate_questions`

---

### Phase 5: Decision Module & Hire (Sprint 9-10) [partially done]

**Goal:** Final decision UI with evidence and applicant → employee transition

#### 5.1 Decision Interface [not done]
- [ ] Create `decision-module.tsx` component [not done]
- [ ] Score breakdown visualization [not done]
- [ ] Score timeline chart [not done]
- [ ] AI recommendation with confidence [not done]
- [ ] Supporting evidence display [not done]
- [ ] Risk factors and mitigations [not done]

#### 5.2 Hire Flow [partially done]
- [x] Candidate stage set to HIRED [done]
- [x] Job status tracking (hired count) [done]
- [ ] Auto-create Employee from candidate [not done]
- [ ] Link candidate to employee record [not done]
- [ ] Auto-create Offer in DRAFT status [not done]
- [ ] Redirect to offer editing flow [not done]

#### 5.3 Assessment Tracking [done]
- [x] Implement assessments procedures [done]
  - `assessment` router with CRUD
- [x] `CandidateAssessment` model with templates [done]
- [x] Assessment upload form [done]
- [x] Support multiple platforms (Testify, TestGorilla, Kand.io, etc.) [done]
- [x] Display in candidate profile [done]
- [x] `/recruiting/assessments` page [done]

#### 5.4 Candidate Comparison [not done]
- [ ] Side-by-side comparison view [not done]
- [ ] Ranking by overall score [not done]
- [ ] Key differentiators highlighting [not done]

---

### Phase 6: Settings & Analytics (Sprint 11-12) [partially done]

**Goal:** Configuration and insights

#### 6.1 Recruiting Settings Page (Company Rulebook) [partially done]
- [x] Competency framework configuration [done]
- [x] Interview types management [done]
- [x] Interview stage templates [done]
- [x] Assessment templates [done]
- [ ] Company values editor (PRESS framework) [not done]
- [ ] Personality templates (OCEAN/MBTI ideal profiles) [not done]
- [ ] Scoring weight configuration [not done]

#### 6.2 Analytics Dashboard [not done]
- [ ] Create `/recruiting/analytics` page [not done]
- [ ] Pipeline metrics [not done]
  - Applications per position
  - Time-to-hire by stage
  - Conversion rates
  - Source effectiveness
- [ ] AI accuracy tracking [not done]
- [ ] Interviewer calibration [not done]
- [ ] Export reports [not done]

#### 6.3 Audit Logging [not done]
- [ ] Add recruiting audit actions [not done]
  - JOB_CREATED, JOB_UPDATED, JOB_STATUS_CHANGED
  - CANDIDATE_CREATED, CANDIDATE_STAGE_ADVANCED, CANDIDATE_REJECTED, CANDIDATE_HIRED
  - INTERVIEW_SCHEDULED, INTERVIEW_COMPLETED
  - AI_SCREENING_RUN, AI_INTERVIEW_ANALYSIS
- [ ] Display in audit log UI [not done]

#### 6.4 Email Notifications [partially done]
- [x] Interview scheduled notification [done]
- [x] Email to candidates via Gmail integration [done]
- [x] Email tracking and analytics [done]
- [x] Email templates [done]
- [ ] Application received confirmation [not done]
- [ ] Rejection email automation [not done]

---

### Phase 7: Integrations (Future) [partially done]

**Goal:** External system connections

#### 7.1 Fireflies Integration [done]
- [x] Create `src/lib/integrations/fireflies.ts` [done]
- [x] Meeting search API [done]
- [x] Attach meeting dialog with search [done]
- [x] Pull transcript, summary, video link [done]
- [x] Store in interview record [done]

#### 7.2 Google Forms Integration [not done]
- [ ] Import interest form responses automatically [not done]
- [ ] Map form fields to candidate data [not done]
- [ ] Trigger AI screening on form submission [not done]

#### 7.3 YC Apply Integration (Custom Scraper) [not done]
- [ ] Build n8n workflow to scrape YC applicant data [not done]
- [ ] Push to applicant ingestion API [not done]
- [ ] Map YC fields to candidate model [not done]

#### 7.4 Assessment Platform APIs [not done]
- [ ] Testify webhooks [not done]
- [ ] Kand.io API integration [not done]
- [ ] Auto-fetch results when tests complete [not done]

#### 7.5 n8n Email Automation [not done]
- [ ] Stage advancement triggers email via n8n [not done]
- [ ] Assessment invitation emails [not done]
- [ ] Interview scheduling confirmations [not done]

---

## Implementation Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | [done] | 95% |
| Phase 2: Pipeline Management | [done] | 90% |
| Phase 3: Interview Management | [done] | 100% |
| Phase 4: AI Integration | [partially done] | 75% |
| Phase 5: Decision Module & Hire | [partially done] | 40% |
| Phase 6: Settings & Analytics | [partially done] | 35% |
| Phase 7: Integrations | [partially done] | 20% |

### Key Gaps to Address
1. **Decision Module** - Score breakdown visualization, timeline chart, AI recommendation display
2. **Hire Flow Integration** - Auto-create Employee + Offer from hired candidate
3. **Analytics Dashboard** - Pipeline metrics, source tracking, AI accuracy
4. **Audit Logging** - Recruiting-specific audit actions
5. **Blue AI Tools** - Recruiting-specific assistant capabilities
6. **External Integrations** - Google Forms, YC Apply, Assessment webhooks

---

## File Structure (V2 Additions)

```
src/
├── app/(authenticated)/recruiting/
│   ├── page.tsx                    # Dashboard [done]
│   ├── positions/
│   │   ├── page.tsx               # List positions [done]
│   │   ├── new/page.tsx           # Create position [done]
│   │   └── [id]/
│   │       ├── candidates/page.tsx # Position candidates [done]
│   │       └── edit/page.tsx      # Edit position [done]
│   ├── candidates/
│   │   ├── page.tsx               # All candidates [done]
│   │   └── [id]/
│   │       ├── page.tsx           # Candidate profile [done]
│   │       ├── stages/[stageId]/page.tsx # Stage detail [done]
│   │       └── interviews/[interviewId]/page.tsx # Interview detail [done]
│   ├── interviews/page.tsx         # Interview list [done]
│   ├── questions/page.tsx          # Question bank [done]
│   ├── assessments/page.tsx        # Assessments [done]
│   ├── analytics/page.tsx          # Analytics [not done]
│   └── settings/
│       ├── page.tsx               # Settings [done]
│       └── assessments/page.tsx   # Assessment settings [done]
├── app/(public)/
│   ├── careers/[id]/page.tsx      # Public job page [done]
│   └── recruiter/[token]/page.tsx # External recruiter portal [done]
├── components/recruiting/
│   ├── schedule-interview-dialog.tsx [done]
│   ├── reschedule-dialog.tsx      [done]
│   ├── add-interviewer-dialog.tsx [done]
│   ├── attach-fireflies-dialog.tsx [done]
│   ├── email-tab.tsx              [done]
│   ├── email-composer.tsx         [done]
│   └── blueai-analysis-tab.tsx    [done]
├── lib/
│   ├── ai/recruiting/
│   │   └── analysis.ts            # BlueAI analysis [done]
│   └── integrations/
│       ├── fireflies.ts           # Fireflies API [done]
│       └── gmail.ts               # Gmail integration [done]
└── server/routers/
    ├── job.ts                     [done]
    ├── recruiter.ts               [done]
    ├── interview.ts               [done]
    ├── interview-stage.ts         [done]
    ├── interview-type.ts          [done]
    ├── assessment.ts              [done]
    ├── question.ts                [done]
    ├── hiringFlow.ts              [done]
    ├── recruiting-settings.ts     [done]
    ├── candidate-email.ts         [done]
    ├── blueai-analysis.ts         [done]
    └── interest-form.ts           [done]
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first AI score | < 2 minutes | From resume upload to score display |
| Screening accuracy | > 80% alignment | Compare AI recommendation to final hire decision |
| Question relevance | > 4/5 rating | Interviewer feedback |
| User adoption | 100% HR team | Weekly active users |
| Time-to-hire reduction | 50% decrease | Application to decision (vs spreadsheet tracking) |
| Data completion | > 90% | Fields filled per applicant |
| Stage snapshot preservation | 100% | No data loss across stages |

---

## Dependencies

- Anthropic Claude API for AI features [done]
- Uploadthing for file uploads (existing) [done]
- NextAuth for authentication (existing) [done]
- Prisma + PostgreSQL for data (existing) [done]
- tRPC for API (existing) [done]
- shadcn/ui for components (existing) [done]
- Fireflies API for transcript retrieval [done]
- Gmail API for candidate emails [done]
- n8n for email automation (optional) [not done]

---

## Notes

- **MVP Focus**: Replicate and automate what the team currently does manually with ChatGPT
- Each phase builds on the previous; deploy incrementally
- AI features (Phase 4) can be tested in isolation with mock data
- Hire flow (Phase 5) is the critical integration point with V1
- Analytics (Phase 6) requires data from earlier phases
- Integrations (Phase 7) are optional enhancements
- Stage snapshots are **append-only** - never overwrite earlier evaluations
