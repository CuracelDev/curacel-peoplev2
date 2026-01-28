# Competency Framework Implementation Plan

## Overview
Replace the simple `Competency` model with a comprehensive, Google Sheets-synced competency framework that supports:
- **Three competency types**: Department/Team, AI, Company Values
- **Multi-level proficiency tracking**: 4-5 levels per competency
- **Candidate evaluation**: Score sub-competencies throughout interview stages
- **Employee development**: Performance reviews and career progression
- **Full transparency**: Employees can view their own assessments

---

## Database Schema Design

### 1. Competency Framework Sources (Google Sheets URLs)

```prisma
model CompetencyFrameworkSource {
  id                String   @id @default(uuid())
  type              String   // "DEPARTMENT", "AI", "VALUES"
  name              String   // "Engineering", "Sales", "AI Framework", "PRESS Values"
  department        String?  // For DEPARTMENT type only

  // Google Sheets integration
  sheetUrl          String   // Full Google Sheets URL
  sheetId           String   // Extracted sheet ID
  gidOrTabName      String?  // Specific tab/gid if multi-tab sheet

  // Sync metadata
  lastSyncedAt      DateTime?
  lastSyncStatus    String?  // "SUCCESS", "FAILED", "PENDING"
  lastSyncError     String?  @db.Text
  cacheValidUntil   DateTime? // Cache expiry (30 days from last sync)
  syncedByUserId    String?

  // Structure metadata (stored from sheet)
  columnMapping     Json?    // Map column letters to data types
  levelNames        Json     // ["Basic", "Intermediate", "Proficient", "Advanced"]

  isActive          Boolean  @default(true)

  // Relations
  coreCompetencies  CoreCompetency[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([type, department])
  @@index([type])
  @@index([lastSyncedAt])
}
```

### 2. Core Competencies (High-level areas)

```prisma
model CoreCompetency {
  id                String   @id @default(uuid())
  sourceId          String
  source            CompetencyFrameworkSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  name              String   // e.g., "Employee Experience", "AI Tool Proficiency"
  description       String?  @db.Text
  functionArea      String?  // e.g., "People Operations" (from sheet column A/B)
  category          String?  // Grouping category

  sortOrder         Int      @default(0)

  // Relations
  subCompetencies   SubCompetency[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([sourceId])
  @@index([sortOrder])
}
```

### 3. Sub-Competencies (Specific skills with level descriptions)

```prisma
model SubCompetency {
  id                String   @id @default(uuid())
  coreCompetencyId  String
  coreCompetency    CoreCompetency @relation(fields: [coreCompetencyId], references: [id], onDelete: Cascade)

  name              String   // e.g., "Employee engagement approaches"
  description       String?  @db.Text

  // Level descriptions (from Google Sheets columns E-H)
  levelDescriptions Json     // { "1": "Is familiar with...", "2": "Is able to...", "3": "Can oversee...", "4": "Has a solid..." }

  // For AI competencies with behavioral indicators
  hasBehavioralIndicators Boolean @default(false)
  behavioralIndicators    Json?   // { "1": ["Can open ChatGPT"], "2": ["Uses AI tools without prompting"], ... }

  sortOrder         Int      @default(0)
  isActive          Boolean  @default(true)

  // Relations
  candidateScores   CandidateCompetencyScore[]
  employeeAssessments EmployeeCompetencyScore[]
  jobRequirements   JobCompetencyRequirement[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([coreCompetencyId, sortOrder])
  @@index([isActive])
}
```

### 4. Job Competency Requirements (What's needed for a role)

```prisma
model JobCompetencyRequirement {
  id                String   @id @default(uuid())
  jobId             String
  job               Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  subCompetencyId   String
  subCompetency     SubCompetency @relation(fields: [subCompetencyId], references: [id], onDelete: Cascade)

  // What level is required for this role?
  requiredLevel     Int      // 1-4 (or 0-4 for AI)
  requiredLevelName String   // "Basic", "Intermediate", "Proficient", "Advanced"

  // Which interview stage should validate this?
  validationStage   String?  // "HR_SCREEN", "TECHNICAL", "PANEL", etc.
  priority          String   @default("MEDIUM") // "CRITICAL", "HIGH", "MEDIUM", "LOW"

  // Is this a must-have or nice-to-have?
  isRequired        Boolean  @default(true)

  createdAt         DateTime @default(now())

  @@unique([jobId, subCompetencyId])
  @@index([jobId])
  @@index([subCompetencyId])
  @@index([validationStage])
}
```

### 5. Candidate Competency Scores (Evaluation during interviews)

```prisma
model CandidateCompetencyScore {
  id                String   @id @default(uuid())
  candidateId       String
  candidate         JobCandidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  subCompetencyId   String
  subCompetency     SubCompetency @relation(fields: [subCompetencyId], references: [id], onDelete: Cascade)

  // Score (1-4 scale matching Basic/Intermediate/Proficient/Advanced)
  score             Int      // 1, 2, 3, or 4
  scoreLevelName    String   // "Basic", "Intermediate", "Proficient", "Advanced"

  // Evidence and notes
  evidence          String?  @db.Text
  evaluatorNotes    String?  @db.Text

  // For behavioral indicator tracking
  checkedIndicators Json?    // Array of indicator IDs that were checked

  // Context
  evaluatedAt       String?  // Which interview stage? "HR_SCREEN", "TECHNICAL", etc.
  interviewId       String?  // Link to specific interview if applicable

  // Who evaluated
  evaluatorId       String?
  evaluatorName     String?
  evaluatorEmail    String?

  // Confidence
  confidence        String   @default("MEDIUM") // "LOW", "MEDIUM", "HIGH"

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([candidateId, subCompetencyId, evaluatedAt]) // One score per competency per stage
  @@index([candidateId])
  @@index([subCompetencyId])
  @@index([evaluatedAt])
}
```

### 6. Employee Competency Assessments (Performance reviews)

```prisma
model EmployeeCompetencyScore {
  id                String   @id @default(uuid())
  employeeId        String
  employee          Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  subCompetencyId   String
  subCompetency     SubCompetency @relation(fields: [subCompetencyId], references: [id], onDelete: Cascade)

  // Current level
  currentLevel      Int      // 1-4
  currentLevelName  String   // "Basic", "Intermediate", "Proficient", "Advanced"

  // Target level (for development planning)
  targetLevel       Int?
  targetLevelName   String?

  // Progress tracking
  lastAssessedAt    DateTime
  nextAssessmentDue DateTime?

  // Context
  assessmentPeriod  String?  // "Q1 2025", "Annual Review 2024"
  assessorId        String?  // Manager who assessed
  assessorName      String?

  // Notes and development plan
  strengths         String?  @db.Text
  areasForGrowth    String?  @db.Text
  developmentPlan   String?  @db.Text

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([employeeId, subCompetencyId, assessmentPeriod])
  @@index([employeeId])
  @@index([subCompetencyId])
  @@index([lastAssessedAt])
}
```

### 7. Competency Sync Logs (Track sync history)

```prisma
model CompetencySyncLog {
  id                String   @id @default(uuid())
  sourceId          String

  status            String   // "SUCCESS", "FAILED", "PARTIAL"
  recordsSynced     Int      @default(0)
  recordsFailed     Int      @default(0)

  errorMessage      String?  @db.Text
  syncDetails       Json?    // Detailed log of what was synced

  triggeredBy       String?  // User ID who triggered sync
  syncDuration      Int?     // Milliseconds

  createdAt         DateTime @default(now())

  @@index([sourceId, createdAt])
  @@index([status])
}
```

---

## Update Existing Models

### Add to Job model:
```prisma
// In Job model, add:
competencyRequirements JobCompetencyRequirement[]
```

### Add to JobCandidate model:
```prisma
// In JobCandidate model, add:
competencyScores CandidateCompetencyScore[]

// Add computed fields for aggregated competency tracking
competencyProgress Json?  // { validated: 12, total: 20, missingCritical: ["Leadership", "System Design"] }
```

### Add to Employee model:
```prisma
// In Employee model, add:
competencyAssessments EmployeeCompetencyScore[]
```

---

## Implementation Phases

### Phase 1: Database & Sync Foundation (Week 1)
1. **Schema Migration**
   - Create new competency models
   - Migrate existing simple `Competency` data to new structure
   - Add relations to Job, JobCandidate, Employee

2. **Google Sheets Parser**
   - Build parser for departmental competency format
   - Build parser for AI competency format (with checkboxes)
   - Build parser for Values competency format
   - Handle different column structures per type

3. **Sync Service**
   - tRPC endpoint: `competency.syncFromSheet(sourceId)`
   - Automatic cache invalidation (30 days)
   - Manual refresh capability
   - Background job for scheduled syncs

### Phase 2: Admin UI (Week 2)
1. **Framework Management Page** (`/hiring/settings/competency-framework`)
   - List all competency sources (Department, AI, Values)
   - Add/edit Google Sheet URLs
   - Trigger manual sync
   - View sync history and status
   - Preview synced data

2. **Competency Browser**
   - View all competencies by type
   - Search and filter
   - See level descriptions
   - View which jobs use each competency

### Phase 3: Job Integration (Week 3)
1. **Job Creation/Editing**
   - Select relevant competencies for the role
   - Set required levels (1-4)
   - Assign competencies to interview stages
   - Mark critical vs nice-to-have

2. **JD Generation Enhancement**
   - Auto-populate JD with required competencies
   - Show level expectations
   - Format as "Requirements" section

### Phase 4: Candidate Evaluation (Week 4)
1. **Interview Scorecard Enhancement**
   - Show competencies to validate at each stage
   - Score sub-competencies (1-4)
   - Add evidence and notes
   - Track behavioral indicators for AI competencies

2. **Candidate Profile Enhancement**
   - New "Competencies" tab
   - Show all scored competencies
   - Progress tracker: validated vs remaining
   - Highlight gaps in critical competencies

3. **AI Analysis Integration**
   - Analyze resume/application for competency signals
   - Pre-populate competency scores from AI
   - Suggest questions to validate gaps

### Phase 5: Employee Performance (Week 5)
1. **Performance Review Module**
   - Competency assessment workflow
   - Manager scores employee on relevant competencies
   - Track progress over time
   - Development planning

2. **Employee Self-View**
   - View own competency scores
   - See gap analysis
   - Career progression roadmap
   - Development resources

### Phase 6: Reporting & Analytics (Week 6)
1. **Competency Analytics Dashboard**
   - Hiring: Competency distribution across candidates
   - Performance: Team competency heatmap
   - Gaps: Organization-wide skill gaps
   - Trends: Competency improvement over time

---

## API Endpoints (tRPC)

```typescript
// Competency Framework Management
competencyFramework.listSources() // List all sheet sources
competencyFramework.addSource({ type, name, sheetUrl, ... })
competencyFramework.updateSource({ id, ... })
competencyFramework.syncSource({ id }) // Trigger sync
competencyFramework.getSyncStatus({ id })
competencyFramework.getSyncHistory({ id })

// Competency Data
competency.getBySource({ sourceId }) // Get all competencies for a source
competency.getByDepartment({ department }) // Department-specific
competency.getAICompetencies() // AI framework
competency.getValuesCompetencies() // Company values
competency.search({ query, type, department })

// Job Competencies
job.getRequiredCompetencies({ jobId })
job.setCompetencyRequirements({ jobId, requirements: [...] })

// Candidate Evaluation
candidate.scoreCompetency({ candidateId, subCompetencyId, score, stage, ... })
candidate.getCompetencyScores({ candidateId })
candidate.getCompetencyProgress({ candidateId }) // % validated
candidate.getMissingCompetencies({ candidateId })

// Employee Assessment
employee.assessCompetencies({ employeeId, assessmentPeriod, scores: [...] })
employee.getCompetencyScores({ employeeId, period? })
employee.getCompetencyGaps({ employeeId })
employee.getCareerProgression({ employeeId })
```

---

## Google Sheets Sync Strategy

### Sync Process:
1. **Fetch Sheet Data**: Use Google Sheets API (read-only, no auth needed for public sheets)
2. **Parse Structure**: Detect column types based on headers
3. **Extract Competencies**:
   - Parse Function → Core Competency → Sub-competencies
   - Extract level descriptions (columns E-H)
   - Handle behavioral indicators for AI sheet
4. **Store in Database**: Upsert all competencies
5. **Set Cache Expiry**: `cacheValidUntil = now() + 30 days`
6. **Log Results**: Create `CompetencySyncLog` entry

### Parser Examples:

**Departmental Sheet:**
```typescript
// Column A: Function (e.g., "People Operations")
// Column B: Function Objective
// Column C: Core Competency (e.g., "Employee Experience")
// Column D: Sub-competency (e.g., "Employee engagement approaches")
// Column E-H: Level descriptions (Basic, Intermediate, Proficient, Advanced)

{
  coreCompetency: "Employee Experience",
  subCompetencies: [
    {
      name: "Employee engagement approaches",
      levelDescriptions: {
        "1": "Is familiar with common engagement strategies...",
        "2": "Is able to assist in collecting data...",
        "3": "Can oversee the execution...",
        "4": "Has a solid engagement strategy..."
      }
    }
  ]
}
```

**AI Sheet:**
```typescript
// Column A: Competency
// Column B: 0. Unacceptable
// Column C: 1. Basic (with checkboxes)
// Column D: 2. Intermediate (with checkboxes)
// Column E: 3. Proficient (with checkboxes)
// Column F: 4. Advanced (with checkboxes)

{
  coreCompetency: "AI Proficiency",
  subCompetencies: [
    {
      name: "AI Tool Proficiency (Claude, ChatGPT, Curacel, etc.)",
      hasBehavioralIndicators: true,
      levelDescriptions: {
        "0": "Never attempts to use available AI tools despite repeated training or prompts",
        "1": "Aware of AI tools, can use with support",
        "2": "Applies AI independently to daily workflows",
        "3": "Regularly uses AI to save hours weekly",
        "4": "Builds or curates team-wide prompt libraries"
      },
      behavioralIndicators: {
        "1": ["Can open and use ChatGPT, Curacel-specific AI tools"],
        "2": ["Uses AI tools without prompting", "Enhances personal productivity"],
        "3": ["Regularly uses AI to save hours weekly"],
        "4": ["Builds or curates team-wide prompt libraries", "Designs semi-automated processes"]
      }
    }
  ]
}
```

---

## UI Component Structure

### 1. Competency Framework Settings Page
```
/hiring/settings/competency-framework

├── Overview Cards
│   ├── Department Frameworks (8 departments)
│   ├── AI Framework (synced ✓)
│   └── Values Framework (synced ✓)
│
├── Source List
│   ├── Engineering (last synced: 2 days ago) [Sync Now] [View] [Edit]
│   ├── Sales (last synced: 5 days ago) [Sync Now] [View] [Edit]
│   ├── AI Framework (last synced: 1 day ago) [Sync Now] [View] [Edit]
│   └── PRESS Values (last synced: 10 days ago) [Sync Now] [View] [Edit]
│
└── Actions
    └── [+ Add New Framework Source]
```

### 2. Job Competency Selection
```
/hiring/positions/new or /hiring/positions/[id]/edit

├── Basic Info (existing)
│
└── Competencies Tab (NEW)
    ├── Department Competencies (auto-selected based on job.department)
    │   └── For each core competency:
    │       ├── [✓] Employee Experience
    │       │   ├── [✓] Employee engagement (Required Level: Intermediate, Stage: HR_SCREEN)
    │       │   └── [✓] Onboarding (Required Level: Proficient, Stage: PANEL)
    │
    ├── AI Competencies
    │   └── [✓] AI Tool Proficiency (Required Level: Basic, Stage: HR_SCREEN)
    │
    └── Values Competencies
        └── [✓] Passionate (Required Level: Proficient, Stage: CEO_CHAT)
```

### 3. Interview Scorecard
```
/hiring/interviews/[id]/score

├── Interview Info
│   └── Stage: Technical Interview
│
├── Competencies to Validate (from job requirements)
│   ├── System Design (Target: Proficient)
│   │   ├── Score: [1] [2] [3] [4]
│   │   ├── Evidence: [textarea]
│   │   └── Confidence: [Low] [Medium] [High]
│   │
│   └── Problem Solving (Target: Advanced)
│       ├── Score: [1] [2] [3] [4]
│       ├── Evidence: [textarea]
│       └── Confidence: [Low] [Medium] [High]
│
└── Additional Competencies (optional)
    └── [+ Add competency score]
```

### 4. Candidate Competency View
```
/hiring/candidates/[id] → Competencies Tab (NEW)

├── Progress Overview
│   ├── 12/20 competencies validated
│   ├── 3 critical gaps: ["Leadership", "System Design", "AI Proficiency"]
│   └── Roadmap: Next stage should validate [X, Y, Z]
│
├── Competency Matrix
│   ├── Core Competency: Employee Experience
│   │   ├── Sub: Employee engagement | Score: 3 (Proficient) ✓ | Validated: HR_SCREEN
│   │   ├── Sub: Onboarding | Score: 2 (Intermediate) ⚠️ | Validated: PANEL | Gap: Need Proficient
│   │   └── Sub: Worker experience | Not yet validated
│   │
│   └── Core Competency: AI Proficiency
│       └── Sub: AI Tool Proficiency | Score: 2 (Intermediate) ✓ | Validated: TECHNICAL
│
└── Filters
    └── [All] [Validated] [Gaps] [Not Validated] [Critical Only]
```

### 5. Employee Performance Review
```
/employees/[id]/performance/competencies

├── Current Assessment (Q1 2025)
│   ├── Core Competency: Employee Experience
│   │   ├── Employee engagement | Current: 3 → Target: 4 | Progress: On Track
│   │   └── Onboarding | Current: 4 | Target: 4 | Progress: Mastered
│   │
│   └── Core Competency: AI Proficiency
│       └── AI Tool Proficiency | Current: 2 → Target: 3 | Progress: Developing
│
├── Historical Progress
│   └── [Chart showing competency scores over time]
│
└── Development Plan
    └── For each gap, show resources and timeline
```

---

## Migration Strategy

### Step 1: Create New Schema (Non-breaking)
- Add new models alongside existing `Competency`
- Don't delete old model yet

### Step 2: Seed Initial Data
```typescript
// scripts/seed-competency-framework.ts
const sources = [
  {
    type: "DEPARTMENT",
    name: "Engineering",
    department: "Engineering",
    sheetUrl: "https://docs.google.com/spreadsheets/d/...",
    sheetId: "...",
    gidOrTabName: "Engineering"
  },
  // ... repeat for all 8 departments
  {
    type: "AI",
    name: "AI Framework",
    sheetUrl: "https://docs.google.com/spreadsheets/d/1DITx0M4bBNYxJCBHVHiUcxN3Ug11DIdEdFFzy5lIyF0/...",
    sheetId: "1DITx0M4bBNYxJCBHVHiUcxN3Ug11DIdEdFFzy5lIyF0",
    levelNames: ["Unacceptable", "Basic", "Intermediate", "Proficient", "Advanced"]
  },
  {
    type: "VALUES",
    name: "PRESS Values",
    sheetUrl: "...",
    // TODO: Get actual Values sheet URL from user
  }
];

// Sync all sources
for (const source of sources) {
  await syncCompetencyFramework(source);
}
```

### Step 3: Gradual Rollout
1. Launch framework management UI first (read-only)
2. Add job competency selection (opt-in)
3. Enable candidate scoring (new candidates only)
4. Migrate old data gradually
5. Deprecate old `Competency` model after 100% migration

---

## Best Practices from Industry Leaders

### 1. **Radford/Aon/Mercer Model** (Competency Framework Standards)
- Multi-level proficiency scales (typically 3-5 levels)
- Behavioral indicators at each level
- Role-based competency profiles
✅ **We're adopting this** with our 4-level + behavioral indicators approach

### 2. **Google's Competency Model**
- Separate technical and behavioral competencies
- Laddered progression (L3 → L4 → L5 → L6)
- Clear behavioral indicators
✅ **We're implementing this** via separate Department/AI/Values types

### 3. **Lattice/15Five Approach** (Performance Platforms)
- Employee visibility into their own scores
- Manager-employee collaborative assessment
- Development planning tied to competencies
✅ **We'll build this** in Phase 5

### 4. **Greenhouse/Lever Best Practices** (ATS Platforms)
- Competency-based scorecards for interviews
- Track which stage validates which competency
- Aggregate scores across interviews
✅ **We're doing this** in Phase 4

---

## Questions for Final Confirmation

Before I start implementation, please confirm:

1. **Values Sheet**: Do you have the Google Sheets URL for PRESS Values? Or should I create a template?

2. **All Department Sheets**: Are all 8 department competency sheets in the same format as People Ops? (Function → Core → Sub → 4 Levels)

3. **Sync Trigger**: Should sync happen:
   - Manual only (button in UI)
   - Automatic on first access if cache expired
   - Both?

4. **Priority**: Which phases are most urgent?
   - Phase 1-2 (Foundation + Admin UI)
   - Phase 3-4 (Job + Candidate evaluation)
   - Phase 5 (Employee performance)

Ready to start implementation once you confirm! 🚀
