# Changelog

All notable changes to Curacel People are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **Unified Dashboard redesign**
  - Merged recruiter and people dashboards into single unified view
  - "Welcome back" personalized greeting
  - Hiring stats: Active Jobs, Total Candidates, In Interview, Avg Score
  - Pipeline Overview with conversion funnel visualization
  - Top Candidates section with AI match scores
  - Quick Actions for common tasks
  - Upcoming Interviews table
  - People stats: Total Employees, Pending Contracts, Onboarding, Offboarding
  - Contract Status breakdown
  - Active Onboarding progress
  - Recent Hires and Upcoming Starts
- **Sidebar redesign with grouped navigation**
  - Organized into sections: HIRING, OFFER, PEOPLE, SETTINGS
  - Jobs and Candidates now show count badges
  - Blue AI button with prominent styling as link to /ai-agent
  - Updated version badge to v2
- **V2 Recruiter Agent UI Foundation**
  - Recruiting Dashboard (`/recruiting`) with pipeline overview
  - Positions list and create position pages (`/recruiting/positions`)
  - Candidates list page (`/recruiting/candidates`) with YC-style scoring table
    - Filter by stage (All, Applied, HR Screen, Technical, Panel)
    - Sort by score, search candidates
    - Bulk actions (Advance, Reject)
    - Score color coding (green 80+, amber 65-79, red <65)
  - Candidate profile with tabbed interface (`/recruiting/candidates/[id]`)
  - Stage details view (`/recruiting/candidates/[id]/stages/[stageId]`)
  - Question bank page (`/recruiting/questions`)
  - Recruiting settings page (`/recruiting/settings`)
  - Sidebar navigation for Recruiting module
- **JD Templates in Settings**
  - New JD Templates page (`/settings/jd-templates`)
  - Unified "Create Template" dialog with three methods:
    - Manual: Create template with job title, department, hiring flow, responsibilities, requirements
    - Upload Files: Bulk upload for PDF, DOC, DOCX, TXT files
    - Import from URL: Import JD from job posting URLs (YC Work at a Startup, LinkedIn, Greenhouse, Lever, Workable)
  - Auto-populates form fields when importing from URL for review/editing
  - Department-based icons and color coding
  - Active and Draft template states
  - Duplicate and delete template actions
- **Teams Management in Settings**
  - New Teams page (`/settings/teams`) for managing organizational teams/departments
  - Create, edit, and delete teams with color coding
  - "Sync from Employees" feature to auto-create teams from existing employee departments
  - Employee count display per team
  - Teams serve as the source of truth for departments across the app
- Enhanced ROADMAP.md with detailed PRD, AI output schemas, and current hiring process analysis
- HTML mockups for Recruiter Agent UI (13 screens in `/mockups`)
- Personality & Values feature for employee onboarding
  - Life Values matrix (12 values with 1-5 rating scale)
  - "What You Should Know About Me" questionnaire (19 work style questions)
  - Multi-step onboarding flow (Profile → Values → About Me → Complete)
  - Personality tab in employee profile to view collected data
- Blue AI voice input (microphone button for speech-to-text)
- Updated documentation with Blue AI and Personality & Values sections
- Comprehensive API documentation with webhooks, error handling, and rate limits
- MCP server recommendations in AGENTS.md (GitHub, Postgres, Puppeteer)
- Project context reference doc (`CONTEXT.md`) for V1/V2 scope, links, and design decisions
- Hiring flow editor in Recruiting settings with shared flow data used in job creation, JD templates, and question stage selection
- Interview settings entry on the main Settings page linking to hiring flow editor

### Changed
- Renamed "AI Agent" and "AI Assistant" to "Blue AI" throughout the application
  - Sidebar navigation and assistant panel
  - Settings pages and documentation
  - Error messages and audit logs
- Updated navigation documentation to include Blue AI
- Enhanced onboarding flow to include personality profile step
- Improved role-based access documentation

### Fixed
- Voice transcription now works on Node.js versions below 20 (uses temp file approach)
- Local dev auth boot issues caused by missing database and NextAuth secrets
- Missing slider component in Recruiting settings causing build failure

## [December 2024]

### Added
- Blue AI chat interface with conversation history
- Blue AI search functionality for chat history
- Blue AI panel (quick access from sidebar)
- Transcription support for voice messages
- Daily brief summaries for proactive assistant
- Assistant approval workflow for bulk/destructive actions

### Changed
- Updated contracts color scheme to fit app theme
- Renamed onboarding steps for clarity
- Updated footer text across the application

### Fixed
- Contract templates page issues
- Various TypeScript type errors

## [Earlier Updates]

### Core Features
- Employee management (CRUD, status tracking, department filtering)
- Contract/Offer management with e-signature workflow
- Onboarding workflows with automated and manual tasks
- Offboarding workflows with Google Workspace integration
- Application/Integration management (Google Workspace, Slack, Jira, Bitbucket)
- Team member invitations and role-based access control
- Notification system (in-app and email)
- Audit logging for compliance
- API key management for external integrations

### Integrations
- Google Workspace (user provisioning, data transfer, account deletion)
- Slack (channel creation, user invites, notifications)
- Jira (user provisioning)
- Bitbucket (repository access management)

### Settings
- Organization profile with logo and letterhead
- Signature blocks for contracts
- Legal entities management
- Contract templates (Full-time, Part-time, Contractor, Internship)
- Onboarding flow configuration
- Offboarding flow configuration
- Email notification settings
- API key management

---

## How to Update This Changelog

When making changes to Curacel People:

1. Add your changes under `[Unreleased]` in the appropriate category:
   - **Added** - New features
   - **Changed** - Changes to existing functionality
   - **Deprecated** - Features that will be removed
   - **Removed** - Features that were removed
   - **Fixed** - Bug fixes
   - **Security** - Security-related changes

2. When releasing, move unreleased items to a dated section

3. Keep descriptions concise but informative

4. Reference related documentation pages when relevant
