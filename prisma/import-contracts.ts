import { PrismaClient, OfferStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

const EXTRACT_PATH = '/Users/henrymascot/Downloads/organization_extract 2';

function loadCSV<T>(filename: string): T[] {
  const filePath = path.join(EXTRACT_PATH, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
}

function loadJSON<T>(filename: string): T {
  const filePath = path.join(EXTRACT_PATH, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function mapOfferStatus(contract: ContractOffer): OfferStatus {
  if (contract.discarded_at && contract.discarded_at.trim() !== '') {
    return 'DECLINED';
  }
  if (contract.employee_signed_at && contract.employee_signed_at.trim() !== '') {
    return 'SIGNED';
  }
  if (contract.signature_request_sent_at && contract.signature_request_sent_at.trim() !== '') {
    return 'SENT';
  }
  return 'DRAFT';
}

interface ContractOffer {
  id: string;
  organization_id: string;
  signature_block_id: string;
  legal_entity_id: string;
  offer_date: string;
  employee_signature: string;
  signature_request_sent_at: string;
  employee_signed_at: string;
  creator_id: string;
  employment_id: string;
  expiration_date: string;
  supervisor_title: string;
  working_hours: string;
  base_salary: string;
  scheduled_for: string;
  contract_type: string;
  discarded_at: string;
  created_at: string;
  updated_at: string;
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

interface Person {
  id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
}

async function main() {
  console.log('Starting contract/offer import...\n');

  // Load data
  console.log('Loading source data...');
  const contractOffers = loadCSV<ContractOffer>('contract_offers.json');
  const employments = loadCSV<Employment>('employments.json');
  const people = loadJSON<Person[]>('people.json');

  console.log(`  - Contract offers: ${contractOffers.length}`);
  console.log(`  - Employments: ${employments.length}`);
  console.log(`  - People: ${people.length}`);

  // Build lookup maps
  const employmentById = new Map(employments.map(e => [e.id, e]));
  const peopleById = new Map(people.map(p => [p.id, p]));

  // Get all employees from DB to build person email -> employee mapping
  const dbEmployees = await prisma.employee.findMany({
    select: { id: true, personalEmail: true, fullName: true }
  });
  const employeeByEmail = new Map(dbEmployees.map(e => [e.personalEmail.toLowerCase(), e]));

  // Get or create a default template for legacy offers
  let defaultTemplate = await prisma.offerTemplate.findFirst({
    where: { name: 'Legacy Import Template' }
  });

  if (!defaultTemplate) {
    console.log('\nCreating default template for legacy offers...');
    defaultTemplate = await prisma.offerTemplate.create({
      data: {
        name: 'Legacy Import Template',
        description: 'Template used for imported legacy contract offers',
        bodyHtml: '<p>Legacy contract offer imported from previous system.</p>',
        isActive: false,
      }
    });
  }

  // Import offers
  console.log('\nImporting contract offers...');
  let created = 0;
  let skipped = 0;
  let noEmployee = 0;

  for (const contract of contractOffers) {
    // Find employment to get person_id
    const employment = employmentById.get(contract.employment_id);
    if (!employment) {
      skipped++;
      continue;
    }

    // Find person to get email
    const person = peopleById.get(employment.person_id);
    if (!person) {
      skipped++;
      continue;
    }

    // Find employee by email
    const employee = employeeByEmail.get(person.email.toLowerCase());
    if (!employee) {
      noEmployee++;
      continue;
    }

    // Check if offer already exists (by checking legacy metadata)
    const existing = await prisma.offer.findFirst({
      where: {
        employeeId: employee.id,
        notes: { contains: contract.id }
      }
    });

    if (existing) {
      skipped++;
      continue;
    }

    const candidateName = contract.employee_signature?.trim() ||
                          [person.first_name, person.middle_name, person.last_name].filter(n => n).join(' ') ||
                          employee.fullName;

    try {
      await prisma.offer.create({
        data: {
          employeeId: employee.id,
          candidateEmail: person.email,
          candidateName: candidateName,
          templateId: defaultTemplate.id,
          variables: {
            legacyId: contract.id,
            supervisorTitle: contract.supervisor_title || null,
            workingHours: contract.working_hours || null,
            baseSalary: contract.base_salary || null,
            contractType: contract.contract_type || null,
            scheduledFor: contract.scheduled_for || null,
          },
          status: mapOfferStatus(contract),
          esignSentAt: parseDate(contract.signature_request_sent_at),
          esignSignedAt: parseDate(contract.employee_signed_at),
          esignExpiresAt: parseDate(contract.expiration_date),
          notes: `Legacy import: ${contract.id}`,
          createdAt: parseDate(contract.created_at) || new Date(),
          updatedAt: parseDate(contract.updated_at) || new Date(),
        }
      });
      created++;

      if (created % 20 === 0) {
        console.log(`  Created ${created} offers...`);
      }
    } catch (error) {
      console.log(`  Error creating offer for ${candidateName}: ${error}`);
      skipped++;
    }
  }

  console.log('\n========================================');
  console.log('Contract Import Complete!');
  console.log('========================================');
  console.log(`Created: ${created}`);
  console.log(`Skipped (no employment/person): ${skipped}`);
  console.log(`Skipped (no matching employee): ${noEmployee}`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
