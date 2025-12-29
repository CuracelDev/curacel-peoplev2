# Curacel People - Development Roadmap

## Overview

This document outlines the implementation plan for Curacel People V2 (Recruiter Agent), building on top of the existing V1 (Onboarding & Employee Management) platform.

**Core Concept: Data → Process → Decision**
- **Data**: Internal judging criteria + candidate information + hiring process artifacts
- **Process**: Stage-based pipeline where each new artifact updates the candidate's "state"
- **Decision**: Clear, explainable scoring and recommendations (hire/don't hire/proceed), plus "must validate" items and next-stage interview questions

---

## 🔵 AI-Native Architecture: BlueAI as Core OS

> **Vision**: BlueAI is not a feature—it's the primary operator. Users express intent, BlueAI executes, humans review and approve.

### The Fundamental Shift

| Aspect | Traditional SaaS | Agentic OS |
|--------|-----------------|------------|
| Primary Input | Clicks, forms | Natural language |
| User Role | Operator | Reviewer/Approver |
| AI Role | Feature you click | Core operator |
| Workflow | User-driven | AI-proposed |
| Context | Manual lookup | Auto-retrieved |
| Speed | User speed | Instant + review |

### Example: Creating a Job

**Old Way (15-30 min):**
Click New → Fill title → Select department → Write JD → Set salary → Configure stages → Save

**Agentic Way (2-3 min):**
```
You: "I need to hire a senior backend engineer for claims team"

BlueAI: Creating job posting...
├── Pulled engineering JD template
├── Checked recent claims team salaries: ₦15M-22M
├── Selected Engineering interview flow (5 stages)
└── Draft ready for review

[Shows draft] Does this look right?

You: "Bump salary to ₦18M-25M"

BlueAI: Updated. Ready to publish?

You: "Yes"

BlueAI: ✓ Job posted. Notified #recruiting on Slack.
```

### What's Possible TODAY (Q1 2025)

| Capability | Technology | Status |
|------------|------------|--------|
| Tool/Function Calling | Claude 3.5 Sonnet | ✅ Production-ready |
| Multi-step Workflows | LangGraph, Claude Tools | ✅ Stable |
| RAG Context Retrieval | Embeddings + pgvector | ✅ Production-ready |
| Streaming UI | Vercel AI SDK | ✅ Production-ready |
| Human-in-the-loop | Approval patterns | ✅ Established |
| Structured Output | Zod + JSON mode | ✅ Production-ready |

### What's Coming (6 Months - Mid 2025)

| Capability | Expected State | Impact |
|------------|---------------|--------|
| **Persistent Memory** | Native model memory, MCP servers | BlueAI remembers decisions, learns patterns |
| **Multi-Agent Orchestration** | LangGraph 2.0, Claude agents | Specialist agents coordinate |
| **Computer Use** | Claude Computer Use GA | Operate external tools without APIs |
| **MCP Standardization** | Model Context Protocol adoption | Plug-and-play tool integrations |
| **Voice-First** | Real-time speech | "Hey Blue, advance Sarah to panel" |
| **Proactive AI** | Pattern detection + alerts | BlueAI suggests actions before you ask |

### Agentic Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│  Command Bar (Cmd+K)  │  Chat Sidebar  │  Traditional UI        │
└──────────────┬────────┴───────┬────────┴──────────┬─────────────┘
               │                │                   │
               ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BLUEAI CORE                               │
│  Intent Parser → Planner → Executor → Memory → Tool Registry    │
└─────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CONTEXT LAYER                              │
│  Company Values │ JD Templates │ Salary Data │ Team Info        │
│  Past Decisions │ Hiring Rubrics │ Assessments │ Transcripts    │
└─────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       TOOL REGISTRY                             │
│  jobs.create    │ candidates.screen  │ interviews.schedule      │
│  jobs.update    │ candidates.advance │ interviews.analyze       │
│  context.salary │ context.team       │ slack.notify │ email.send│
└─────────────────────────────────────────────────────────────────┘
```

> **Full vision document**: See `docs/AGENTIC-VISION.md`

---

## Revised Implementation Phases (AI-Native First)

> **New Approach**: Build the agent infrastructure first, then add recruiting features as agent capabilities.

### Phase 0: BlueAI Agent Core (NEW - Sprint 1-2)

**Goal:** Build the foundational agent infrastructure that all features plug into

#### 0.1 Agent Service Architecture
- [ ] Create `src/lib/ai/agent/core.ts` - Main agent orchestrator
- [ ] Create `src/lib/ai/agent/tools.ts` - Tool registry system
- [ ] Create `src/lib/ai/agent/context.ts` - Context retrieval service
- [ ] Create `src/lib/ai/agent/memory.ts` - Conversation memory (DB-backed)
- [ ] Create `src/lib/ai/agent/planner.ts` - Intent → Tool chain planner
- [ ] Create `src/lib/ai/agent/executor.ts` - Tool execution with streaming

#### 0.2 Tool Registry Pattern
```typescript
// Every action becomes a callable tool
interface Tool {
  name: string;
  description: string;
  parameters: ZodSchema;
  execute: (params: z.infer<typeof parameters>) => Promise<ToolResult>;
  requiresApproval: boolean;
  category: 'read' | 'write' | 'external';
}
```
- [ ] Define base tool interface and registry
- [ ] Create tool execution wrapper with approval flow
- [ ] Add tool result formatting for agent consumption
- [ ] Implement tool parameter validation (Zod)

#### 0.3 Command Bar UI (Cmd+K)
- [ ] Create `src/components/agent/command-bar.tsx`
- [ ] Implement global keyboard shortcut (Cmd+K / Ctrl+K)
- [ ] Build natural language input with suggestions
- [ ] Add "thinking" state display (steps being executed)
- [ ] Create preview/draft component for actions
- [ ] Implement approve/reject/modify flow

#### 0.4 Chat Sidebar Enhancement
- [ ] Upgrade existing Blue AI sidebar to agentic mode
- [ ] Add context awareness (current page, selected items)
- [ ] Enable action execution from chat
- [ ] Add conversation history persistence
- [ ] Show agent capabilities contextually

#### 0.5 Approval Flow System
- [ ] Create `src/components/agent/approval-card.tsx`
- [ ] Implement pending action queue
- [ ] Add approve/reject/modify handlers
- [ ] Create audit log for agent actions
- [ ] Build rollback capability for failed actions

### Phase 1: Foundation + Agent Tools (Sprint 2-3)

**Goal:** Database schema + register all CRUD as agent tools

*[Previous Phase 1 tasks, but now tools are registered for each]*

#### 1.1 Database Schema
*[Same as before]*

#### 1.2 Agent Tool Registration for Recruiting
```typescript
// Register each endpoint as a BlueAI tool
tools.register({
  name: "jobs.create",
  description: "Create a new job posting with title, department, and requirements",
  parameters: jobCreateSchema,
  execute: async (params) => trpc.recruiting.positions.create(params),
  requiresApproval: true,
});

tools.register({
  name: "context.jd_templates",
  description: "Get job description templates by role type",
  parameters: z.object({ roleType: z.enum(["engineering", "sales", "ops"]) }),
  execute: async ({ roleType }) => db.templates.findByType(roleType),
  requiresApproval: false,
});

tools.register({
  name: "context.salary_benchmarks",
  description: "Get recent salary offers for a department",
  parameters: z.object({ department: z.string(), months: z.number().optional() }),
  execute: async ({ department, months = 6 }) =>
    db.offers.recentByDepartment(department, months),
  requiresApproval: false,
});
```
- [ ] Register position CRUD as tools
- [ ] Register applicant CRUD as tools
- [ ] Register context/lookup tools (templates, salaries, team info)
- [ ] Register settings tools

### Phase 2: Agentic Recruiting Workflows (Sprint 4-5)

**Goal:** Build complete agent workflows for key recruiting tasks

#### 2.1 "Create Job" Workflow
```
User: "I need to hire a backend engineer for claims"

BlueAI executes:
1. context.jd_templates({ roleType: "engineering" })
2. context.salary_benchmarks({ department: "Engineering" })
3. context.team_structure({ team: "Claims" })
4. jobs.create({ ...draft })
```
- [ ] Create job creation workflow orchestration
- [ ] Implement template selection logic
- [ ] Add salary suggestion based on benchmarks
- [ ] Build draft preview component
- [ ] Add modification handling ("bump salary to X")

#### 2.2 "Screen Candidate" Workflow
```
User: "Screen this candidate" (on candidate page)

BlueAI executes:
1. context.get_candidate({ id })
2. context.get_job_requirements({ positionId })
3. context.get_company_values()
4. ai.screen_candidate({ candidateData, requirements, values })
5. candidates.update_screening({ id, screening })
```
- [ ] Create screening workflow with full context
- [ ] Build AI screening prompt with evidence gathering
- [ ] Display screening results with approve/modify
- [ ] Auto-generate must-validate items

#### 2.3 "Generate Questions" Workflow
```
User: "Prepare questions for Sarah's panel interview"

BlueAI executes:
1. context.get_candidate_history({ id }) // all stages so far
2. context.get_stage_rubric({ stageId })
3. context.get_must_validate_items({ candidateId })
4. ai.generate_questions({ context, categories })
```
- [ ] Build question generation with full candidate context
- [ ] Include previous stage insights
- [ ] Focus on must-validate items
- [ ] Generate follow-up suggestions

#### 2.4 "Advance Candidate" Workflow
```
User: "Advance Sarah to panel, she scored 88, great on architecture"

BlueAI executes:
1. candidates.add_stage_notes({ id, notes, score })
2. candidates.advance_stage({ id, notes })
3. slack.notify({ channel: "recruiting", message })
4. email.send({ to: candidate, template: "stage_advanced" })
```
- [ ] Create stage advancement workflow
- [ ] Auto-update scores and notes
- [ ] Trigger notifications
- [ ] Generate next stage preparation

#### 2.5 "Analyze Interview" Workflow
```
User: "Analyze the transcript for James's technical interview"

BlueAI executes:
1. context.get_interview({ id })
2. context.get_rubric({ stageId })
3. context.get_candidate_context({ id })
4. ai.analyze_transcript({ transcript, rubric, context })
5. interviews.save_analysis({ id, analysis })
```
- [ ] Build transcript analysis with rubric alignment
- [ ] Extract evidence for each competency
- [ ] Generate strengths/concerns with citations
- [ ] Suggest next-stage focus areas

### Phase 3: Context Layer (Sprint 6-7)

**Goal:** Give BlueAI deep knowledge of the company

#### 3.1 Company Knowledge Base
- [ ] Index company values with examples
- [ ] Store JD templates by role type
- [ ] Track salary history and offers
- [ ] Map org structure and teams
- [ ] Store hiring rubrics and scorecards

#### 3.2 Pattern Recognition
- [ ] Analyze past hiring decisions
- [ ] Identify successful candidate patterns
- [ ] Track interviewer calibration
- [ ] Store "what good looks like" examples

#### 3.3 Memory Persistence
- [ ] Store agent conversation history
- [ ] Remember user preferences
- [ ] Track frequently asked questions
- [ ] Cache common context retrievals

### Phase 4: Proactive AI (Sprint 8-9)

**Goal:** BlueAI suggests actions before you ask

#### 4.1 Pipeline Monitoring
- [ ] Detect stale candidates (>X days in stage)
- [ ] Identify bottlenecks (too many in one stage)
- [ ] Surface top candidates needing action
- [ ] Flag upcoming interview preps needed

#### 4.2 Daily Briefing
```
BlueAI: Good morning! Here's your recruiting update:
├── 3 new applications overnight
├── 2 interviews scheduled today
├── Sarah Chen ready for offer (score: 86)
└── 2 candidates stale in HR Screen

Want me to screen the new applications?
```
- [ ] Build daily summary generation
- [ ] Add actionable suggestions
- [ ] Enable one-click actions from briefing

#### 4.3 Smart Reminders
- [ ] Interview preparation reminders
- [ ] Decision deadline nudges
- [ ] Follow-up suggestions
- [ ] Candidate re-engagement prompts

### Phase 5: Advanced (Sprint 10+)

#### 5.1 Voice Integration
- [ ] Add voice input to command bar
- [ ] Implement voice commands for common actions
- [ ] Build voice response for briefings

#### 5.2 Multi-Agent Coordination (6-month)
- [ ] Create specialist agents (Recruiter, Scheduler, Interviewer)
- [ ] Implement agent handoff patterns
- [ ] Build agent conversation visualization

#### 5.3 Computer Use (6-month)
- [ ] Integrate Claude Computer Use for external tools
- [ ] Automate Fireflies transcript retrieval
- [ ] Automate assessment platform data pulls

---

## Legacy Phases (Reference)

*The phases below are preserved for reference but superseded by the AI-Native phases above.*

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

### Phase 1: Foundation (Sprint 1-2)

**Goal:** Database schema and basic infrastructure for recruiting module

#### 1.1 Database Schema
- [ ] Add recruiting enums to Prisma schema
  - `JobPositionStatus`: DRAFT, OPEN, PAUSED, CLOSED, FILLED
  - `FlowType`: STANDARD, ENGINEERING, SALES, EXECUTIVE, CUSTOM
  - `ApplicantStatus`: NEW, SCREENING, INTERVIEWING, ASSESSMENT, OFFER_STAGE, HIRED, REJECTED, WITHDRAWN
  - `StageStatus`: PENDING, IN_PROGRESS, COMPLETED, SKIPPED
  - `AssessmentType`: TECHNICAL_TEST, PERSONALITY, SKILLS, CASE_STUDY, REFERENCE_CHECK
- [ ] Create `RecruitingSettings` model (Company Rulebook - applies to ALL roles)
  - Company values (PRESS framework: Passionate Work, Relentless Growth, Empowered Action, Sense of Urgency, Seeing Possibilities)
  - Competency framework JSON
  - Personality templates (OCEAN/MBTI guidance)
  - Existing team profiles (optional reference set)
  - Default scoring weights
- [ ] Create `JobPosition` model
  - Title, department, description
  - Job description file/text (structured format)
  - Hiring rubric (rubric questions)
  - Scorecard template
  - Role objectives (6-12 month goals)
  - Role competency clarifications
  - Flow type (determines stage sequence)
  - Status
- [ ] Create `InterviewStage` model (configurable per flow type)
  - Position reference
  - Stage name, order
  - Interview type (phone, video, in-person, panel)
  - Duration, interviewer count
  - Required assessments for this stage
- [ ] Create `Applicant` model
  - Personal info (name, email, phone, LinkedIn URL)
  - Resume/CV file URL
  - Interest form responses (JSON - from Google Forms)
  - MBTI type, OCEAN scores
  - Salary expectations
  - Source (YC, referral, etc.)
  - Current stage
  - Application score (1-100)
  - Overall score (1-100, aggregated)
  - Status
  - Employee reference (for hired candidates)
- [ ] Create `ApplicantStageSnapshot` model (versioned, append-only)
  - Applicant and stage references
  - Version number
  - Score (1-100)
  - AI analysis JSON (structured):
    - `score_rationale` (why this score)
    - `strengths[]` (with evidence refs)
    - `weaknesses[]` (with evidence refs)
    - `must_validate[]` (what to probe next)
    - `next_interview_questions[]`
    - `recommendation` (ADVANCE | HOLD | REJECT)
    - `confidence` (0-100)
  - Interviewer notes
  - Rubric scores (per-criteria)
  - Timestamp
- [ ] Create `Interview` model
  - Applicant, stage references
  - Scheduled date/time
  - Interviewer assignments
  - Transcript text (from Fireflies or upload)
  - Transcript URL, Recording URL
  - AI analysis JSON
  - Status
- [ ] Create `ApplicantAssessment` model
  - Applicant reference
  - Assessment type (Testify, Kand.io, TestGorilla, Big OCEAN)
  - Platform name
  - Score, max score
  - Results JSON
  - PDF file URL
  - Completed date
- [ ] Create `InterviewQuestion` model
  - Position/applicant/stage references
  - Category (situational, behavioral, motivational, technical, culture/values, curiosity/growth)
  - Questions JSON (personalized per candidate)
  - Source (AI-generated vs panelist-added)
- [ ] Add audit actions for recruiting
- [ ] Run migration

#### 1.2 tRPC Router Setup
- [ ] Create `src/server/routers/recruiting.ts`
- [ ] Add recruiting router to `_app.ts`
- [ ] Implement settings procedures
  - `settings.get` - Get recruiting settings (Company Rulebook)
  - `settings.update` - Update settings
- [ ] Implement positions procedures (basic CRUD)
  - `positions.list` - List all positions with filters
  - `positions.get` - Get single position with stages
  - `positions.create` - Create new position with flow type
  - `positions.update` - Update position
  - `positions.delete` - Delete position (soft)
  - `positions.updateStatus` - Change position status
- [ ] Implement applicants procedures (basic CRUD)
  - `applicants.list` - List applicants with filters (supports YC-style sorting by score)
  - `applicants.get` - Get single applicant with all snapshots
  - `applicants.create` - Create new applicant (manual or via API/webhook)
  - `applicants.update` - Update applicant
  - `applicants.delete` - Delete applicant (soft)

#### 1.3 Navigation & Layout
- [ ] Add "Recruiting" to sidebar navigation (collapsible)
- [ ] Create recruiting layout wrapper (full-page views, no modals for complex data)
- [ ] Add role guards (SUPER_ADMIN, HR_ADMIN)

#### 1.4 Basic Pages
- [ ] `/recruiting` - Dashboard placeholder
- [ ] `/recruiting/positions` - Positions list page
- [ ] `/recruiting/positions/new` - Create position form (full page, not modal)
  - Flow type dropdown selection
  - JD upload (PDF or paste text)
  - Rubric configuration
- [ ] `/recruiting/positions/[id]` - Position detail with applicant table
- [ ] `/recruiting/positions/[id]/edit` - Edit position page
- [ ] `/recruiting/settings` - Recruiting settings page (Company Rulebook)

#### 1.5 Applicant Ingestion API
- [ ] Create webhook/API endpoint for external applicant ingestion
  - Accepts: name, email, LinkedIn URL, resume PDF, interest form JSON
  - Purpose: Enable n8n/automation to push data from YC Apply
- [ ] Manual applicant creation form
  - Upload resume PDF
  - Paste LinkedIn URL
  - Enter basic info

---

### Phase 2: Pipeline Management (Sprint 3-4)

**Goal:** Full applicant pipeline with stage progression and YC-style scoring

#### 2.1 Interview Stages
- [ ] Implement stages procedures
  - `stages.create` - Add stage to position
  - `stages.update` - Update stage details
  - `stages.reorder` - Reorder stages
  - `stages.delete` - Remove stage
- [ ] Create stage management UI in position detail
- [ ] Pre-configure default stages by flow type:
  - **Standard**: Interest → HR Screen → Panel → Trial → Offer
  - **Engineering**: Interest → HR Screen → Kand.io Test → Technical Interview → Panel → Trial
  - **Sales**: Interest → HR Screen → Panel → Trial with POC Goals → Offer
  - **Executive**: Interest → HR Screen → Multiple Panels → Case Study → CEO Interview → Offer

#### 2.2 Applicant List (YC-Style)
- [ ] Create applicant table component (inspired by YC applicant grading)
  - Prominent score column (1-100)
  - Name, email, LinkedIn
  - Current stage (badge)
  - Applied date, last updated
  - Click row to expand full profile
- [ ] Sort by score (default: descending)
- [ ] Filter by stage, score range, date
- [ ] Bulk actions (advance, reject, archive)
- [ ] Favorite/star candidates
- [ ] Share link functionality

#### 2.3 Applicant Profile (Full Page with Tabs)
- [ ] Create `/recruiting/applicants/[id]` page (full page, sidebar collapses when viewing)
- [ ] Profile header (always visible):
  - Name, email, LinkedIn URL (clickable)
  - Avatar (from LinkedIn if possible)
  - Overall score (1-100) prominently displayed
  - "Why this score" summary (1-3 sentences)
  - Current stage badge
  - Applied date
- [ ] Build tabbed interface:
  - **Interest/Application tab**:
    - Resume summary (not separate CV tab - summarize here, link to raw PDF)
    - Key experience highlights ("meaningful work experiences")
    - Extracted skills/domains
    - Application score + explanation
    - "Must validate" items pre-interview
    - Suggested Interview 1 questions (personalized)
  - **Interview Stages tab**:
    - Collapsible sections per stage (Interview 1, 2, 3...)
    - Per stage: transcript, interviewer notes, rubric scores
    - AI analysis: score + explanation, strengths, weaknesses
    - "Must validate next" items
    - Next interview questions
    - Panelist questions section (manual entry)
  - **Curacel Fit tab** (Values & Competencies):
    - Values alignment scores
    - Competency alignment scores
    - Evidence snippets from transcripts/forms/resume
    - Flags (inconsistent with values)
  - **Decision tab**:
    - Summary across all stages
    - Score timeline chart (Application → Interview 1 → Interview 2 → ...)
    - Final recommendation + confidence
    - Human decision capture (Hire/No hire/Hold/Needs more info + notes)
- [ ] Resume PDF viewer component
- [ ] LinkedIn profile display

#### 2.4 Stage Advancement
- [ ] Implement `applicants.advanceStage` procedure
  - Creates new stage snapshot (append-only)
  - Preserves previous stage data
- [ ] Stage transition validation
- [ ] Stage advancement modal with notes collection
- [ ] Show score progression over time

#### 2.5 Rejection Flow
- [ ] Implement `applicants.reject` procedure
- [ ] Rejection modal with reason selection
- [ ] Rejection email template
- [ ] Track rejection reasons for analytics

---

### Phase 3: Interview Management (Sprint 5-6)

**Goal:** Schedule, conduct, and document interviews with transcript ingestion

#### 3.1 Interview Scheduling
- [ ] Implement interviews procedures
  - `interviews.schedule` - Schedule interview
  - `interviews.reschedule` - Change time
  - `interviews.cancel` - Cancel interview
  - `interviews.complete` - Mark complete
- [ ] Interview scheduling form
- [ ] Interviewer assignment
- [ ] Email notifications for scheduled interviews

#### 3.2 Transcript Ingestion
- [ ] Manual transcript upload (MVP)
  - Accept pasted text or file upload (.txt, .pdf)
  - Parse and store transcript text
  - Trigger stage analysis
- [ ] Fireflies "Attach Meeting" flow (Phase 2)
  - Search Fireflies API by meeting title/participant name
  - Display recent meetings matching candidate name
  - User selects correct meeting
  - Pull: transcript, summary, video link
  - Store transcript + link to candidate stage
- [ ] Add transcript file route to Uploadthing

#### 3.3 Manual Scoring (Rubric-Based)
- [ ] Create `score-card-form.tsx` component
- [ ] Implement rubric-based scoring UI (criteria from job rubric)
- [ ] Add interviewer notes field
- [ ] Save scores to `ApplicantStageSnapshot`
- [ ] Support panelist custom questions input

#### 3.4 Interview Views
- [ ] Create `/recruiting/interviews` page
- [ ] List view with filters (date, position, status, interviewer)
- [ ] Interview detail view

---

### Phase 4: AI Integration (Sprint 7-8)

**Goal:** AI-powered screening, analysis, and question generation (replaces manual ChatGPT workflow)

#### 4.1 AI Context Setup
- [ ] Implement selective RAG retrieval
  - Store all docs as text with embeddings
  - At evaluation time, retrieve only:
    - Relevant company values/competencies
    - Relevant role docs (JD, rubric, scorecard)
    - Current stage artifacts
    - Candidate's baseline profile summary
- [ ] Create AI prompt templates

#### 4.2 Resume/Application Screening
- [ ] Create `src/lib/ai/recruiting/screening.ts`
- [ ] Implement screening prompt:
  - Input: Company values, competency framework, JD, rubric, CV content, LinkedIn summary, interest form responses
  - Output (JSON):
    ```json
    {
      "score": 0-100,
      "score_rationale": "short explanation",
      "strengths": ["...", "..."],
      "weaknesses": ["...", "..."],
      "must_validate": ["what to validate", "why it matters"],
      "next_interview_questions": ["q1", "q2"],
      "recommendation": "ADVANCE | HOLD | REJECT",
      "confidence": 0-100
    }
    ```
- [ ] Add `applicants.runAiScreening` procedure
- [ ] Create `ai-screening-panel.tsx` component
- [ ] Display: score (1-100), why score, strengths, concerns, must-validate items
- [ ] Store screening results in applicant record

#### 4.3 Transcript Analysis
- [ ] Create `src/lib/ai/recruiting/transcript.ts`
- [ ] Implement analysis prompt:
  - Input: Previous stage data + transcript + role context
  - Output (JSON): Same structure as screening
- [ ] Add `interviews.analyzeTranscript` procedure
- [ ] Create `transcript-analyzer.tsx` component
- [ ] Display: summary, key insights, red flags, strengths
- [ ] Generate "must validate" for next stage
- [ ] Generate next-stage interview questions

#### 4.4 Question Generation
- [ ] Create `src/lib/ai/recruiting/questions.ts`
- [ ] Implement generation prompt by category:
  - Situational
  - Behavioral
  - Motivational
  - Technical (role-specific)
  - Culture/Values
  - Curiosity/Growth
- [ ] Personalization: Questions adapt based on candidate's background
  - Example: If candidate worked at Company X, questions reference that experience
- [ ] Add `questions.generate` procedure
- [ ] Create `question-generator.tsx` component
  - Category dropdown selection
  - 5-10 questions per category
  - Follow-up question suggestions
  - "What good answer looks like" hints
- [ ] Allow panelists to add custom questions
- [ ] Create `/recruiting/questions` page (question bank)

#### 4.5 Blue AI Extension
- [ ] Add recruiting tools to Blue AI assistant
  - `list_open_positions` - Show open roles
  - `get_applicant_summary` - Applicant overview
  - `screen_applicant` - Run AI screening
  - `analyze_interview` - Analyze transcript
  - `generate_questions` - Create questions
- [ ] Update assistant router with new tools

---

### Phase 5: Decision Module & Hire (Sprint 9-10)

**Goal:** Final decision UI with evidence and applicant → employee transition

#### 5.1 Decision Interface
- [ ] Create `decision-module.tsx` component
- [ ] Score breakdown visualization:
  ```
  Final Score Breakdown:
  ├── Application Quality: 85/100 (weight: 20%)
  ├── HR Screen: 78/100 (weight: 20%)
  ├── Technical Assessment: 92/100 (weight: 15%)
  ├── Panel Interview 1: 80/100 (weight: 20%)
  ├── Panel Interview 2: 88/100 (weight: 15%)
  └── Culture Fit: 90/100 (weight: 10%)
  ═══════════════════════════════════════════
  FINAL SCORE: 84/100
  ```
- [ ] Score timeline chart (progression visualization)
- [ ] AI recommendation with confidence percentage
- [ ] Supporting evidence from all stages
- [ ] Risk factors and mitigations
- [ ] Comparison to role ideal profile

#### 5.2 Hire Flow
- [ ] Implement `applicants.hire` procedure:
  1. Create Employee record from Applicant data
  2. Link applicant to employee (`applicant.employeeId`)
  3. Create Offer in DRAFT status
  4. Set applicant status to HIRED
  5. Trigger audit log
- [ ] Create hire confirmation modal
- [ ] Auto-populate offer form with applicant data (salary expectation, etc.)
- [ ] Redirect to existing offer editing flow (`/contracts/new`)

#### 5.3 Assessment Tracking
- [ ] Implement assessments procedures
  - `assessments.create` - Add assessment result (PDF upload or API)
  - `assessments.update` - Update score/results
  - `assessments.delete` - Remove assessment
- [ ] Create assessment upload form
- [ ] Support platforms:
  - Testify (personality - PDF upload)
  - TestGorilla (skills - PDF upload)
  - Kand.io (coding tests - PDF or API if available)
  - Big OCEAN (personality - manual entry or PDF)
- [ ] Display in applicant profile Assessments section

#### 5.4 Candidate Comparison
- [ ] Add comparison view for position
- [ ] Side-by-side candidate metrics
- [ ] Ranking by overall score
- [ ] Highlight key differentiators

---

### Phase 6: Settings & Analytics (Sprint 11-12)

**Goal:** Configuration and insights

#### 6.1 Recruiting Settings Page (Company Rulebook)
- [ ] Company values editor (PRESS framework)
- [ ] Competency framework configuration
- [ ] Personality template management (OCEAN/MBTI ideal profiles)
- [ ] Existing team profiles reference (optional)
- [ ] Default interview stages by flow type
- [ ] Scoring weight configuration
- [ ] Email template customization

#### 6.2 Analytics Dashboard
- [ ] Create `/recruiting/analytics` page
- [ ] Pipeline metrics:
  - Applications per position
  - Time-to-hire by stage (Total no of days tracking)
  - Conversion rates (stage to stage)
  - Source effectiveness
  - Average scores by source
- [ ] AI accuracy tracking (compare AI recommendation to hire outcomes)
- [ ] Interviewer activity and calibration
- [ ] Export reports

#### 6.3 Audit Logging
- [ ] Add recruiting audit actions:
  - JOB_POSITION_CREATED, JOB_POSITION_UPDATED, JOB_POSITION_STATUS_CHANGED
  - APPLICANT_CREATED, APPLICANT_STAGE_ADVANCED, APPLICANT_REJECTED, APPLICANT_HIRED
  - INTERVIEW_SCHEDULED, INTERVIEW_COMPLETED
  - AI_SCREENING_RUN, AI_INTERVIEW_ANALYSIS
  - ASSESSMENT_UPLOADED
- [ ] Display in audit log UI

#### 6.4 Email Notifications
- [ ] Application received confirmation
- [ ] Interview scheduled notification
- [ ] Stage advancement notification (internal - n8n integration ready)
- [ ] Rejection email (configurable template)
- [ ] Offer pending notification

---

### Phase 7: Integrations (Future)

**Goal:** External system connections

#### 7.1 Fireflies Integration
- [ ] Create `src/lib/integrations/fireflies.ts`
- [ ] Implement meeting search API
- [ ] Auto-attach meeting transcripts by candidate name match
- [ ] Pull: transcript, summary, video link
- [ ] Add Fireflies API key to settings

#### 7.2 Google Forms Integration
- [ ] Import interest form responses automatically
- [ ] Map form fields to applicant data
- [ ] Trigger AI screening on form submission

#### 7.3 YC Apply Integration (Custom Scraper)
- [ ] Build n8n workflow to scrape YC applicant data
- [ ] Push to applicant ingestion API
- [ ] Map YC fields to applicant model

#### 7.4 Assessment Platform APIs
- [ ] Testify webhooks (if available on paid plan)
- [ ] Kand.io API integration
- [ ] Auto-fetch results when tests complete

#### 7.5 n8n Email Automation
- [ ] Stage advancement triggers email via n8n
- [ ] Assessment invitation emails
- [ ] Interview scheduling confirmations

---

## File Structure (V2 Additions)

```
src/
├── app/(authenticated)/recruiting/
│   ├── page.tsx                    # Dashboard
│   ├── layout.tsx                  # Recruiting layout (collapsible sidebar)
│   ├── positions/
│   │   ├── page.tsx               # List positions
│   │   ├── new/page.tsx           # Create position (full page)
│   │   └── [id]/
│   │       ├── page.tsx           # Position detail + applicant table
│   │       └── edit/page.tsx      # Edit position
│   ├── applicants/
│   │   ├── page.tsx               # All applicants (cross-position)
│   │   └── [id]/page.tsx          # Applicant profile (full page, tabbed)
│   ├── interviews/page.tsx         # Interview list
│   ├── questions/page.tsx          # Question bank
│   ├── analytics/page.tsx          # Analytics dashboard
│   └── settings/page.tsx           # Company Rulebook settings
├── components/recruiting/
│   ├── applicant-table.tsx         # YC-style applicant list
│   ├── applicant-profile.tsx       # Full profile with tabs
│   ├── applicant-card.tsx          # Card for quick views
│   ├── stage-snapshot.tsx          # Per-stage analysis display
│   ├── score-display.tsx           # Score badge (1-100)
│   ├── score-timeline.tsx          # Score progression chart
│   ├── score-card-form.tsx         # Rubric-based scoring input
│   ├── transcript-upload.tsx       # Upload component
│   ├── transcript-analyzer.tsx     # AI analysis display
│   ├── question-generator.tsx      # AI question UI
│   ├── ai-screening-panel.tsx      # Screening results
│   ├── decision-module.tsx         # Final decision UI
│   ├── values-fit-display.tsx      # Curacel Fit tab content
│   └── interview-scheduler.tsx     # Scheduling form
├── lib/
│   ├── ai/recruiting/
│   │   ├── screening.ts           # Resume screening AI
│   │   ├── transcript.ts          # Transcript analysis AI
│   │   ├── questions.ts           # Question generation AI
│   │   └── prompts.ts             # Prompt templates
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
  TECHNICAL_TEST  // Kand.io
  PERSONALITY     // Testify, MBTI
  SKILLS          // TestGorilla
  CASE_STUDY
  REFERENCE_CHECK
  BIG_OCEAN       // Big Five OCEAN
}

// Models
model RecruitingSettings {
  id                   String   @id @default(cuid())
  companyValues        Json     // PRESS: Passionate Work, Relentless Growth, etc.
  competencyFramework  Json     // Company-wide competencies
  personalityTemplates Json     // Ideal OCEAN/MBTI by department
  existingTeamProfiles Json?    // Reference profiles
  scoringWeights       Json     // Weight per stage for overall score
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

model JobPosition {
  id                 String            @id @default(cuid())
  title              String
  department         String
  description        String            @db.Text
  jobDescriptionUrl  String?           // PDF upload
  rubric             Json?             // Hiring rubric questions
  scorecard          Json?             // Evaluation criteria
  objectives         String?           @db.Text // 6-12 month goals
  competencyClarification Json?        // Role-specific competencies
  flowType           FlowType          @default(STANDARD)
  status             JobPositionStatus @default(DRAFT)
  stages             InterviewStage[]
  applicants         Applicant[]
  questions          InterviewQuestion[]
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
}

model InterviewStage {
  id               String      @id @default(cuid())
  positionId       String
  position         JobPosition @relation(fields: [positionId], references: [id])
  name             String      // "HR Screen", "Panel Interview", "Case Study"
  order            Int
  interviewType    String?     // phone, video, in-person, panel
  duration         Int?        // minutes
  interviewerCount Int         @default(1)
  requiredAssessments String[] // ["TESTIFY", "KAND_IO"] for this stage
  snapshots        ApplicantStageSnapshot[]
  interviews       Interview[]
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
}

model Applicant {
  id                String          @id @default(cuid())
  positionId        String
  position          JobPosition     @relation(fields: [positionId], references: [id])
  // Basic info
  name              String
  email             String
  phone             String?
  linkedinUrl       String?
  resumeUrl         String?
  coverLetterUrl    String?
  // Interest form data
  interestFormData  Json?           // Responses from Google Form
  mbtiType          String?         // INTJ, ENTJ, etc.
  oceanScores       Json?           // Big Five scores
  salaryExpectation String?
  source            String?         // YC, referral name, etc.
  quarter           String?         // Q4 2025
  // Scoring
  applicationScore  Float?          // 1-100, from AI screening
  overallScore      Float?          // 1-100, aggregated
  currentStage      String?
  // Status
  status            ApplicantStatus @default(NEW)
  // AI data
  aiScreeningData   Json?           // Initial screening output
  // Relations
  snapshots         ApplicantStageSnapshot[]
  interviews        Interview[]
  assessments       ApplicantAssessment[]
  questions         InterviewQuestion[]
  // Hire transition
  employeeId        String?         @unique
  employee          Employee?       @relation(fields: [employeeId], references: [id])
  // Metadata
  rejectionReason   String?
  notes             String?         @db.Text
  totalDaysInPipeline Int?          // Tracking metric
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
}

// Immutable, versioned snapshots per stage
model ApplicantStageSnapshot {
  id               String         @id @default(cuid())
  applicantId      String
  applicant        Applicant      @relation(fields: [applicantId], references: [id])
  stageId          String
  stage            InterviewStage @relation(fields: [stageId], references: [id])
  version          Int            @default(1)
  // Scoring
  score            Float?         // 1-100
  status           StageStatus    @default(PENDING)
  // AI analysis (structured JSON)
  aiAnalysis       Json?
  /* aiAnalysis structure:
  {
    "score": 78,
    "score_rationale": "Strong operational background...",
    "strengths": [{"text": "...", "evidence": "resume:line42"}],
    "weaknesses": [{"text": "...", "evidence": "transcript:00:12:34"}],
    "must_validate": [{"what": "...", "why": "...", "questions": ["..."]}],
    "next_interview_questions": [{"category": "behavioral", "question": "...", "good_answer": "..."}],
    "recommendation": "ADVANCE",
    "confidence": 85
  }
  */
  // Human input
  interviewerNotes String?        @db.Text
  rubricScores     Json?          // Per-criteria scores from interviewer
  panelistQuestions Json?         // Custom questions added by panelists
  // Timestamps
  completedAt      DateTime?
  createdAt        DateTime       @default(now())

  @@unique([applicantId, stageId, version])
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
  // Transcript
  transcriptText  String?        @db.Text
  transcriptUrl   String?        // Fireflies or uploaded file
  recordingUrl    String?        // Video link
  firefliesMeetingId String?     // If attached from Fireflies
  // AI analysis
  aiAnalysis      Json?
  status          String         @default("scheduled") // scheduled, completed, cancelled
  notes           String?        @db.Text
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model ApplicantAssessment {
  id              String         @id @default(cuid())
  applicantId     String
  applicant       Applicant      @relation(fields: [applicantId], references: [id])
  type            AssessmentType
  platform        String         // "Testify", "Kand.io", "TestGorilla", "Big OCEAN"
  score           Float?
  maxScore        Float?
  percentile      Float?
  results         Json?          // Detailed breakdown
  fileUrl         String?        // PDF upload
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
  category        String       // situational, behavioral, motivational, technical, culture, curiosity
  questions       Json         // [{question, followUp, goodAnswer, redFlags}]
  source          String       @default("ai") // "ai" or "panelist"
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}
```

---

## AI Output Schemas

### Screening Output
```json
{
  "score": 78,
  "score_rationale": "Strong operational background with AI exposure, but limited direct executive ops experience.",
  "strengths": [
    {"text": "5+ years in operations roles", "evidence": "resume:line12-18"},
    {"text": "Experience with AI tooling", "evidence": "interest_form:q5"}
  ],
  "weaknesses": [
    {"text": "No direct C-suite partnering experience", "evidence": "resume:missing"},
    {"text": "Salary expectation may be high for role", "evidence": "interest_form:salary"}
  ],
  "must_validate": [
    {"what": "Verify AI project ownership", "why": "Claims may be inflated", "questions": ["Describe a specific AI project you led end-to-end"]}
  ],
  "next_interview_questions": [
    {"category": "behavioral", "question": "Tell me about a time you partnered with a CEO on a strategic initiative", "good_answer": "Specific example with measurable outcomes"}
  ],
  "recommendation": "ADVANCE",
  "confidence": 72
}
```

### Question Generation Output
```json
{
  "category": "situational",
  "questions": [
    {
      "question": "Imagine you discover the CEO has been making decisions without consulting the board. How would you handle this?",
      "follow_up": "What if the CEO insists on continuing this approach?",
      "good_answer": "Demonstrates diplomatic conflict resolution while maintaining ethical standards",
      "red_flags": ["Avoidance of confrontation", "Suggests hiding information"]
    }
  ]
}
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

## Open Questions (Track Explicitly)

1. **Funneling point** - At what stage do candidates enter AI evaluation by default? (Likely HR screen, but should be configurable)
2. **Overall score aggregation** - Simple average vs weighted by stage importance?
3. **Evidence UX** - How to show citations into resume/transcripts (highlighted snippets, expandable references)?
4. **Pipeline template design** - Start with Executive Ops flow, then Engineering
5. **Fireflies MVP** - Paste transcripts first, or implement "Attach meeting" immediately?

---

## Dependencies

- Anthropic Claude API for AI features
- Uploadthing for file uploads (existing)
- NextAuth for authentication (existing)
- Prisma + PostgreSQL for data (existing)
- tRPC for API (existing)
- shadcn/ui for components (existing)
- Fireflies API for transcript retrieval (Phase 7)
- n8n for email automation (optional)

---

## Notes

- **MVP Focus**: Replicate and automate what the team currently does manually with ChatGPT
- Each phase builds on the previous; deploy incrementally
- AI features (Phase 4) can be tested in isolation with mock data
- Hire flow (Phase 5) is the critical integration point with V1
- Analytics (Phase 6) requires data from earlier phases
- Integrations (Phase 7) are optional enhancements
- Stage snapshots are **append-only** - never overwrite earlier evaluations
