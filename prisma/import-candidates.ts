import { PrismaClient, JobCandidateStage } from '@prisma/client';
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

function mapCandidateStatus(status: string): JobCandidateStage {
  switch (status) {
    case '1': return 'HR_SCREEN';
    case '2': return 'APPLIED';
    case '3': return 'HIRED';
    default: return 'APPLIED';
  }
}

interface Candidate {
  id: string;
  person_id: string;
  linkedin: string;
  website: string;
  status: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  discarded_at: string;
}

interface Person {
  id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
}

async function main() {
  console.log('Starting candidate import...\n');

  // Load data
  const candidates = loadCSV<Candidate>('candidates.json');
  const people = loadJSON<Person[]>('people.json');

  console.log(`Loaded ${candidates.length} candidates, ${people.length} people`);

  const peopleById = new Map(people.map(p => [p.id, p]));

  // Get existing employees to link candidates
  const employees = await prisma.employee.findMany({
    select: { id: true, personalEmail: true, candidateId: true }
  });
  const employeeByEmail = new Map(employees.map(e => [e.personalEmail.toLowerCase(), e]));

  // We need a job to link candidates to - create a placeholder if needed
  let placeholderJob = await prisma.job.findFirst({
    where: { title: 'Legacy Import - General Application' }
  });

  if (!placeholderJob) {
    console.log('Creating placeholder job for legacy candidates...');
    placeholderJob = await prisma.job.create({
      data: {
        title: 'Legacy Import - General Application',
        status: 'HIRED',
        locations: ['Remote'],
      }
    });
  }

  let created = 0;
  let skipped = 0;
  let linked = 0;

  for (const candidate of candidates) {
    if (candidate.discarded_at && candidate.discarded_at.trim() !== '') {
      skipped++;
      continue;
    }

    const person = peopleById.get(candidate.person_id);
    if (!person) {
      skipped++;
      continue;
    }

    const fullName = [person.first_name, person.middle_name, person.last_name]
      .filter(n => n && n.trim())
      .join(' ');

    // Check if candidate already exists
    const existing = await prisma.jobCandidate.findFirst({
      where: { email: person.email.toLowerCase() }
    });

    if (existing) {
      skipped++;
      continue;
    }

    try {
      const newCandidate = await prisma.jobCandidate.create({
        data: {
          jobId: placeholderJob.id,
          name: fullName,
          email: person.email.toLowerCase(),
          linkedinUrl: candidate.linkedin || null,
          otherContactInfo: candidate.website || null,
          stage: mapCandidateStatus(candidate.status),
          appliedAt: new Date(candidate.created_at),
        }
      });
      created++;

      // If there's a matching employee, link them
      const employee = employeeByEmail.get(person.email.toLowerCase());
      if (employee && !employee.candidateId) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { candidateId: newCandidate.id }
        });
        linked++;
      }

      if (created % 10 === 0) {
        console.log(`  Created ${created} candidates...`);
      }
    } catch (error) {
      console.log(`  Error creating candidate ${fullName}: ${error}`);
      skipped++;
    }
  }

  console.log('\n========================================');
  console.log('Candidate Import Complete!');
  console.log('========================================');
  console.log(`Created: ${created}`);
  console.log(`Linked to employees: ${linked}`);
  console.log(`Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
