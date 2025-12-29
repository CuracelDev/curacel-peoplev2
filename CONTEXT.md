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

## Open Questions / Inputs Needed
- AE/commercial interest form fields and hiring rubric criteria for data mapping.
- Access to hiring sheets (columns for stage dates, sources, salary expectations, etc.).
- Fireflies API key and expected search behavior for transcript attachment.
