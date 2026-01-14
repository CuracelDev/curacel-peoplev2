import xlsx from 'xlsx'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_FILE = '/Users/henrymascot/Downloads/Hiring - AE.xlsx'
const DEFAULT_JOB_TITLE = 'Account Executive (AE)'
const DEFAULT_DOMAIN = 'placeholder.com'

const args = parseArgs(process.argv.slice(2))
const filePath = args.file ?? DEFAULT_FILE
const jobTitle = args.jobTitle ?? DEFAULT_JOB_TITLE
const missingEmailDomain = args.missingEmailDomain ?? DEFAULT_DOMAIN

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`)
  process.exit(1)
}

const workbook = xlsx.readFile(filePath, { cellDates: true })
const usedEmails = new Set<string>()

const rows = parseDashboardRows(workbook, { missingEmailDomain, usedEmails })

void backfill(rows)
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

async function backfill(rows: ParsedRow[]) {
  const job = await prisma.job.findFirst({ where: { title: jobTitle } })
  if (!job) {
    throw new Error(`Job not found for title: ${jobTitle}`)
  }

  const emails = Array.from(new Set(rows.map((row) => row.email.toLowerCase())))
  const candidates = await prisma.jobCandidate.findMany({
    where: {
      jobId: job.id,
      email: { in: emails },
    },
    select: { id: true, email: true },
  })

  const candidateByEmail = new Map(candidates.map((candidate) => [candidate.email.toLowerCase(), candidate.id]))

  const candidateIds = candidates.map((candidate) => candidate.id)
  const existing = await prisma.candidateInterview.findMany({
    where: { candidateId: { in: candidateIds } },
    select: { candidateId: true, stage: true, completedAt: true },
  })

  const existingKeys = new Set(
    existing
      .filter((entry) => entry.completedAt)
      .map((entry) => `${entry.candidateId}|${entry.stage}|${formatDateKey(entry.completedAt!)}`)
  )

  const toCreate: Array<{ candidateId: string; stage: string; stageName: string; completedAt: Date }> = []
  const newKeys = new Set<string>()
  let skippedMissingCandidate = 0
  let skippedInvalidDate = 0

  for (const row of rows) {
    const candidateId = candidateByEmail.get(row.email.toLowerCase())
    if (!candidateId) {
      skippedMissingCandidate += 1
      continue
    }

    for (const stageDate of row.stageDates) {
      if (!stageDate.completedAt) {
        skippedInvalidDate += 1
        continue
      }

      const dateKey = formatDateKey(stageDate.completedAt)
      const key = `${candidateId}|${stageDate.stage}|${dateKey}`
      if (existingKeys.has(key) || newKeys.has(key)) continue

      toCreate.push({
        candidateId,
        stage: stageDate.stage,
        stageName: stageDate.stageName,
        completedAt: stageDate.completedAt,
      })
      newKeys.add(key)
    }
  }

  if (toCreate.length === 0) {
    console.log('No new interview dates to insert.')
    return
  }

  const result = await prisma.candidateInterview.createMany({
    data: toCreate,
  })

  console.log(`Inserted ${result.count} interview records.`)
  if (skippedMissingCandidate > 0) {
    console.log(`Skipped ${skippedMissingCandidate} rows with no matching candidate in DB.`)
  }
  if (skippedInvalidDate > 0) {
    console.log(`Skipped ${skippedInvalidDate} stage dates that could not be parsed.`)
  }
}

type ParsedRow = {
  email: string
  stageDates: Array<{ stage: string; stageName: string; completedAt: Date | null }>
}

function parseDashboardRows(
  workbook: xlsx.WorkBook,
  options: { missingEmailDomain: string; usedEmails: Set<string> }
): ParsedRow[] {
  const sheet = workbook.Sheets['Dashboard']
  if (!sheet) {
    throw new Error('Dashboard sheet not found')
  }

  const headers = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' })[0] as string[]
  const headerIndex = buildHeaderIndex(headers)

  const nameCol = headerIndex.get('applicants') ?? 1
  const countryCol = headerIndex.get('country') ?? 2
  let emailCol = headerIndex.get('email')
  if (emailCol === undefined) {
    emailCol = countryCol + 1
  }

  const peopleChatCol = headerIndex.get('people chat')
  const teamChatCol = headerIndex.get('team chat')
  const advisorChatCol = headerIndex.get('advisor chat')
  const trialCol = headerIndex.get('trial')
  const ceoChatCol = headerIndex.get('ceo chat')
  const offerCol = headerIndex.get('offer')

  const range = xlsx.utils.decode_range(sheet['!ref'] ?? 'A1:A1')
  const rows: ParsedRow[] = []

  for (let r = 1; r <= range.e.r; r++) {
    const quarterCell = cleanString(getCellValue(sheet, r, 0))
    if (quarterCell && /q[1-4]/i.test(quarterCell)) {
      continue
    }

    const nameValue = cleanString(getCellValue(sheet, r, nameCol))
    const emailValueRaw = cleanString(getCellValue(sheet, r, emailCol))
    const emailValue = emailValueRaw ? emailValueRaw.toLowerCase() : ''

    if (!nameValue && !emailValue) continue

    let email = emailValue
    if (!email) {
      email = allocatePlaceholderEmail(nameValue, r + 1, options.missingEmailDomain, options.usedEmails)
    }
    options.usedEmails.add(email.toLowerCase())

    const stageDates = [
      { stage: 'HR_SCREEN', stageName: 'People Chat', value: getCellValue(sheet, r, peopleChatCol) },
      { stage: 'TEAM_CHAT', stageName: 'Team Chat', value: getCellValue(sheet, r, teamChatCol) },
      { stage: 'ADVISOR_CHAT', stageName: 'Advisor Chat', value: getCellValue(sheet, r, advisorChatCol) },
      { stage: 'TRIAL', stageName: 'Trial', value: getCellValue(sheet, r, trialCol) },
      { stage: 'CEO_CHAT', stageName: 'CEO Chat', value: getCellValue(sheet, r, ceoChatCol) },
      { stage: 'OFFER', stageName: 'Offer', value: getCellValue(sheet, r, offerCol) },
    ]
      .map((entry) => ({
        stage: entry.stage,
        stageName: entry.stageName,
        completedAt: parseDate(entry.value),
      }))
      .filter((entry) => entry.completedAt)

    if (stageDates.length === 0) continue

    rows.push({
      email,
      stageDates,
    })
  }

  return rows
}

function parseArgs(argsList: string[]) {
  const parsed: Record<string, string | boolean> = {}
  for (let i = 0; i < argsList.length; i++) {
    const arg = argsList[i]
    if (!arg.startsWith('--')) continue
    const rawKey = arg.replace(/^--/, '')
    const [keyPart, inlineValue] = rawKey.split('=')
    const key = toCamelCase(keyPart)
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue
      continue
    }
    const next = argsList[i + 1]
    if (!next || next.startsWith('--')) {
      parsed[key] = 'true'
      continue
    }
    parsed[key] = next
    i++
  }
  return parsed
}

function toCamelCase(value: string) {
  return value.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
}

function buildHeaderIndex(headers: string[]) {
  const index = new Map<string, number>()
  headers.forEach((header, idx) => {
    const normalized = cleanString(header).toLowerCase()
    if (!normalized) return
    if (index.has(normalized)) {
      index.set(`${normalized} (2)`, idx)
    } else {
      index.set(normalized, idx)
    }
  })
  return index
}

function getCellValue(sheet: xlsx.WorkSheet, row: number, col?: number) {
  if (col === undefined || col < 0) return null
  const addr = xlsx.utils.encode_cell({ r: row, c: col })
  const cell = sheet[addr] as xlsx.CellObject | undefined
  return cell?.v ?? null
}

function cleanString(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function parseDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date && !isNaN(value.getTime())) return value

  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const millis = excelEpoch.getTime() + value * 24 * 60 * 60 * 1000
    const date = new Date(millis)
    if (!isNaN(date.getTime())) return date
  }

  const text = cleanString(value)
  if (!text) return null
  const parsed = new Date(text)
  if (!isNaN(parsed.getTime())) return parsed

  return null
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function allocatePlaceholderEmail(name: string, row: number, domain: string, usedEmails: Set<string>) {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  let local = 'candidate'
  if (tokens.length >= 2) {
    local = `${tokens[0]}+${tokens[tokens.length - 1]}`
  } else if (tokens.length === 1) {
    local = tokens[0]
  }

  let email = `${local}@${domain}`
  if (usedEmails.has(email.toLowerCase())) {
    email = `${local}+row${row}@${domain}`
  }
  return email
}
