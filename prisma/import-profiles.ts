import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const EXTRACT_PATH = '/Users/henrymascot/Downloads/organization_extract 2';

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

function mapGender(genderCode: string): string | null {
  switch (genderCode) {
    case '0': return 'Male';
    case '1': return 'Female';
    case '2': return 'Other';
    default: return null;
  }
}

function mapMaritalStatus(statusCode: string): string | null {
  switch (statusCode) {
    case '0': return 'Single';
    case '1': return 'Married';
    case '2': return 'Divorced';
    case '3': return 'Widowed';
    default: return null;
  }
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
  personal_email: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  sort_code: string;
  discarded_at: string;
  created_at: string;
  updated_at: string;
}

interface Person {
  id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
}

async function main() {
  console.log('Starting profile import...\\n');

  const profiles = loadJSON<Profile[]>('profiles.json');
  const people = loadJSON<Person[]>('people.json');

  console.log(`Loaded ${profiles.length} profiles, ${people.length} people`);

  const peopleById = new Map(people.map(p => [p.id, p]));

  const dbEmployees = await prisma.employee.findMany({
    select: { id: true, personalEmail: true, fullName: true }
  });
  const employeeByEmail = new Map(dbEmployees.map(e => [e.personalEmail.toLowerCase(), e]));

  let updated = 0;
  let skipped = 0;
  let noEmployee = 0;

  for (const profile of profiles) {
    if (profile.discarded_at && profile.discarded_at.trim() !== '') {
      skipped++;
      continue;
    }

    const person = peopleById.get(profile.person_id);
    if (!person) {
      skipped++;
      continue;
    }

    const employee = employeeByEmail.get(person.email.toLowerCase());
    if (!employee) {
      noEmployee++;
      continue;
    }

    const updateData: Record<string, unknown> = {};

    if (profile.dob?.trim()) {
      const dob = parseDate(profile.dob);
      if (dob) updateData.dateOfBirth = dob;
    }

    if (profile.phone_number?.trim()) {
      updateData.phone = profile.phone_number.trim();
    }

    if (profile.address?.trim()) {
      updateData.addressStreet = profile.address.trim();
    }

    if (profile.post_code?.trim()) {
      updateData.addressPostal = profile.post_code.trim();
    }

    if (profile.gender?.trim()) {
      const gender = mapGender(profile.gender);
      if (gender) updateData.gender = gender;
    }

    if (profile.marital_status?.trim()) {
      const status = mapMaritalStatus(profile.marital_status);
      if (status) updateData.maritalStatus = status;
    }

    if (profile.nationality?.trim()) {
      updateData.nationality = profile.nationality.trim();
    }

    if (profile.country?.trim()) {
      updateData.addressCountry = profile.country.trim();
    }

    if (profile.tax_id?.trim()) {
      updateData.taxId = profile.tax_id.trim();
    }

    if (profile.bank_name?.trim()) {
      updateData.bankName = profile.bank_name.trim();
    }

    if (profile.account_name?.trim()) {
      updateData.accountName = profile.account_name.trim();
    }

    if (profile.account_number?.trim()) {
      updateData.accountNumber = profile.account_number.trim();
    }

    if (profile.sort_code?.trim()) {
      updateData.accountSortCode = profile.sort_code.trim();
    }

    if (Object.keys(updateData).length === 0) {
      skipped++;
      continue;
    }

    try {
      await prisma.employee.update({
        where: { id: employee.id },
        data: updateData
      });
      updated++;

      if (updated % 20 === 0) {
        console.log(`  Updated ${updated} employees...`);
      }
    } catch (error) {
      console.log(`  Error updating ${employee.fullName}: ${error}`);
      skipped++;
    }
  }

  console.log('\\n========================================');
  console.log('Profile Import Complete!');
  console.log('========================================');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no data/discarded): ${skipped}`);
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
