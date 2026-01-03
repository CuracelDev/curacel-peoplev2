# Competency Framework Sheets - Structure Analysis

## Summary of All Sheets

Based on analysis of all 10 competency sheets, here are the variations:

---

## Format Categories

### Category 1: Standard Competency Matrix (4 Levels)
**Departments**: People Ops, Sales, Finance, Product, Marketing, Success

**Structure**:
- Column A: Function
- Column B: Function Objective
- Column C: Core Competencies
- Column D: Sub competencies
- Columns E-H: 4 Proficiency Levels
  - E: **Basic**
  - F: **Intermediate**
  - G: **Proficient**
  - H: **Advanced**

**Sheet URLs**:
- People Ops: https://docs.google.com/spreadsheets/d/1uRtuyNmNLDyj2B-YfvI3meCOKmHhFJO-UCGj6p_3TxU/edit
- Sales: https://docs.google.com/spreadsheets/d/1aHRxw93YlHABRWWv2rkyaoAdMejQQhVsYLVg1fT_0Fk/edit
- Finance: https://docs.google.com/spreadsheets/d/1J-y9IQhL2vnDOApAOspqqYehS3exd0pzLlc5DPjw4iE/edit
- Product: https://docs.google.com/spreadsheets/d/1QrJFCasTNu-fxqqLwtwiOIlRcnbLE6XSn6rjw01KNm8/edit
- Marketing: https://docs.google.com/spreadsheets/d/1OdZjShRi5KzDznGLVpnJgPHJRgp4Ny2rSMKucRIAmgo/edit
- Success: https://docs.google.com/spreadsheets/d/1Pg4qCih97V0VMBTfUmUdmlJXqXiiK6Ao-2q2o5cjvb8/edit

---

### Category 2: Extended Competency Matrix (5 Levels)
**Departments**: HealthOps

**Structure**:
- Column A: Function
- Column B: Function Objective
- Column C: Core Competencies
- Column D: Sub competencies
- Columns E-I: 5 Proficiency Levels
  - E: **Basic**
  - F: **Intermediate**
  - G: **Proficient**
  - H: **Advanced**
  - I: **Expert** ⭐ (Additional level)

**Sheet URL**:
- HealthOps: https://docs.google.com/spreadsheets/d/19_77KwliVcoWIaoggpCn-Ddw--EfXRSNNBwsVi4fXII/edit

**Key Difference**: Has an extra "Expert" level beyond Advanced for senior/leadership roles.

---

### Category 3: Role Ladder / Career Progression
**Departments**: Engineering (Tech)

**Structure**: COMPLETELY DIFFERENT FORMAT
- Column A: **Title** (e.g., "Associate Software Engineer", "Software Engineer", "Senior Software Engineer")
- Column B: **Responsibility** (what the role does)
- Column C: **Reports to** (reporting structure)
- Column D: **Grade Level** (Entry Level, Mid-level Management, Senior-level Management)
- Column E: **Type of experience / Persona** (description of the person)
- Column F: **Years of Experience** (e.g., "0-2", "2-4", "3-5")
- Columns G+: Additional role attributes

**Sheet URL**:
- Engineering: https://docs.google.com/spreadsheets/d/1HZhOk8ujfkZftDmyx9SyBgF-v38iA0bhB2BnXw-n4Pc/edit

**Key Difference**:
- NOT a competency matrix
- It's a **role/title progression ladder**
- Shows career levels (Associate → Mid → Senior → Lead → Principal)
- No competency-level descriptions
- Focus is on role definitions, not skills

**Recommendation**: Handle Engineering separately or ask user if they want to migrate Engineering to the standard competency format.

---

### Category 4: AI Competency Framework (Behavioral Indicators)
**Type**: AI

**Structure**:
- Column A: **Competency** name
- Column B: **0. Unacceptable** - Description of poor performance
- Columns C-G: Levels 1-4 with **behavioral checkboxes**
  - C: **1. Basic** - Behavioral indicators (checkboxes)
  - D: **2. Intermediate** - Behavioral indicators (checkboxes)
  - E: **3. Proficient** - Behavioral indicators (checkboxes)
  - F: **4. Advanced** - Behavioral indicators (checkboxes)

**Sheet URL**:
- AI Framework: https://docs.google.com/spreadsheets/d/1DITx0M4bBNYxJCBHVHiUcxN3Ug11DIdEdFFzy5lIyF0/edit

**Key Features**:
- Has "0. Unacceptable" as a baseline negative level
- Each level has **multiple behavioral indicators** with checkboxes
- Example: "AI Tool Proficiency" → Level 2 has checkboxes for:
  - ☑ "Uses AI tools without prompting"
  - ☑ "Enhances personal productivity"
  - etc.

**Scoring Method**: Check off which behaviors the person demonstrates → that determines their level.

---

### Category 5: Company Values (3 Levels)
**Type**: Values

**Structure**:
- Column A: **Values** (e.g., "Passionate Work")
- Column B: **Value Definition** (detailed description)
- Column C: **Competency** (e.g., "Enjoyment", "Drive", "Exceed Expectations")
- Column D: **Definitions** (what the competency means)
- Columns E-G: **3 Proficiency Levels ONLY**
  - E: **1. Basic** - displays awareness, no ability to perform
  - F: **2. Intermediate** - performs with visible gaps, which improve with supervision
  - G: **3. Proficient** - developed in proficiency, independently visible

**Sheet URL**:
- Company Values: https://docs.google.com/spreadsheets/d/1wwU0aAOMmitqaJXgzol_LKd5LCkAaTn6uRyp6m4D_lY/edit

**Key Features**:
- Only 3 levels (no "Advanced" level)
- Tied to PRESS values framework
- Universal across all roles (not department-specific)
- Focus on behaviors and mindsets, not technical skills

---

## Data Model Implications

### Flexible Schema Requirements

Our database schema needs to handle:

1. **Variable number of levels** (3, 4, or 5 levels)
   - Solution: Store levels as JSON array in `CompetencyFrameworkSource.levelNames`
   - Example: `["Basic", "Intermediate", "Proficient"]` or `["Basic", "Intermediate", "Proficient", "Advanced", "Expert"]`

2. **Behavioral indicators vs descriptions**
   - Category 1, 2, 5: Simple text descriptions per level
   - Category 4 (AI): Behavioral checkboxes
   - Solution: `SubCompetency.hasBehavioralIndicators` boolean + `SubCompetency.behavioralIndicators` JSON

3. **Different structural formats**
   - Most: Function → Core Competency → Sub-competency
   - Values: Value → Competency → Definitions
   - Engineering: Role ladder (different purpose entirely)
   - Solution: Flexible parser that detects format from column headers

4. **Zero-based vs one-based levels**
   - Most departments: Levels 1-4 or 1-5
   - AI: Levels 0-4 (with "0 = Unacceptable")
   - Solution: Store both numeric score and level name

---

## Recommended Sync Strategy

### Phase 1: Core Formats (Weeks 1-2)
1. Implement parser for **Standard 4-level** (People Ops, Sales, Finance, Product, Marketing, Success)
2. Implement parser for **AI behavioral indicators** (AI Framework)
3. Implement parser for **Values 3-level** (Company Values)

### Phase 2: Extended Support (Week 3)
4. Add support for **5-level variant** (HealthOps)

### Phase 3: Engineering Decision (Week 4)
5. **Decision needed from user**:
   - Option A: Skip Engineering sheet (it's role ladder, not competencies)
   - Option B: Migrate Engineering to competency format
   - Option C: Build separate "Role Ladder" feature

---

## Parser Implementation Approach

```typescript
// Detect sheet type from column headers
function detectSheetType(headers: string[]): SheetType {
  if (headers.includes('Title') && headers.includes('Grade Level')) {
    return 'ROLE_LADDER'
  }

  if (headers.includes('0. Unacceptable')) {
    return 'AI_BEHAVIORAL'
  }

  if (headers.includes('Values') && headers.includes('Value Definition')) {
    return 'VALUES'
  }

  if (headers.includes('Function') && headers.includes('Core Competencies')) {
    // Check for Expert column to detect 5-level variant
    if (headers.includes('Expert')) {
      return 'COMPETENCY_5_LEVEL'
    }
    return 'COMPETENCY_4_LEVEL'
  }

  throw new Error('Unknown sheet format')
}

// Dynamic level detection
function extractLevels(headers: string[]): string[] {
  const levelHeaders = headers.slice(4) // Columns E onwards
  return levelHeaders.filter(h =>
    h.includes('Basic') ||
    h.includes('Intermediate') ||
    h.includes('Proficient') ||
    h.includes('Advanced') ||
    h.includes('Expert')
  )
}
```

---

## Scoring System Standardization

Despite different numbers of levels, we'll normalize to a common scoring system for comparisons:

### Normalized Score Mapping

**4-level departments** (1-4):
- Basic (1) → 25%
- Intermediate (2) → 50%
- Proficient (3) → 75%
- Advanced (4) → 100%

**5-level departments** (1-5):
- Basic (1) → 20%
- Intermediate (2) → 40%
- Proficient (3) → 60%
- Advanced (4) → 80%
- Expert (5) → 100%

**3-level (Values)** (1-3):
- Basic (1) → 33%
- Intermediate (2) → 67%
- Proficient (3) → 100%

**AI (0-4)**:
- Unacceptable (0) → 0%
- Basic (1) → 25%
- Intermediate (2) → 50%
- Proficient (3) → 75%
- Advanced (4) → 100%

This allows cross-department comparison and aggregation.

---

## Updated Database Schema

```prisma
model CompetencyFrameworkSource {
  // ... existing fields ...

  // NEW: Store detected format type
  formatType        String   // "COMPETENCY_4_LEVEL", "COMPETENCY_5_LEVEL", "AI_BEHAVIORAL", "VALUES", "ROLE_LADDER"

  // Store level configuration
  levelNames        Json     // ["Basic", "Intermediate", "Proficient", "Advanced"] or ["Basic", "Intermediate", "Proficient", "Advanced", "Expert"]
  minLevel          Int      // 0 for AI, 1 for others
  maxLevel          Int      // 3, 4, or 5

  // Column mapping for parser
  columnMapping     Json?    // { "function": "A", "coreCompetency": "C", "subCompetency": "D", "levelStart": "E" }
}

model SubCompetency {
  // ... existing fields ...

  // Store both numeric and named levels
  levelDescriptions Json     // { "1": "text", "2": "text", ... } OR { "basic": "text", "intermediate": "text", ... }

  // For behavioral indicators (AI sheet)
  hasBehavioralIndicators Boolean @default(false)
  behavioralIndicators    Json?   // { "1": ["indicator1", "indicator2"], "2": [...], ... }
}

model CandidateCompetencyScore {
  // ... existing fields ...

  // Store both raw score and normalized score
  rawScore          Int      // Actual level from sheet (0-5 depending on framework)
  normalizedScore   Float    // 0-100 for cross-framework comparison
  scoreLevelName    String   // "Basic", "Intermediate", "Proficient", "Advanced", "Expert"
}
```

---

## Implementation Priority

1. ✅ **Category 1** (Standard 4-level): 6 departments - HIGHEST PRIORITY
2. ✅ **Category 4** (AI): Critical for AI-first strategy
3. ✅ **Category 5** (Values): Universal, needed for culture fit
4. ⚠️ **Category 2** (HealthOps 5-level): Low priority, only 1 dept, minor variation
5. ❓ **Category 3** (Engineering Role Ladder): Needs user decision

---

## Questions for User

1. **Engineering Sheet**: This is a role ladder, not a competency matrix. Should we:
   - A) Skip it entirely (not part of competency framework)
   - B) Build a separate "Role Ladder" feature
   - C) Ask Engineering to migrate to competency format
   - D) Manually map it to competencies

2. **Normalization**: Do you want to see normalized scores (0-100%) across all frameworks, or keep raw scores (1-4, 1-5, etc.)?

3. **Missing Sheets**: I analyzed 7 departments. Do Finance, Product, Marketing, Success really follow the standard 4-level format? (I didn't open them yet)

---

## Next Steps

1. Build flexible parser that detects format type
2. Implement parsers for:
   - Standard 4-level competency matrix
   - AI behavioral indicators
   - Values 3-level framework
3. Test with People Ops, AI, and Values sheets first
4. Add HealthOps 5-level support
5. Get user decision on Engineering
