# Changelog

All notable changes to Curacel People are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **Public Careers Pages**
  - Public careers landing page (`/careers`) for job seekers
  - Public recruiter application forms (`/recruiter`)
  - Public jobs API endpoint (`/api/jobs`) for external integrations
- **Recruiting Mock Seed**
  - Added `scripts/seed-single-candidate.ts` to populate one consistent mock candidate with flow, interviews, assessments, and BlueAI analysis
- **Candidate Profile PDF Export**
  - Added `/api/recruiting/candidates/:id/export` for structured PDF downloads from the candidate profile
- **Recruiting Settings Enhancements**
  - Expanded recruiting settings page with comprehensive configuration options
  - Recruiter router for managing public-facing recruitment features
- **Candidate Scoring Settings**
  - Configure weighted inputs for overall candidate scores in Recruiting Settings
  - Missing profile data is excluded from the weighted calculation
- **Job List Score Display**
  - Toggle between average and max score for the jobs list donut in Hiring General Settings
- **Hiring General Settings**
  - New Hiring settings page for shared defaults like jobs list score display
- **Interview Settings**
  - New Hiring settings page grouping interview types, rubrics, scoring, and question bank
- **Job Settings section in Administration**
  - New parent settings page (`/settings/job-settings`) grouping job-related configurations
  - Contains Job Descriptions and Interview Settings
  - Cleaner organization of hiring-related settings
- **Teams with Sub-Teams Support**
  - Added hierarchical team structure with parent-child relationships
  - Sub-teams can be created under any root team
  - Expandable/collapsible team hierarchy in Teams page
  - Teams now used as source of truth for departments throughout app
  - Updated Employee forms to use Team dropdown instead of free text
  - Updated Recruiting positions to use Team dropdown
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
- Adjusted assessments filter cards layout for consistent sizing and spacing.
- Simplified assessments list columns and allowed assessment names to wrap.
- Matched assessments filter cards/button styling to the interviews pill layout.
- **App-Wide Responsiveness Enhancement**
  - Onboarding page: Stats grid now 2-column on mobile, workflow cards stack vertically
  - Offboarding page: Same responsive improvements as onboarding
  - Contracts page: Contract list items stack on mobile, responsive padding
  - All pages now work properly on mobile (320px), tablet (768px), and desktop viewports
- Candidate list filters now align with the breadcrumb row
- Jobs, Employees, Contracts, Onboarding, and Offboarding actions now align with the breadcrumb row
- Dashboard recruiting widgets now pull live DB data for pipeline metrics, top candidates, activity, and upcoming interviews
- Dashboard quick actions now link to scheduling interviews instead of transcript uploads
- Candidate profile actions now export profiles, update stages/decisions, and open the interview scheduler
- Candidate profile tabs now fill the page width with evenly distributed triggers
- Candidate profile actions now live inline (Export Profile under Generate Questions; Advance to Offer in Decision quick actions)
- Updated AI copy to use BlueAI across the app UI and documentation
- Candidate profile now renders DB-only data with hiring flow-aligned stage progress and weighted overall scoring
- Hiring settings no longer use tabbed navigation; sections are accessed from dedicated settings pages
- Interview settings is now the single entry point for interview types, rubrics, scoring, and question bank in Settings
- Jobs list public toggle now sits beside the priority badge and uses a smaller control
- Job list stage stats now link into filtered job candidates views
- Candidates list adds LinkedIn profile links and a column selector for extra fields
- Job candidates table now mirrors the candidates list column selector and action menu alignment
- Candidates list stage cards and LinkedIn links now align with updated spacing and branding
- Candidates row menu now includes Archive and Reject actions
- Interviews menu now focuses on Reschedule, Cancel, and Fireflies actions
- Interview scheduling question source tabs remove extra top padding
- AuntyPelz generator block now sits closer to the tabs on interview scheduling
- Bulk actions on candidates now include Archive
- Candidates tables now share a single reusable component across main and job-specific views
- Candidates table column preferences now persist correctly across reloads
- **Recruiting Assessments Page Improvements**
  - Enhanced UI and layout for assessments management
- **Interviews Page Enhancements**
  - Improved interviews list and detail views
- Renamed "AI Agent" and "AI Assistant" to "Blue AI" throughout the application
  - Sidebar navigation and assistant panel
  - Settings pages and documentation
  - Error messages and audit logs
- Updated navigation documentation to include Blue AI
- Enhanced onboarding flow to include personality profile step
- Improved role-based access documentation
- Reorganized Settings page into sections with App Admins and On/Offboarding Settings grouping
- Renamed Settings > Applications to Integrations for nav consistency
- Updated Applications settings page copy to Integrations
- Removed experience level requirement field from Create Job
- Added job deadline field and Start/Deadline labels in job views
- Added number of hires field on job creation and multi-hire badge in job list
- Added priority badge to job list cards
- Aligned job list card spacing, typography, and avg score donut styling with the jobs list mockup
- Updated remote policy label to Hybrid and added freeform multi-city office locations with Lagos suggestion
- Replaced Remote OK with Location input, added region support and Nairobi suggestion
- Removed Role Objectives from Create Job (handled in JD instead)
- Renamed Automation section to Blue AI Actions in Create Job
- Candidates list now filters by team and date, and Alumni is renamed to Archived (including stage value and route)

### Fixed
- Voice transcription now works on Node.js versions below 20 (uses temp file approach)
- Local dev auth boot issues caused by missing database and NextAuth secrets
- Missing slider component in Recruiting settings causing build failure
- Create Job and Save as Draft actions now respond with validation feedback
- Dashboard hook order now consistent to prevent render mismatch errors
- Candidate profile hook order now consistent to prevent render mismatch errors
- Interview scheduling candidate picker is selectable again
- Interview scheduling selected slot banner now uses readable success text color
- JD template editor color picker no longer throws a runtime error
- JD templates breadcrumb label now uses the correct "JD" casing
- JD template detail breadcrumbs now drop the "JD" slug prefix from titles
- JD template editor now registers the text style mark for color changes
- Restored branded email template helper for password reset emails
- Rich text editor now accepts form `value` props without breaking types
- Employee update API now accepts bank detail fields from the profile editor
- Hiring assessment analytics now guard against missing chart percentages
- Cleaned up unused assessment list type to satisfy build checks
- Candidate work experience parsing now guards JSON field types
- Candidate work experience parsing now normalizes highlights and skills arrays
- Candidate education parsing now normalizes JSON field values
- Candidate evaluation star ratings now guard null values during render
- Archived candidate restore now uses the current update candidate mutation
- Archived candidates list now reads job titles from the related job record
- Interview scheduling advisor selection now matches interviewer input types
- Hiring dashboard upcoming interviews now skip entries without scheduled dates
- Candidate list applied date formatter now always returns a string
- Interest form dialog typing now derives from query data safely
- Interest form editor now normalizes stored options and fields when editing
- Rubric dialog typing now derives from query data safely
- Interest form preview now uses question/required fields from the API
- Hiring settings now guards job score display values before applying state
- Interest form edit screen now normalizes stored question fields on load
- Interest form list preview now renders question/required fields and normalizes options
- Interview schedule page now explicitly terminates the slots memo for build parsing
- Onboarding Bitbucket options query now guards against missing app IDs
- Onboarding workflow progress calculation now uses explicit task typing
- Onboarding workflow task helpers now share a common task type
- Onboarding task app account matching now uses explicit account typing
- Onboarding app account rendering now uses explicit account typing
- Onboarding app account details now include external account fields in typing
- Integration settings now guard optional connection test status
- Public careers application now always sends a linkedin URL string
- Public careers detail page now safely accesses job description content
- Public recruiter submissions now always send a linkedin URL string
- Assessment selection tiles now keep readable text in dark mode
- External recruiter creation uses a dialog instead of unsupported prompt calls
- Employees auto-activate when start date has passed after offer sign-off
- Candidate profile no longer crashes when BlueAI analysis lists contain object entries
- Job description editor no longer crashes from an invalid rich text icon import

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
