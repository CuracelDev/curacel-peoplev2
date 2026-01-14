# Data Migration Plan: Old System → PeopleOS

## Overview

This document outlines the migration strategy for importing data from the legacy system export (`organization_extract.zip`) into the PeopleOS database.

### Source Data Files

| File | Format | Records | Description |
|------|--------|---------|-------------|
| `organizations.json` | JSON | 1 | Organization (Curacel) |
| `people.json` | JSON | ~100+ | Basic person records |
| `employees.json` | CSV | ~100+ | Employee-organization links |
| `employments.json` | CSV | ~100+ | Employment details (title, dates) |
| `profiles.json` | JSON | ~100+ | Personal info, bank details |
| `candidates.json` | CSV | ~57 | Candidate records |
| `emergency_contacts.json` | JSON | ~31 | Emergency contact info |
| `contract_offers.json` | CSV | ~100+ | Contract/offer records |
| `provisioned_accounts.json` | CSV | ~100+ | Google Workspace accounts |
| `invitations.json` | CSV | ~50 | User invitations |
| `legal_entities.json` | CSV | ~100+ | Legal entities (duplicates) |

---

## Migration Steps

### Phase 1: Data Preparation

#### 1.1 Clean and Deduplicate Source Data

**Legal Entities**: The source has many duplicate entries - deduplicate to single entity per unique (name, country) combination.

**People/Employees**: Link `employees.csv` → `people.json` via `person_id`.

**Status Mapping** (employees.status):
- `0` → ACTIVE
- `2` → EXITED

**Employment Type Mapping** (employments.employment_type):
- `0` → FULL_TIME
- `1` → CONTRACTOR
- `2` → INTERN

**Gender Mapping** (profiles.gender):
- `0` → Male
- `1` → Female

**Marital Status Mapping** (profiles.marital_status):
- `0` → Single

**Emergency Contact Relationship Mapping**:
- `0` → Father
- `1` → Mother
- `3` → Sibling/Other
- `4` → Friend
- `5` → Other

---

### Phase 2: Schema Mapping

#### 2.1 Organization (1:1 mapping)

| Source (organizations.json) | Target (Organization) |
|-----------------------------|----------------------|
| `id` | Generate new UUID |
| `name` | `name` |
| `tagline` | `oneSentenceDescription` |
| - | Other fields: populate with defaults |

#### 2.2 Employee (Complex mapping)

Combines data from: `people.json` + `employees.csv` + `employments.csv` + `profiles.json`

| Source Fields | Target (Employee) |
|---------------|-------------------|
| `people.first_name + middle_name + last_name` | `fullName` |
| `people.email` | `personalEmail` |
| `employees.work_email` | `workEmail` |
| `employees.status` (mapped) | `status` |
| `employments.title` | `jobTitle` |
| `employments.employment_type` (mapped) | `employmentType` |
| `employments.start_date` | `startDate` |
| `employments.end_date` | `endDate` |
| `employments.probation_end_date` | `probationEndDate` |
| `profiles.phone_number` | `phone` |
| `profiles.dob` | `dateOfBirth` |
| `profiles.gender` (mapped) | `gender` |
| `profiles.marital_status` (mapped) | `maritalStatus` |
| `profiles.nationality` | `nationality` |
| `profiles.address` | `addressStreet` |
| `profiles.country` | `addressCountry` |
| `profiles.post_code` | `addressPostal` |
| `profiles.bank_name` | `bankName` |
| `profiles.account_name` | `accountName` |
| `profiles.account_number` | `accountNumber` |
| `profiles.sort_code` | `accountSortCode` |
| `profiles.tax_id` | `taxId` |

**Manager Relationships**: Use `employees.manager_id` → lookup manager's new Employee ID after initial import.

#### 2.3 Emergency Contacts

| Source (emergency_contacts.json) | Target (Employee fields) |
|---------------------------------|-------------------------|
| `name` | `emergencyContactName` |
| `phone` | `emergencyContactPhone` |
| `email` | `emergencyContactEmail` |
| `relationship` (mapped) | `emergencyContactRelation` |

**Note**: Link via `person_id` → find corresponding Employee record.

#### 2.4 Candidates (candidates.csv)

| Source | Target (JobCandidate) |
|--------|----------------------|
| `person_id` → people.email | `email` |
| `person_id` → people name | `fullName` |
| `linkedin` | `linkedInUrl` |
| `status` | Map to JobCandidateStatus |

**Candidate Status Mapping**:
- `1` → HIRED
- `2` → REJECTED
- `3` → IN_REVIEW (or ACTIVE)

#### 2.5 Users & Invitations

| Source (invitations.csv) | Target (User) |
|-------------------------|---------------|
| `email` | `email` |
| `role` (0) | `role` = EMPLOYEE |
| `accepted_at` (if set) | User exists, create User record |

**Action**: For accepted invitations, create User records linked to corresponding Employee.

#### 2.6 Provisioned Accounts (Google Workspace)

| Source (provisioned_accounts.csv) | Target (AppAccount) |
|----------------------------------|---------------------|
| `external_id` | `externalUserId` |
| `employee_id` | Link to Employee |
| `state` (0=ACTIVE, 2=DEPROVISIONED) | `status` |
| `account_created_at` | `provisionedAt` |
| `deprovisioned_at` | `deprovisionedAt` |

**Prerequisite**: Create Google Workspace `App` record first.

---

### Phase 3: Migration Order

Execute migrations in this order to satisfy foreign key constraints:

```
1. Organization
2. LegalEntity (deduplicated)
3. App (Google Workspace app record)
4. Employee (without manager_id)
5. Update Employee manager relationships
6. User (from accepted invitations)
7. Link User → Employee
8. AppAccount (Google Workspace accounts)
9. JobCandidate (optional, for hired candidates)
```

---

### Phase 4: Implementation

#### 4.1 Create Migration Script

Location: `prisma/migrations/seed-from-legacy.ts`

```typescript
// Pseudocode structure
async function migrateFromLegacy() {
  // 1. Load all source files
  const people = await loadJSON('people.json');
  const employees = await parseCSV('employees.json');
  const employments = await parseCSV('employments.json');
  const profiles = await loadJSON('profiles.json');
  const emergencyContacts = await loadJSON('emergency_contacts.json');
  const candidates = await parseCSV('candidates.json');
  const invitations = await parseCSV('invitations.json');
  const provisionedAccounts = await parseCSV('provisioned_accounts.json');

  // 2. Build lookup maps
  const peopleById = new Map(people.map(p => [p.id, p]));
  const profilesByPersonId = new Map(profiles.map(p => [p.person_id, p]));
  const emergencyByPersonId = new Map(emergencyContacts.map(e => [e.person_id, e]));

  // 3. Create Organization
  const org = await prisma.organization.create({...});

  // 4. Create Employees (first pass - no manager)
  const oldToNewEmployeeId = new Map();
  for (const emp of employees) {
    const person = peopleById.get(emp.person_id);
    const profile = profilesByPersonId.get(emp.person_id);
    const employment = employments.find(e => e.person_id === emp.person_id);
    const emergency = emergencyByPersonId.get(emp.person_id);

    const newEmployee = await prisma.employee.create({
      data: mapEmployeeData(person, emp, employment, profile, emergency)
    });
    oldToNewEmployeeId.set(emp.id, newEmployee.id);
  }

  // 5. Update manager relationships
  for (const emp of employees) {
    if (emp.manager_id) {
      const newManagerId = oldToNewEmployeeId.get(emp.manager_id);
      const newEmployeeId = oldToNewEmployeeId.get(emp.id);
      await prisma.employee.update({
        where: { id: newEmployeeId },
        data: { managerId: newManagerId }
      });
    }
  }

  // 6. Create Users from accepted invitations
  // 7. Create App & AppAccounts
}
```

#### 4.2 Field Transformation Functions

```typescript
function mapEmployeeStatus(sourceStatus: number): EmployeeStatus {
  switch(sourceStatus) {
    case 0: return 'ACTIVE';
    case 2: return 'EXITED';
    default: return 'ACTIVE';
  }
}

function mapEmploymentType(sourceType: number): EmploymentType {
  switch(sourceType) {
    case 0: return 'FULL_TIME';
    case 1: return 'CONTRACTOR';
    case 2: return 'INTERN';
    default: return 'FULL_TIME';
  }
}

function mapGender(sourceGender: string): string | null {
  switch(sourceGender) {
    case '0': return 'Male';
    case '1': return 'Female';
    default: return null;
  }
}

function mapRelationship(sourceRel: string): string {
  switch(sourceRel) {
    case '0': return 'Father';
    case '1': return 'Mother';
    case '3': return 'Sibling';
    case '4': return 'Friend';
    case '5': return 'Other';
    default: return 'Other';
  }
}
```

---

### Phase 5: Data Validation

#### Pre-Migration Checks

- [ ] All `person_id` references in employees exist in people.json
- [ ] All `manager_id` references exist as valid employee records
- [ ] Email addresses are unique
- [ ] Date formats are parseable

#### Post-Migration Validation

- [ ] Employee count matches source (accounting for discarded)
- [ ] Manager relationships are correct (spot check)
- [ ] User → Employee links are valid
- [ ] AppAccount → Employee links are valid

---

### Phase 6: Rollback Plan

```sql
-- If migration fails, truncate in reverse order:
TRUNCATE TABLE "AppAccount" CASCADE;
TRUNCATE TABLE "User" CASCADE;
TRUNCATE TABLE "Employee" CASCADE;
TRUNCATE TABLE "App" CASCADE;
TRUNCATE TABLE "LegalEntity" CASCADE;
TRUNCATE TABLE "Organization" CASCADE;
```

---

## Data Not Migrated

The following data will **not** be migrated (intentionally skipped):

1. **contract_offers** - Old contract system, new offers will be created fresh
2. **signature_blocks** - Will be recreated in new system
3. **messages** - Empty in source
4. **jobs/job_applications** - Minimal data, recreate fresh
5. **installed_applications** - App configuration differs

---

## Estimated Timeline

| Phase | Duration |
|-------|----------|
| Script Development | 2-3 hours |
| Local Testing | 1-2 hours |
| Staging Migration | 30 mins |
| Validation | 1 hour |
| Production Migration | 30 mins |
| Post-Migration Verification | 1 hour |
| **Total** | ~6-8 hours |

---

## Commands

```bash
# Run migration (after script is created)
npx ts-node prisma/migrations/seed-from-legacy.ts

# Or via npm script
npm run migrate:legacy
```

---

## Notes

1. **Duplicates**: Some employees appear multiple times with different employment records - use the most recent one (by `created_at`).

2. **Discarded Records**: Check `discarded_at` field - skip records where this is set.

3. **Missing Data**: Many profile fields are empty - this is expected and will be populated later by employees.

4. **Password Handling**: Users will need to use password reset flow after migration.
