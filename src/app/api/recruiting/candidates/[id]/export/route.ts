import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { format } from 'date-fns'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import prisma from '@/lib/prisma'
import { renderHtmlToPdfBuffer } from '@/lib/pdf'
import { normalizeCandidateScoreWeights, type CandidateScoreComponent } from '@/lib/recruiting/score-config'

export const runtime = 'nodejs'

const stageDisplayNames: Record<string, string> = {
  APPLIED: 'Applied',
  HR_SCREEN: 'People Chat',
  TECHNICAL: 'Coding Test',
  TEAM_CHAT: 'Team Chat',
  ADVISOR_CHAT: 'Advisor Chat',
  PANEL: 'Panel',
  TRIAL: 'Trial',
  CEO_CHAT: 'CEO Chat',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
}

const normalizeStageKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '')

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')

const formatScore = (value?: number | null) => {
  if (typeof value !== 'number') return '-'
  return `${Math.round(value)}`
}

const normalizeTo100 = (value?: number | null) => {
  if (typeof value !== 'number') return null
  return value <= 5 ? value * 20 : value
}

const formatDate = (value?: Date | string | null) => {
  if (!value) return '-'
  return format(new Date(value), 'MMM d, yyyy')
}

const safeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildRow = (label: string, value?: string | null) => `
  <tr>
    <td class="label">${escapeHtml(label)}</td>
    <td>${value ? escapeHtml(value) : '-'}</td>
  </tr>
`

const buildList = (items: string[]) => {
  if (!items.length) {
    return '<p class="muted">No items recorded.</p>'
  }

  const listItems = items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')

  return `<ul class="list">${listItems}</ul>`
}

const buildScoreRows = (
  components: Array<CandidateScoreComponent & { value: number }>
) => {
  if (!components.length) {
    return '<tr><td colspan="4" class="muted">No score components available.</td></tr>'
  }

  return components
    .map((component) => `
      <tr>
        <td>${escapeHtml(component.label)}</td>
        <td>${escapeHtml(component.description)}</td>
        <td class="center">${component.weight}</td>
        <td class="center">${formatScore(component.value)}</td>
      </tr>
    `)
    .join('')
}

const buildStageRows = (
  stages: Array<{
    name: string
    status: string
    date: string
    score: string
  }>
) => {
  if (!stages.length) {
    return '<tr><td colspan="4" class="muted">No hiring flow data available.</td></tr>'
  }

  return stages
    .map((stage) => `
      <tr>
        <td>${escapeHtml(stage.name)}</td>
        <td class="center">${escapeHtml(stage.status)}</td>
        <td class="center">${escapeHtml(stage.date)}</td>
        <td class="center">${escapeHtml(stage.score)}</td>
      </tr>
    `)
    .join('')
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const candidate = await prisma.jobCandidate.findUnique({
    where: { id: params.id },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          department: true,
          hiringFlowSnapshot: {
            select: {
              stages: true,
            },
          },
        },
      },
      interviews: {
        select: {
          stage: true,
          stageName: true,
          status: true,
          scheduledAt: true,
          completedAt: true,
          score: true,
          overallScore: true,
        },
        orderBy: { scheduledAt: 'asc' },
      },
      assessments: {
        include: {
          template: {
            select: { name: true, type: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  const latestAnalysis = await prisma.candidateAIAnalysis.findFirst({
    where: {
      candidateId: candidate.id,
      isLatest: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const settings = await prisma.recruitingSettings.findFirst()
  const normalizedWeights = normalizeCandidateScoreWeights(
    settings?.candidateScoreWeights as CandidateScoreComponent[] | null
  )

  const pressValuesScores = candidate.pressValuesScores as Record<string, number> | null
  const pressValuesAvg = typeof candidate.pressValuesAvg === 'number'
    ? candidate.pressValuesAvg
    : pressValuesScores
      ? (() => {
          const values = Object.values(pressValuesScores)
            .map((value) => normalizeTo100(value))
            .filter((score): score is number => typeof score === 'number')
          if (!values.length) return null
          return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        })()
      : null

  const interviews = candidate.interviews || []
  const assessments = candidate.assessments || []

  const interviewScores = interviews
    .map((interview) => normalizeTo100(interview.overallScore ?? interview.score))
    .filter((score): score is number => typeof score === 'number')
  const interviewAverage = interviewScores.length
    ? Math.round(interviewScores.reduce((sum, value) => sum + value, 0) / interviewScores.length)
    : null

  const assessmentScores = assessments
    .map((assessment) =>
      normalizeTo100(assessment.overallScore ?? assessment.qualityScore ?? assessment.completionPercent)
    )
    .filter((score): score is number => typeof score === 'number')
  const assessmentAverage = assessmentScores.length
    ? Math.round(assessmentScores.reduce((sum, value) => sum + value, 0) / assessmentScores.length)
    : null

  const competencyScores = (candidate.competencyScores as Record<string, number> | null) || null
  const personalityProfile = (candidate.personalityProfile as Record<string, number> | null) || null

  const averageFromScores = (scores?: Record<string, number> | null) => {
    if (!scores) return null
    const values = Object.values(scores).map((value) => normalizeTo100(value)).filter((v): v is number => typeof v === 'number')
    if (!values.length) return null
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  }

  const competencyAverage = averageFromScores(competencyScores)
  const personalityAverage = averageFromScores(personalityProfile)

  const scoreLookup: Record<string, number | null> = {
    experienceMatchScore: candidate.experienceMatchScore ?? null,
    skillsMatchScore: candidate.skillsMatchScore ?? null,
    domainFitScore: candidate.domainFitScore ?? null,
    educationScore: candidate.educationScore ?? null,
    pressValuesAvg,
    interviewAverage,
    assessmentAverage,
    competencyAverage,
    personalityAverage,
  }

  const scoreComponents = normalizedWeights
    .filter((component) => component.enabled)
    .map((component) => {
      const value = scoreLookup[component.id]
      if (typeof value !== 'number') return null
      return {
        ...component,
        value,
      }
    })
    .filter(
      (component): component is CandidateScoreComponent & { value: number } => component !== null
    )

  const totalWeight = scoreComponents.reduce((sum, component) => sum + component.weight, 0)
  const overallScore =
    totalWeight > 0
      ? Math.round(
          scoreComponents.reduce((sum, component) => sum + component.value * component.weight, 0) /
            totalWeight
        )
      : null

  const flowStages = Array.isArray(candidate.job?.hiringFlowSnapshot?.stages)
    ? (candidate.job?.hiringFlowSnapshot?.stages as string[])
    : []
  const flowStageKeys = flowStages.map((stage) => normalizeStageKey(stage))

  const candidateStageName =
    stageDisplayNames[candidate.stage] || candidate.customStageName || candidate.stage
  const candidateStageKey = normalizeStageKey(candidateStageName)

  const interviewsByStage = new Map<string, typeof interviews[number]>()
  interviews.forEach((interview) => {
    const key = normalizeStageKey(interview.stageName || stageDisplayNames[interview.stage] || interview.stage)
    if (!key) return
    const existing = interviewsByStage.get(key)
    const nextDate = interview.completedAt || interview.scheduledAt
    const prevDate = existing?.completedAt || existing?.scheduledAt
    if (!existing || (nextDate && (!prevDate || nextDate > prevDate))) {
      interviewsByStage.set(key, interview)
    }
  })

  const assessmentsByStage = new Map<string, typeof assessments[number]>()
  const assessmentStageKeys = flowStages
    .filter((stage) => /assessment|test|case|exercise|trial/i.test(stage))
    .map((stage) => normalizeStageKey(stage))
  assessmentStageKeys.forEach((key, index) => {
    const assessment = assessments[index]
    if (assessment) {
      assessmentsByStage.set(key, assessment)
    }
  })

  const stageRows = flowStages.map((stage, index) => {
    const key = flowStageKeys[index]
    const interview = interviewsByStage.get(key)
    const assessment = assessmentsByStage.get(key)
    const score = normalizeTo100(
      interview?.overallScore ?? interview?.score ?? assessment?.overallScore ?? assessment?.qualityScore
    )
    const date = interview?.completedAt || interview?.scheduledAt || assessment?.completedAt || assessment?.startedAt

    let status = 'Upcoming'
    if (candidateStageKey && key) {
      if (key === candidateStageKey) {
        status = 'Current'
      } else {
        const candidateIndex = flowStageKeys.indexOf(candidateStageKey)
        if (candidateIndex > -1 && index < candidateIndex) {
          status = 'Completed'
        }
      }
    }
    if (interview?.status === 'COMPLETED' || assessment?.status === 'COMPLETED') {
      status = 'Completed'
    }

    return {
      name: stage,
      status,
      date: formatDate(date),
      score: formatScore(score ?? null),
    }
  })

  const mustValidate = Array.isArray(candidate.mustValidate) ? candidate.mustValidate : []
  const recommendationStrengths = Array.isArray(latestAnalysis?.strengths)
    ? (latestAnalysis?.strengths as string[])
    : Array.isArray(candidate.recommendationStrengths)
      ? (candidate.recommendationStrengths as string[])
      : []
  const recommendationConcerns = Array.isArray(latestAnalysis?.concerns)
    ? (latestAnalysis?.concerns as Array<string | { title?: string; description?: string }>)
        .map((item) => (typeof item === 'string' ? item : item.title || item.description || ''))
        .filter(Boolean)
    : []

  const assessmentsSummary = assessments.map((assessment) => ({
    name: assessment.template?.name || 'Assessment',
    status: assessment.status.replace('_', ' '),
    score: formatScore(
      normalizeTo100(
        assessment.overallScore ?? assessment.qualityScore ?? assessment.completionPercent
      )
    ),
    completedAt: formatDate(assessment.completedAt),
    summary: assessment.summary || '',
  }))

  const interviewsSummary = interviews.map((interview) => ({
    stage: interview.stageName || stageDisplayNames[interview.stage] || interview.stage,
    status: interview.status.replace('_', ' '),
    score: formatScore(normalizeTo100(interview.overallScore ?? interview.score)),
    date: formatDate(interview.completedAt || interview.scheduledAt),
  }))

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: "Inter", "Segoe UI", Arial, sans-serif;
            color: #0f172a;
            font-size: 12px;
            line-height: 1.5;
            margin: 0;
          }
          h1 { font-size: 22px; margin: 0; }
          h2 { font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; }
          .page { padding: 0; }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            padding: 18px 20px;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            background: #f8fafc;
          }
          .header h1 { margin-bottom: 4px; }
          .pill {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            background: #e0e7ff;
            color: #4338ca;
          }
          .muted { color: #64748b; font-size: 11px; }
          .score-card {
            min-width: 120px;
            text-align: center;
            padding: 12px 14px;
            border-radius: 12px;
            background: #ecfdf3;
            border: 1px solid #bbf7d0;
          }
          .score-card .value { font-size: 28px; font-weight: 700; color: #16a34a; }
          .section { margin-top: 18px; }
          .section-title {
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }
          .two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
          }
          .table th,
          .table td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          .table th {
            text-align: left;
            font-size: 11px;
            color: #475569;
            background: #f8fafc;
          }
          .table .label { width: 140px; color: #475569; font-weight: 600; }
          .center { text-align: center; }
          .list {
            margin: 0;
            padding-left: 18px;
          }
          .list li { margin-bottom: 4px; }
          .summary-box {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
            background: #ffffff;
          }
          .tag {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            background: #e2e8f0;
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div>
              <h1>${escapeHtml(candidate.name)}</h1>
              <div class="muted">${escapeHtml(candidate.currentRole || 'Candidate')}</div>
              <div style="margin-top: 6px;">
                <span class="pill">${escapeHtml(candidate.job?.title || 'Role')}</span>
                <span class="pill" style="background:#d1fae5;color:#047857;">${escapeHtml(candidateStageName)}</span>
              </div>
              <div class="muted" style="margin-top: 8px;">
                ${escapeHtml(candidate.email)}
                ${candidate.phone ? ` | ${escapeHtml(candidate.phone)}` : ''}
                ${candidate.linkedinUrl ? ` | ${escapeHtml(candidate.linkedinUrl)}` : ''}
              </div>
            </div>
            <div class="score-card">
              <div class="value">${overallScore ?? '-'}</div>
              <div class="muted">Overall Score</div>
              <div class="muted" style="margin-top: 4px;">Weighted profile score</div>
            </div>
          </div>

          <div class="section two-col">
            <div class="summary-box">
              <div class="section-title">
                <h2>Profile Snapshot</h2>
              </div>
              <table class="table">
                ${buildRow('Current Company', candidate.currentCompany)}
                ${buildRow('Location', candidate.location)}
                ${buildRow('Experience', typeof candidate.yearsOfExperience === 'number' ? `${candidate.yearsOfExperience} years` : null)}
                ${buildRow('Applied Date', formatDate(candidate.appliedAt))}
                ${buildRow('Decision', candidate.decisionStatus || 'Pending')}
              </table>
            </div>
            <div class="summary-box">
              <div class="section-title">
                <h2>Compensation</h2>
              </div>
              <table class="table">
                ${buildRow(
                  'Salary Expectation',
                  typeof candidate.salaryExpMin === 'number' && typeof candidate.salaryExpMax === 'number'
                    ? `$${candidate.salaryExpMin.toLocaleString()} - $${candidate.salaryExpMax.toLocaleString()}`
                    : null
                )}
                ${buildRow('Notice Period', candidate.noticePeriod)}
                ${buildRow('MBTI', candidate.mbtiType)}
              </table>
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              <h2>Stage Progress</h2>
              <span class="muted">Hiring flow snapshot</span>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th class="center">Status</th>
                  <th class="center">Date</th>
                  <th class="center">Score</th>
                </tr>
              </thead>
              <tbody>
                ${buildStageRows(stageRows)}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">
              <h2>Score Breakdown</h2>
              <span class="muted">Weighted inputs used for overall score</span>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Description</th>
                  <th class="center">Weight</th>
                  <th class="center">Score</th>
                </tr>
              </thead>
              <tbody>
                ${buildScoreRows(scoreComponents)}
              </tbody>
            </table>
          </div>

          <div class="section two-col">
            <div class="summary-box">
              <div class="section-title">
                <h2>BlueAI Summary</h2>
              </div>
              <p>${latestAnalysis?.summary ? escapeHtml(latestAnalysis.summary) : 'No BlueAI summary yet.'}</p>
              <div style="margin-top: 10px;">
                <div class="tag">Strengths</div>
                ${buildList(recommendationStrengths)}
              </div>
              <div style="margin-top: 10px;">
                <div class="tag">Areas to Explore</div>
                ${buildList(recommendationConcerns)}
              </div>
            </div>
            <div class="summary-box">
              <div class="section-title">
                <h2>Must Validate</h2>
              </div>
              ${buildList(mustValidate)}
            </div>
          </div>

          <div class="section two-col">
            <div class="summary-box">
              <div class="section-title">
                <h2>Interviews</h2>
              </div>
              <table class="table">
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th class="center">Status</th>
                    <th class="center">Date</th>
                    <th class="center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    interviewsSummary.length
                      ? interviewsSummary
                          .map((interview) => `
                            <tr>
                              <td>${escapeHtml(interview.stage)}</td>
                              <td class="center">${escapeHtml(interview.status)}</td>
                              <td class="center">${escapeHtml(interview.date)}</td>
                              <td class="center">${escapeHtml(interview.score)}</td>
                            </tr>
                          `)
                          .join('')
                      : '<tr><td colspan="4" class="muted">No interviews recorded.</td></tr>'
                  }
                </tbody>
              </table>
            </div>
            <div class="summary-box">
              <div class="section-title">
                <h2>Assessments</h2>
              </div>
              <table class="table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th class="center">Status</th>
                    <th class="center">Score</th>
                    <th class="center">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    assessmentsSummary.length
                      ? assessmentsSummary
                          .map((assessment) => `
                            <tr>
                              <td>${escapeHtml(assessment.name)}</td>
                              <td class="center">${escapeHtml(assessment.status)}</td>
                              <td class="center">${escapeHtml(assessment.score)}</td>
                              <td class="center">${escapeHtml(assessment.completedAt)}</td>
                            </tr>
                          `)
                          .join('')
                      : '<tr><td colspan="4" class="muted">No assessments recorded.</td></tr>'
                  }
                </tbody>
              </table>
              ${
                assessmentsSummary.some((assessment) => assessment.summary)
                  ? `<p class="muted" style="margin-top: 8px;">Assessment notes included on candidate record.</p>`
                  : ''
              }
            </div>
          </div>

          <div class="section">
          <div class="section-title">
            <h2>Experience Summary</h2>
            <span class="muted">Resume highlights</span>
          </div>
          <p>${candidate.resumeSummary || candidate.bio
            ? escapeHtml(candidate.resumeSummary || candidate.bio || '')
            : 'No resume summary available.'
          }</p>
        </div>
        </div>
      </body>
    </html>
  `

  const pdfBuffer = await renderHtmlToPdfBuffer(html)
  const fileNameBase = safeFileName(candidate.name || 'candidate')
  const fileName = `candidate-profile-${fileNameBase || 'export'}.pdf`

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
