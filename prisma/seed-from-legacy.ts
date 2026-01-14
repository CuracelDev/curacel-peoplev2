import { PrismaClient, EmployeeStatus, EmploymentType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

const EXTRACT_PATH = '/Users/henrymascot/Downloads/organization_extract';

function loadJSON<T>(filename: string): T {
  const filePath = path.join(EXTRACT_PATH, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function loadCSV<T>(filename: string): T[] {
  const filePath = path.join(EXTRACT_PATH, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
}

function mapEmployeeStatus(sourceStatus: string): EmployeeStatus {
  switch (sourceStatus) {
    case '0': return 'ACTIVE';
    case '2': return 'EXITED';
    default: return 'ACTIVE';
  }
}

function mapEmploymentType(sourceType: string): EmploymentType {
  switch (sourceType) {
    case '0': return 'FULL_TIME';
    case '1': return 'CONTRACTOR';
    case '2': return 'INTERN';
    default: return 'FULL_TIME';
  }
}

function mapGender(sourceGender: string): string | null {
  switch (sourceGender) {
    case '0': return 'Male';
    case '1': return 'Female';
    default: return null;
  }
}

function mapMaritalStatus(source: string): string | null {
  switch (source) {
    case '0': return 'Single';
    case '1': return 'Married';
    default: return null;
  }
}

function mapRelationship(sourceRel: string): string {
  switch (sourceRel) {
    case '0': return 'Father';
    case '1': return 'Mother';
    case '3': return 'Sibling';
    case '4': return 'Friend';
    case '5': return 'Other';
    default: return 'Other';
  }
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function buildFullName(firstName: string, middleName: string, lastName: string): string {
  return [firstName, middleName, lastName].filter(n => n && n.trim()).join(' ');
}

interface Person {
  id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
}

interface Employee {
  id: string;
  person_id: string;
  organization_id: string;
  role: string;
  status: string;
  manager_id: string;
  work_email: string;
  onboarded_at: string;
  offboarded_at: string;
  discarded_at: string;
  created_at: string;
}

interface Employment {
  id: string;
  person_id: string;
  employment_type: string;
  title: string;
  start_date: string;
  end_date: string;
  probation_end_date: string;
  discarded_at: string;
  created_at: string;
}

interface Profile {
  id: string;
  person_id: string;
  dob: string;
  marital_status: string;
  phone_number: string;
  address: string;
  gender: string;
  post_code: string;
  nationality: string;
  country: string;
  tax_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  sort_code: string;
  discarded_at: string;
}

interface EmergencyContactSource {
  id: string;
  person_id: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  discarded_at: string;
}

interface LegalEntitySource {
  id: string;
  organization_id: string;
  name: string;
  address: string;
  country: string;
  discarded_at: string;
}

interface Organization {
  id: string;
  name: string;
  tagline: string;
}

async function main() {
  console.log('Starting legacy data migration...\n');

  // Load all source data
  console.log('Loading source data files...');
  const organizations = loadJSON<Organization[]>('organizations.json');
  const people = loadJSON<Person[]>('people.json');
  const employees = loadCSV<Employee>('employees.json');
  const employments = loadCSV<Employment>('employments.json');
  const profiles = loadJSON<Profile[]>('profiles.json');
  const emergencyContacts = loadJSON<EmergencyContactSource[]>('emergency_contacts.json');
  const legalEntities = loadCSV<LegalEntitySource>('legal_entities.json');

  console.log(`  - Organizations: ${organizations.length}`);
  console.log(`  - People: ${people.length}`);
  console.log(`  - Employees: ${employees.length}`);
  console.log(`  - Employments: ${employments.length}`);
  console.log(`  - Profiles: ${profiles.length}`);
  console.log(`  - Emergency Contacts: ${emergencyContacts.length}`);
  console.log(`  - Legal Entities: ${legalEntities.length}`);

  // Build lookup maps
  const peopleById = new Map(people.map(p => [p.id, p]));
  const profilesByPersonId = new Map(profiles.map(p => [p.person_id, p]));
  const emergencyByPersonId = new Map<string, EmergencyContactSource[]>();
  for (const ec of emergencyContacts) {
    if (ec.discarded_at && ec.discarded_at.trim() !== '') continue;
    const existing = emergencyByPersonId.get(ec.person_id) || [];
    existing.push(ec);
    emergencyByPersonId.set(ec.person_id, existing);
  }

  // Group employments by person_id, pick most recent non-discarded
  const employmentsByPersonId = new Map<string, Employment>();
  const sortedEmployments = [...employments]
    .filter(e => !e.discarded_at || e.discarded_at.trim() === '')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  for (const emp of sortedEmployments) {
    if (!employmentsByPersonId.has(emp.person_id)) {
      employmentsByPersonId.set(emp.person_id, emp);
    }
  }

  // Check if organization already exists
  const sourceOrg = organizations[0];
  let org = await prisma.organization.findFirst({ where: { name: sourceOrg.name } });

  if (!org) {
    console.log('\nCreating organization...');
    org = await prisma.organization.create({
      data: {
        name: sourceOrg.name,
        oneSentenceDescription: sourceOrg.tagline,
      }
    });
    console.log(`  Created: ${org.name} (${org.id})`);
  } else {
    console.log(`\nOrganization already exists: ${org.name} (${org.id})`);
  }

  // Deduplicate and create legal entities
  console.log('\nProcessing legal entities...');
  const uniqueLegalEntities = new Map<string, LegalEntitySource>();
  for (const le of legalEntities) {
    if (le.discarded_at && le.discarded_at.trim() !== '') continue;
    const key = `${le.name}|${le.country}`;
    if (!uniqueLegalEntities.has(key)) {
      uniqueLegalEntities.set(key, le);
    }
  }

  for (const le of uniqueLegalEntities.values()) {
    const existing = await prisma.legalEntity.findFirst({
      where: { organizationId: org.id, name: le.name }
    });
    if (!existing) {
      await prisma.legalEntity.create({
        data: {
          organizationId: org.id,
          name: le.name,
          address: le.address || null,
          country: le.country || null,
        }
      });
      console.log(`  Created legal entity: ${le.name}`);
    }
  }

  // Filter employees: only non-discarded, deduplicate by person_id (take most recent)
  const employeesByPersonId = new Map<string, Employee>();
  const allEmployeeIdsByPersonId = new Map<string, string[]>();
  const sortedEmployees = [...employees]
    .filter(e => !e.discarded_at || e.discarded_at.trim() === '')
    .sort((a, b) => new Date(b.onboarded_at || b.created_at || '1970-01-01').getTime() -
                    new Date(a.onboarded_at || a.created_at || '1970-01-01').getTime());

  for (const emp of sortedEmployees) {
    // Track ALL employee IDs for each person (for manager mapping)
    const existingIds = allEmployeeIdsByPersonId.get(emp.person_id) || [];
    existingIds.push(emp.id);
    allEmployeeIdsByPersonId.set(emp.person_id, existingIds);

    if (!employeesByPersonId.has(emp.person_id)) {
      employeesByPersonId.set(emp.person_id, emp);
    }
  }

  // Create employees (first pass - without manager)
  console.log('\nCreating employees...');
  const oldToNewEmployeeId = new Map<string, string>();
  const personIdToNewEmployeeId = new Map<string, string>();
  let createdCount = 0;
  let skippedCount = 0;

  for (const [personId, emp] of employeesByPersonId) {
    const person = peopleById.get(personId);
    if (!person) {
      console.log(`  Skipping employee ${emp.id}: person not found`);
      skippedCount++;
      continue;
    }

    const profile = profilesByPersonId.get(personId);
    const employment = employmentsByPersonId.get(personId);

    const fullName = buildFullName(person.first_name, person.middle_name, person.last_name);
    const personalEmail = person.email;
    const workEmail = emp.work_email && emp.work_email.trim() !== '' ? emp.work_email : null;

    // Check if employee already exists by email
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        OR: [
          { personalEmail },
          ...(workEmail ? [{ workEmail }] : [])
        ]
      }
    });

    if (existingEmployee) {
      // Map ALL old employee IDs for this person to the existing employee ID
      const allOldIds = allEmployeeIdsByPersonId.get(personId) || [emp.id];
      for (const oldId of allOldIds) {
        oldToNewEmployeeId.set(oldId, existingEmployee.id);
      }
      personIdToNewEmployeeId.set(personId, existingEmployee.id);
      skippedCount++;
      continue;
    }

    try {
      const newEmployee = await prisma.employee.create({
        data: {
          fullName,
          personalEmail,
          workEmail,
          status: mapEmployeeStatus(emp.status),
          jobTitle: employment?.title || null,
          employmentType: mapEmploymentType(employment?.employment_type || '0'),
          startDate: parseDate(employment?.start_date),
          endDate: parseDate(employment?.end_date),
          probationEndDate: parseDate(employment?.probation_end_date),
          onboardedAt: parseDate(emp.onboarded_at),
          offboardedAt: parseDate(emp.offboarded_at),
          phone: profile?.phone_number || null,
          dateOfBirth: parseDate(profile?.dob),
          gender: mapGender(profile?.gender || ''),
          maritalStatus: mapMaritalStatus(profile?.marital_status || ''),
          nationality: profile?.nationality || null,
          addressStreet: profile?.address || null,
          addressCountry: profile?.country || null,
          addressPostal: profile?.post_code || null,
          bankName: profile?.bank_name || null,
          accountName: profile?.account_name || null,
          accountNumber: profile?.account_number || null,
          accountSortCode: profile?.sort_code || null,
          taxId: profile?.tax_id || null,
        }
      });

      // Map ALL old employee IDs for this person to the new employee ID
      const allOldIds = allEmployeeIdsByPersonId.get(personId) || [emp.id];
      for (const oldId of allOldIds) {
        oldToNewEmployeeId.set(oldId, newEmployee.id);
      }
      personIdToNewEmployeeId.set(personId, newEmployee.id);
      createdCount++;

      if (createdCount % 10 === 0) {
        console.log(`  Created ${createdCount} employees...`);
      }
    } catch (error) {
      console.log(`  Error creating employee ${fullName}: ${error}`);
      skippedCount++;
    }
  }

  console.log(`  Total created: ${createdCount}, skipped: ${skippedCount}`);

  // Update manager relationships - manager_id is actually person_id, not employee_id
  console.log('\nUpdating manager relationships...');
  let managerUpdates = 0;
  let withManagerId = 0;
  let managerNotFound = 0;

  for (const emp of sortedEmployees) {
    if (!emp.manager_id || emp.manager_id.trim() === '') continue;
    withManagerId++;

    const newEmployeeId = personIdToNewEmployeeId.get(emp.person_id);
    // manager_id is actually person_id in the source data
    const newManagerId = personIdToNewEmployeeId.get(emp.manager_id);

    if (!newManagerId) {
      managerNotFound++;
    }

    if (newEmployeeId && newManagerId && newEmployeeId !== newManagerId) {
      try {
        await prisma.employee.update({
          where: { id: newEmployeeId },
          data: { managerId: newManagerId }
        });
        managerUpdates++;
      } catch (error) {
        // Ignore errors
      }
    }
  }
  console.log(`  Employees with manager: ${withManagerId}, not found: ${managerNotFound}`);
  console.log(`  Updated ${managerUpdates} manager relationships`);

  // Create emergency contacts
  console.log('\nCreating emergency contacts...');
  let ecCreated = 0;
  for (const [personId, contacts] of emergencyByPersonId) {
    const employeeId = personIdToNewEmployeeId.get(personId);
    if (!employeeId) continue;

    for (let i = 0; i < contacts.length; i++) {
      const ec = contacts[i];
      try {
        await prisma.emergencyContact.create({
          data: {
            employeeId,
            name: ec.name,
            phone: ec.phone || null,
            email: ec.email || null,
            relationship: mapRelationship(ec.relationship),
            isPrimary: i === 0,
          }
        });
        ecCreated++;
      } catch (error) {
        // Ignore duplicates
      }
    }
  }
  console.log(`  Created ${ecCreated} emergency contacts`);

  // Summary
  console.log('\n========================================');
  console.log('Migration Complete!');
  console.log('========================================');
  console.log(`Organization: ${org.name}`);
  console.log(`Employees created: ${createdCount}`);
  console.log(`Manager relationships: ${managerUpdates}`);
  console.log(`Emergency contacts: ${ecCreated}`);
  console.log(`Legal entities: ${uniqueLegalEntities.size}`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
