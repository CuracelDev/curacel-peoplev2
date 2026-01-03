/**
 * Seed script to initialize competency framework sources
 * Run with: npx tsx scripts/seed-competency-frameworks.ts
 */

import { PrismaClient } from '@prisma/client'
import { extractSpreadsheetId } from '../src/lib/google-sheets'

const prisma = new PrismaClient()

const FRAMEWORK_SOURCES = [
  // Department Competencies (Standard 4-Level)
  {
    type: 'DEPARTMENT' as const,
    name: 'People Operations',
    department: 'People Ops',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1uRtuyNmNLDyj2B-YfvI3meCOKmHhFJO-UCGj6p_3TxU/edit',
    tabName: undefined,
  },
  {
    type: 'DEPARTMENT' as const,
    name: 'Sales',
    department: 'Sales',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1aHRxw93YlHABRWWv2rkyaoAdMejQQhVsYLVg1fT_0Fk/edit',
    tabName: undefined,
  },
  {
    type: 'DEPARTMENT' as const,
    name: 'Finance',
    department: 'Finance',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1J-y9IQhL2vnDOApAOspqqYehS3exd0pzLlc5DPjw4iE/edit',
    tabName: undefined,
  },
  {
    type: 'DEPARTMENT' as const,
    name: 'Product',
    department: 'Product',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1QrJFCasTNu-fxqqLwtwiOIlRcnbLE6XSn6rjw01KNm8/edit',
    tabName: undefined,
  },
  {
    type: 'DEPARTMENT' as const,
    name: 'Marketing',
    department: 'Marketing',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1OdZjShRi5KzDznGLVpnJgPHJRgp4Ny2rSMKucRIAmgo/edit',
    tabName: undefined,
  },
  {
    type: 'DEPARTMENT' as const,
    name: 'Success',
    department: 'Success',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1Pg4qCih97V0VMBTfUmUdmlJXqXiiK6Ao-2q2o5cjvb8/edit',
    tabName: undefined,
  },
  {
    type: 'DEPARTMENT' as const,
    name: 'Engineering',
    department: 'Engineering',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1HZhOk8ujfkZftDmyx9SyBgF-v38iA0bhB2BnXw-n4Pc/edit',
    tabName: 'Departmental Competency framework v2',
  },

  // Extended 5-Level Competencies
  {
    type: 'DEPARTMENT' as const,
    name: 'HealthOps',
    department: 'HealthOps',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/19_77KwliVcoWIaoggpCn-Ddw--EfXRSNNBwsVi4fXII/edit',
    tabName: undefined,
  },

  // AI Competencies (Behavioral Indicators)
  {
    type: 'AI' as const,
    name: 'AI Framework',
    department: undefined,
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1DITx0M4bBNYxJCBHVHiUcxN3Ug11DIdEdFFzy5lIyF0/edit',
    tabName: undefined,
  },

  // Company Values (Extended 5-Level)
  {
    type: 'VALUES' as const,
    name: 'Company Values',
    department: undefined,
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1wwU0aAOMmitqaJXgzol_LKd5LCkAaTn6uRyp6m4D_lY/edit',
    tabName: undefined,
  },
]

async function seedCompetencyFrameworks() {
  console.log('🌱 Seeding competency framework sources...')

  for (const source of FRAMEWORK_SOURCES) {
    const sheetId = extractSpreadsheetId(source.sheetUrl)

    try {
      const result = await prisma.competencyFrameworkSource.upsert({
        where: {
          type_department: {
            type: source.type,
            department: source.department || '',
          },
        },
        create: {
          type: source.type,
          name: source.name,
          department: source.department,
          sheetUrl: source.sheetUrl,
          sheetId,
          gidOrTabName: source.tabName,
          formatType: source.type === 'AI' ? 'AI_BEHAVIORAL' : source.type === 'VALUES' ? 'EXTENDED_5_LEVEL' : source.department === 'HealthOps' ? 'EXTENDED_5_LEVEL' : 'STANDARD_4_LEVEL',
          levelNames: [],
          minLevel: source.type === 'AI' ? 0 : 1,
          maxLevel: source.type === 'VALUES' || source.department === 'HealthOps' ? 5 : source.type === 'AI' ? 4 : 4,
        },
        update: {
          name: source.name,
          sheetUrl: source.sheetUrl,
          sheetId,
          gidOrTabName: source.tabName,
          isActive: true,
        },
      })

      console.log(`✅ ${result.type === 'DEPARTMENT' ? `${result.department} (${result.type})` : result.type}: ${result.name}`)
    } catch (error: any) {
      console.error(`❌ Failed to seed ${source.name}:`, error.message)
    }
  }

  console.log('\n✨ Competency framework sources seeded successfully!')
  console.log(`\n📝 Next steps:`)
  console.log(`   1. Go to Settings > Competency Framework`)
  console.log(`   2. Click "Sync All Sources" to fetch data from Google Sheets`)
  console.log(`   3. Or sync individual sources as needed`)
}

seedCompetencyFrameworks()
  .catch((error) => {
    console.error('Error seeding competency frameworks:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
