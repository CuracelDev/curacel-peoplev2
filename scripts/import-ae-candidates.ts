import fs from 'fs'
import * as xlsx from 'xlsx'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type CandidateStage =
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'HR_SCREEN'
  | 'TECHNICAL'
  | 'TEAM_CHAT'
  | 'ADVISOR_CHAT'
  | 'PANEL'
  | 'TRIAL'
  | 'CEO_CHAT'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ARCHIVED'

type CandidateSource = 'INBOUND' | 'OUTBOUND' | 'RECRUITER' | 'EXCELLER'

const DEFAULT_FILE = '/Users/henrymascot/Downloads/Hiring - AE.xlsx'
const DEFAULT_ACTIVE_QUARTER = 'Q4 2025'

const args = parseArgs(process.argv.slice(2))
const filePath = (args.file as string) ?? DEFAULT_FILE
const jobTitle = (args.jobTitle as string) ?? 'Account Executive (AE)'
const jobDepartment = (args.jobDepartment as string) ?? 'Sales'
const jdPath = args.jd as string
const activeQuarterTokens = ((args.activeQuarter as string) ?? DEFAULT_ACTIVE_QUARTER)
  .split(',')
  .map((token) => token.trim().toLowerCase())
  .filter(Boolean)
const allowMissingEmail = Boolean(args.allowMissingEmail)
const missingEmailDomain = (args.missingEmailDomain as string) ?? 'curacel.local'
const includeOthers = args.includeOthers !== 'false'
const doImport = Boolean(args.import)

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`)
  process.exit(1)
}

const workbook = xlsx.readFile(filePath, { cellDates: true })

const usedEmails = new Set<string>()

const dashboardResult = parseDashboardSheet(workbook, {
  activeQuarterTokens,
  allowMissingEmail,
  missingEmailDomain,
  usedEmails,
})

const othersResult = includeOthers
  ? parseOthersSheet(workbook, {
    allowMissingEmail,
    missingEmailDomain,
    usedEmails,
  })
  : { candidates: [], missingEmails: [], skipped: 0 }

const allCandidates = [...dashboardResult.candidates, ...othersResult.candidates]
const missingEmails = [...dashboardResult.missingEmails, ...othersResult.missingEmails]

const duplicateEmails = findDuplicates(allCandidates.map((candidate) => candidate.email))

if (!doImport) {
  printSummary({
    filePath,
    dashboardResult,
    othersResult,
    totalCandidates: allCandidates.length,
    missingEmails,
    duplicateEmails,
  })
  void prisma.$disconnect()
  process.exit(0)
}

if (!jdPath) {
  console.error('Missing required --jd path. Provide a JD file to create the job description.')
  void prisma.$disconnect()
  process.exit(1)
}

void importCandidates({
  jobTitle,
  jobDepartment,
  jdPath,
  candidates: allCandidates,
  duplicateEmails,
})
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

async function importCandidates(params: {
  jobTitle: string
  jobDepartment: string
  jdPath: string
  candidates: CandidateRecord[]
  duplicateEmails: string[]
}) {
  const { jobTitle, jobDepartment, jdPath, candidates, duplicateEmails } = params

  if (duplicateEmails.length > 0) {
    console.warn(`Duplicate emails detected in import set: ${duplicateEmails.slice(0, 10).join(', ')}`)
  }

  const job = await getOrCreateJob({ jobTitle, jobDepartment, jdPath })

  const sanitizedCandidates = candidates.map((candidate) => ({
    ...candidate,
    jobId: job.id,
    email: candidate.email.toLowerCase(),
  }))

  const result = await prisma.jobCandidate.createMany({
    data: sanitizedCandidates,
    skipDuplicates: true,
  })

  console.log(`Imported ${result.count} candidates into job ${job.title} (${job.id}).`)
  const skipped = sanitizedCandidates.length - result.count
  if (skipped > 0) {
    console.log(`Skipped ${skipped} candidates due to duplicate email/job records.`)
  }
}

async function getOrCreateJob(params: { jobTitle: string; jobDepartment: string; jdPath: string }) {
  const { jobTitle, jobDepartment, jdPath } = params
  const existing = await prisma.job.findFirst({
    where: { title: jobTitle },
  })

  if (existing) {
    return existing
  }

  const jdContent = fs.readFileSync(jdPath, 'utf8')
  const description = await prisma.jobDescription.create({
    data: {
      name: jobTitle,
      department: jobDepartment,
      content: jdContent,
    },
  })

  const hiringFlow = await prisma.hiringFlow.findFirst({
    where: { isActive: true, isDefault: true },
    include: { snapshots: { orderBy: { version: 'desc' }, take: 1 } },
  })

  return prisma.job.create({
    data: {
      title: jobTitle,
      department: jobDepartment,
      status: 'ACTIVE',
      employmentType: 'full-time',
      locations: [],
      jobDescriptionId: description.id,
      hiringFlowId: hiringFlow?.id ?? null,
      hiringFlowSnapshotId: hiringFlow?.snapshots?.[0]?.id ?? null,
    },
  })
}

function parseDashboardSheet(
  workbook: xlsx.WorkBook,
  options: {
    activeQuarterTokens: string[]
    allowMissingEmail: boolean
    missingEmailDomain: string
    usedEmails: Set<string>
  }
) {
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

  const sourceCols = [headerIndex.get('source'), headerIndex.get('source (2)')].filter(
    (value): value is number => typeof value === 'number'
  )
  const commentsCol = headerIndex.get('comments')
  const verdictCol = headerIndex.get("line manager's veridct")
  const statusCol = headerIndex.get('status')
  const mbtiCol = headerIndex.get('mbti')
  const salaryCol = headerIndex.get('salary expectation')
  const notesCol = headerIndex.get('notes')
  const bigOceanCol = headerIndex.get('big ocean')
  const competencyCol = headerIndex.get('competency assessment')
  const peopleChatCol = headerIndex.get('people chat')
  const teamChatCol = headerIndex.get('team chat')
  const advisorChatCol = headerIndex.get('advisor chat')
  const trialCol = headerIndex.get('trial')
  const ceoChatCol = headerIndex.get('ceo chat')
  const offerCol = headerIndex.get('offer')
  const totalDaysCol = headerIndex.get('total no of days')

  const range = xlsx.utils.decode_range(sheet['!ref'] ?? 'A1:A1')

  const candidates: CandidateRecord[] = []
  const missingEmails: MissingEmail[] = []
  let currentQuarter = ''

  for (let r = 1; r <= range.e.r; r++) {
    const quarterCell = cleanString(getCellValue(sheet, r, 0))
    if (quarterCell && /q[1-4]/i.test(quarterCell)) {
      currentQuarter = quarterCell
      continue
    }

    const nameCell = getCell(sheet, r, nameCol)
    const emailValueRaw = cleanString(getCellValue(sheet, r, emailCol))
    const emailValue = emailValueRaw ? emailValueRaw.toLowerCase() : ''
    const nameValue = cleanString(nameCell?.value)

    if (!nameValue && !emailValue) continue

    const isActive = isActiveQuarter(currentQuarter, options.activeQuarterTokens)
    const linkedinUrl = nameCell?.link

    const notesParts: string[] = []
    const documents: DocumentLink[] = []

    const location = cleanString(getCellValue(sheet, r, countryCol))
    if (location) notesParts.push(`Country: ${location}`)

    for (const col of sourceCols) {
      const sourceValue = cleanString(getCellValue(sheet, r, col))
      if (sourceValue) notesParts.push(`Source: ${sourceValue}`)
    }

    const commentsValue = cleanString(getCellValue(sheet, r, commentsCol))
    if (commentsValue) notesParts.push(`Comments: ${commentsValue}`)

    const verdictValue = cleanString(getCellValue(sheet, r, verdictCol))
    if (verdictValue) notesParts.push(`Line Manager Verdict: ${verdictValue}`)

    const statusValue = cleanString(getCellValue(sheet, r, statusCol))
    if (statusValue) notesParts.push(`Status: ${statusValue}`)

    const salaryValue = cleanString(getCellValue(sheet, r, salaryCol))
    if (salaryValue) notesParts.push(`Salary Expectation: ${salaryValue}`)

    const notesValue = cleanString(getCellValue(sheet, r, notesCol))
    if (notesValue && notesValue.toLowerCase() !== 'here') {
      notesParts.push(`Notes: ${notesValue}`)
    }

    const notesLink = getCellLink(sheet, r, notesCol)
    if (notesLink) {
      documents.push(buildDocument('Notes', notesLink))
    }

    const bigOceanLink = getCellLink(sheet, r, bigOceanCol)
    const bigOceanValue = cleanString(getCellValue(sheet, r, bigOceanCol))
    if (bigOceanLink) {
      documents.push(buildDocument('Big OCEAN', bigOceanLink))
    }
    if (bigOceanValue && bigOceanValue.toLowerCase() !== 'here') {
      notesParts.push(`Big OCEAN: ${bigOceanValue}`)
    }

    const competencyLink = getCellLink(sheet, r, competencyCol)
    const competencyValue = cleanString(getCellValue(sheet, r, competencyCol))
    if (competencyLink) {
      documents.push(buildDocument('Competency Assessment', competencyLink))
    }
    if (competencyValue && competencyValue.toLowerCase() !== 'here') {
      notesParts.push(`Competency Assessment: ${competencyValue}`)
    }

    const stageNotes = collectStageNotes([
      { label: 'People Chat', value: getCellValue(sheet, r, peopleChatCol) },
      { label: 'Team Chat', value: getCellValue(sheet, r, teamChatCol) },
      { label: 'Advisor Chat', value: getCellValue(sheet, r, advisorChatCol) },
      { label: 'Trial', value: getCellValue(sheet, r, trialCol) },
      { label: 'CEO Chat', value: getCellValue(sheet, r, ceoChatCol) },
      { label: 'Offer', value: getCellValue(sheet, r, offerCol) },
    ])
    notesParts.push(...stageNotes)

    const totalDaysValue = cleanString(getCellValue(sheet, r, totalDaysCol))
    if (totalDaysValue) notesParts.push(`Total Days: ${totalDaysValue}`)

    const mbtiValue = cleanString(getCellValue(sheet, r, mbtiCol))

    let stage = deriveStage({
      status: statusValue,
      verdict: verdictValue,
      stageFlags: {
        peopleChat: hasValue(getCellValue(sheet, r, peopleChatCol)),
        teamChat: hasValue(getCellValue(sheet, r, teamChatCol)),
        advisorChat: hasValue(getCellValue(sheet, r, advisorChatCol)),
        trial: hasValue(getCellValue(sheet, r, trialCol)),
        ceoChat: hasValue(getCellValue(sheet, r, ceoChatCol)),
        offer: hasValue(getCellValue(sheet, r, offerCol)),
      },
    })

    if (!isActive) {
      stage = 'ARCHIVED'
    }

    let email = emailValue

    if (!email) {
      if (options.allowMissingEmail) {
        const fallbackEmail = allocatePlaceholderEmail(
          nameValue,
          r + 1,
          options.missingEmailDomain,
          options.usedEmails
        )
        missingEmails.push({ name: nameValue, row: r + 1, fallbackEmail })
        notesParts.push('Email missing in source.')
        email = fallbackEmail.toLowerCase()
      } else {
        missingEmails.push({ name: nameValue, row: r + 1 })
        continue
      }
    }

    options.usedEmails.add(email.toLowerCase())
    const source = inferSource(sourceCols.map((col) => getCellValue(sheet, r, col)))

    candidates.push({
      name: nameValue || email,
      email,
      linkedinUrl: linkedinUrl || undefined,
      location: location || undefined,
      mbtiType: mbtiValue || undefined,
      notes: notesParts.length > 0 ? notesParts.join('\n') : undefined,
      documents: documents.length > 0 ? documents : undefined,
      stage,
      customStageName: statusValue || undefined,
      source,
    })
  }

  return { candidates, missingEmails, skipped: 0 }
}

function parseOthersSheet(
  workbook: xlsx.WorkBook,
  options: { allowMissingEmail: boolean; missingEmailDomain: string; usedEmails: Set<string> }
) {
  const sheet = workbook.Sheets['Others']
  if (!sheet) {
    throw new Error('Others sheet not found')
  }

  const headers = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' })[0] as string[]
  const headerIndex = buildHeaderIndex(headers)

  const nameCol = headerIndex.get('name/profile') ?? 1
  const roleCol = headerIndex.get('role')
  const stage1Col = headerIndex.get('stage 1- henry')
  const panelCol = headerIndex.get('panel interview')
  const managementCol = headerIndex.get('management chat')
  const hiredCol = headerIndex.get('hired')
  const commentsCol = headerIndex.get('comments')
  const hostCol = headerIndex.get('host')

  const range = xlsx.utils.decode_range(sheet['!ref'] ?? 'A1:A1')

  const candidates: CandidateRecord[] = []
  const missingEmails: MissingEmail[] = []

  for (let r = 1; r <= range.e.r; r++) {
    const nameCell = getCell(sheet, r, nameCol)
    const nameValue = cleanString(nameCell?.value)
    if (!nameValue) continue

    const linkedinUrl = nameCell?.link
    const roleValue = cleanString(getCellValue(sheet, r, roleCol))
    const commentsValue = cleanString(getCellValue(sheet, r, commentsCol))

    const derivedStage = deriveStage({
      status: commentsValue,
      verdict: '',
      stageFlags: {
        peopleChat: hasValue(getCellValue(sheet, r, stage1Col)),
        teamChat: hasValue(getCellValue(sheet, r, panelCol)),
        advisorChat: hasValue(getCellValue(sheet, r, managementCol)),
        trial: false,
        ceoChat: false,
        offer: hasValue(getCellValue(sheet, r, hiredCol)),
      },
      stageOverrides: {
        panelStage: 'PANEL',
        managementStage: 'CEO_CHAT',
      },
    })

    const notesParts: string[] = []
    const hostValue = cleanString(getCellValue(sheet, r, hostCol))
    if (roleValue) notesParts.push(`Role: ${roleValue}`)
    if (hostValue) notesParts.push(`Host: ${hostValue}`)
    if (commentsValue) notesParts.push(`Comments: ${commentsValue}`)
    if (derivedStage) notesParts.push(`Pipeline Stage: ${derivedStage}`)

    if (!options.allowMissingEmail) {
      missingEmails.push({ name: nameValue, row: r + 1 })
      continue
    }

    const email = allocatePlaceholderEmail(
      nameValue,
      r + 1,
      options.missingEmailDomain,
      options.usedEmails
    )
    missingEmails.push({ name: nameValue, row: r + 1, fallbackEmail: email })
    notesParts.push('Email missing in source.')
    options.usedEmails.add(email.toLowerCase())

    candidates.push({
      name: nameValue,
      email,
      linkedinUrl: linkedinUrl || undefined,
      notes: notesParts.length > 0 ? notesParts.join('\n') : undefined,
      documents: undefined,
      stage: 'ARCHIVED',
      customStageName: undefined,
      source: 'RECRUITER',
    })
  }

  return { candidates, missingEmails, skipped: 0 }
}

function deriveStage(params: {
  status: string
  verdict: string
  stageFlags: {
    peopleChat?: boolean
    teamChat?: boolean
    advisorChat?: boolean
    trial?: boolean
    ceoChat?: boolean
    offer?: boolean
  }
  stageOverrides?: {
    panelStage?: CandidateStage
    managementStage?: CandidateStage
  }
}): CandidateStage {
  const normalizedStatus = params.status.toLowerCase()
  const normalizedVerdict = params.verdict.toLowerCase()

  const rejectedSignals = ['rejected', 'not a fit', 'declined', 'did not proceed', 'not good', 'no fit']
  if (rejectedSignals.some((signal) => normalizedStatus.includes(signal) || normalizedVerdict.includes(signal))) {
    return 'REJECTED'
  }

  if (normalizedStatus.includes('withdraw')) return 'WITHDRAWN'
  if (normalizedStatus.includes('hired')) return 'HIRED'
  if (normalizedStatus.includes('offer')) return 'OFFER'

  if (normalizedStatus.includes('ceo')) return 'CEO_CHAT'
  if (normalizedStatus.includes('advisor')) return 'ADVISOR_CHAT'
  if (normalizedStatus.includes('management')) return 'CEO_CHAT'
  if (normalizedStatus.includes('team chat')) return 'TEAM_CHAT'
  if (normalizedStatus.includes('panel')) return 'PANEL'
  if (normalizedStatus.includes('trial')) return 'TRIAL'
  if (normalizedStatus.includes('people chat') || normalizedStatus.includes('quick chat')) return 'HR_SCREEN'
  if (normalizedStatus.includes('1st stage') || normalizedStatus.includes('first stage')) return 'HR_SCREEN'
  if (normalizedStatus.includes('2nd stage') || normalizedStatus.includes('second stage')) return 'TEAM_CHAT'
  if (normalizedStatus.includes('3rd stage') || normalizedStatus.includes('third stage')) return 'ADVISOR_CHAT'
  if (normalizedStatus.includes('shortlist')) return 'SHORTLISTED'

  const orderedStages: Array<{ stage: CandidateStage; active?: boolean }> = [
    { stage: 'OFFER', active: params.stageFlags.offer },
    { stage: params.stageOverrides?.managementStage ?? 'CEO_CHAT', active: params.stageFlags.advisorChat },
    { stage: params.stageOverrides?.panelStage ?? 'TEAM_CHAT', active: params.stageFlags.teamChat },
    { stage: 'HR_SCREEN', active: params.stageFlags.peopleChat },
  ]

  for (const entry of orderedStages) {
    if (entry.active) return entry.stage
  }

  return 'APPLIED'
}

function inferSource(values: Array<unknown>): CandidateSource {
  const combined = values.map((value) => String(value ?? '')).join(' ').toLowerCase()
  if (combined.includes('inbound')) return 'INBOUND'
  if (combined.includes('outbound')) return 'OUTBOUND'
  if (combined.includes('recruit')) return 'RECRUITER'
  return 'INBOUND'
}

function collectStageNotes(entries: Array<{ label: string; value: unknown }>) {
  const notes: string[] = []
  for (const entry of entries) {
    if (!hasValue(entry.value)) continue
    const formatted = formatValue(entry.value)
    if (formatted) {
      notes.push(`${entry.label}: ${formatted}`)
    }
  }
  return notes
}

function formatValue(value: unknown) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  const text = cleanString(value)
  return text || ''
}

function hasValue(value: unknown) {
  if (value instanceof Date) return !isNaN(value.getTime())
  const text = cleanString(value)
  return Boolean(text)
}

function allocatePlaceholderEmail(name: string, row: number, domain: string, usedEmails: Set<string>) {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9\\s]+/g, ' ')
    .trim()
    .split(/\\s+/)
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

function getCell(sheet: xlsx.WorkSheet, row: number, col?: number) {
  if (col === undefined || col < 0) return null
  const addr = xlsx.utils.encode_cell({ r: row, c: col })
  const cell = sheet[addr] as xlsx.CellObject | undefined
  if (!cell) return null
  return {
    value: cell.v,
    link: (cell as any).l?.Target as string | undefined,
  }
}

function getCellValue(sheet: xlsx.WorkSheet, row: number, col?: number) {
  return getCell(sheet, row, col)?.value
}

function getCellLink(sheet: xlsx.WorkSheet, row: number, col?: number) {
  return getCell(sheet, row, col)?.link
}

function cleanString(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isActiveQuarter(currentQuarter: string, activeTokens: string[]) {
  if (!currentQuarter) return false
  const normalized = currentQuarter.toLowerCase()
  return activeTokens.some((token) => normalized.includes(token))
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

function findDuplicates(values: string[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    const normalized = value.toLowerCase()
    if (seen.has(normalized)) duplicates.add(normalized)
    seen.add(normalized)
  }
  return Array.from(duplicates)
}

function printSummary(summary: {
  filePath: string
  dashboardResult: ParseResult
  othersResult: ParseResult
  totalCandidates: number
  missingEmails: MissingEmail[]
  duplicateEmails: string[]
}) {
  console.log(`Import preview for ${summary.filePath}`)
  console.log(`Dashboard candidates: ${summary.dashboardResult.candidates.length}`)
  console.log(`Others candidates: ${summary.othersResult.candidates.length}`)
  console.log(`Total candidates: ${summary.totalCandidates}`)

  if (summary.missingEmails.length > 0) {
    console.log(`Missing emails: ${summary.missingEmails.length}`)
    console.log(
      summary.missingEmails
        .slice(0, 10)
        .map((entry) => `- ${entry.name || 'Unknown'} (row ${entry.row})${entry.fallbackEmail ? ` -> ${entry.fallbackEmail}` : ''}`)
        .join('\n')
    )
  }

  if (summary.duplicateEmails.length > 0) {
    console.log(`Duplicate emails within import set: ${summary.duplicateEmails.slice(0, 10).join(', ')}`)
  }

  console.log('\nRun with --import and --jd <path> to create the job and import candidates.')
}

type DocumentLink = {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: string
}

type CandidateRecord = {
  name: string
  email: string
  linkedinUrl?: string
  location?: string
  mbtiType?: string
  notes?: string
  documents?: DocumentLink[]
  stage: CandidateStage
  customStageName?: string
  source: CandidateSource
}

type MissingEmail = {
  name: string
  row: number
  fallbackEmail?: string
}

type ParseResult = {
  candidates: CandidateRecord[]
  missingEmails: MissingEmail[]
  skipped: number
}

function buildDocument(name: string, url: string): DocumentLink {
  return {
    id: `doc_${Math.random().toString(36).slice(2, 9)}`,
    name,
    type: 'other',
    url,
    uploadedAt: new Date().toISOString(),
  }
}
