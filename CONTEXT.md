# Curacel People Context

This file is the quick-reference context for Curacel People V1 and V2. Keep it short and update as decisions change.

## Product Scope
- V1: onboarding and employee lifecycle management (offers, onboarding, offboarding, integrations, RBAC, audit).
- V2: Recruiter Agent (pre-onboarding) for applicant tracking, scoring, interview analysis, question generation, and hire decisioning.

## Key Decisions and Principles
- Combined product: recruiting flows into onboarding with a candidate-to-employee conversion.
- Scores are 1-100 for every stage, with visible progression over time.
- Stage snapshots are versioned and append-only (no overwrites).
- AI outputs are evidence-first: strengths, weaknesses, must-validate points, next-stage questions, and recommendation.
- Full-page views for complex data (avoid modals); progressive disclosure on profiles.

## Source Documents and Assets
- PRD and requirements: `files/chatgpt-context.md`, `files/Recruiter Agent.pdf`
- Meeting notes: `files/AI-Projects-Sync-*.md`
- Mockups and styles: `mockups/*.html`, `mockups/styles.css`
- Roadmap: `ROADMAP.md`
- Scope overview: `README.md`
- Workflow rules: `AGENTS.md`

## Recruiting UI Routes (Implemented)
- `/recruiting` (dashboard)
- `/recruiting/positions` (jobs list)
- `/recruiting/positions/new` (create job)
- `/recruiting/positions/[id]/candidates` (position candidates list)
- `/recruiting/candidates/[id]` (candidate profile)
- `/recruiting/candidates/[id]/stages/[stageId]` (stage detail)
- `/recruiting/questions` (question bank)
- `/recruiting/settings` (recruiting settings)

## Data Model Highlights (Planned)
- Recruiting settings: company values (PRESS), competencies, personality templates.
- Job position: JD, rubric, scorecard, objectives, flow type.
- Applicant: CV/LinkedIn/interest form, scores, stage, source, salary expectation, MBTI/OCEAN, total days in pipeline.
- Stage snapshot: transcript, notes, rubric scores, AI analysis output.
- Assessments: Kand.io, TestGorilla, Testify, Big Five (OCEAN/MBTI).
- Fireflies: manual upload now; search/attach via API later.

## Email & Communication System (Dec 2024)

### Core Architecture
- **In-app email system** replacing n8n workflow completely
- **Gmail API** with service account (domain-wide delegation)
- Sends as assigned recruiter, CC's peopleops@curacel.ai
- Thread continuity per candidate (In-Reply-To headers)
- Full attachment support (send and receive)

### Email Triggers
- **Automatic**: Stage advancement triggers templated emails
- **Manual**: Ad-hoc emails from candidate profile
- **Reminders**: Auto-remind if no response in X days, then alert recruiter
- **Rejection**: Draft for HR review, bulk trigger option

### Email Features
- Hierarchical templates (global defaults + per-job overrides)
- AI-enhanced personalization (template variables + AI rewrites)
- Full tracking: opens, link clicks, read time
- Dedicated Email tab + activity feed integration on candidate profile
- Reply sync: poll Gmail API to show candidate replies in-app

### Standard Hiring Flow (varies per role)
Interest → People Chat → Assessment → Team Chat (Panel) → Trial → CEO Chat → Offer

### Interest Form (Replaces Google Forms)
- Standard template with custom questions per job
- Core fields: name, email, MBTI, salary, skills, tools, achievements, motivations
- Public form URL per job position
- Responses displayed in candidate profile tab
- AI analysis on form submission

### BlueAI Analysis System
- **Per-tab summaries**: AI analysis at bottom of each candidate profile tab
- **Versioned commentary**: After each stage/interview, new AI section appended
- **Sentiment tracking**: Track how AI assessment changes as candidate progresses
- **Dedicated BlueAI Analysis tab**: Comprehensive analysis with all versioned insights

### External Integrations (to be internalized long-term)
- Scheduling: Calendly / Google Calendar
- Assessments: TestGorilla, Kand.io, Testlify
- Interviews: Google Meet
- Interest forms: now internal (was Google Forms)

## Open Questions / Inputs Needed
- Fireflies API key and expected search behavior for transcript attachment.
