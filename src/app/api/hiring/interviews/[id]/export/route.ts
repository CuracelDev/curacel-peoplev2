import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { format } from 'date-fns'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import prisma from '@/lib/prisma'
import { renderHtmlToPdfBuffer } from '@/lib/pdf'

export const runtime = 'nodejs'

const stageDisplayNames: Record<string, string> = {
  HR_SCREEN: 'People Chat',
  TEAM_CHAT: 'Team Chat',
  ADVISOR_CHAT: 'Advisor Chat',
  TECHNICAL: 'Coding Test',
  PANEL: 'Panel Interview',
  CEO_CHAT: 'CEO Chat',
  TRIAL: 'Work Trial',
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')

const formatDate = (value?: Date | string | null) => {
  if (!value) return '-'
  return format(new Date(value), 'MMM d, yyyy h:mm a')
}

const formatScore = (value?: number | null) => {
  if (typeof value !== 'number') return '-'
  return `${value}/5`
}

const safeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const getRecommendationBadge = (rec?: string | null) => {
  if (!rec) return '<span class="badge badge-gray">No recommendation</span>'
  const colors: Record<string, string> = {
    STRONG_HIRE: 'badge-green',
    HIRE: 'badge-green',
    MAYBE: 'badge-yellow',
    NO_HIRE: 'badge-red',
    STRONG_NO_HIRE: 'badge-red',
  }
  const labels: Record<string, string> = {
    STRONG_HIRE: 'Strong Hire',
    HIRE: 'Hire',
    MAYBE: 'Maybe / Need More Info',
    NO_HIRE: 'No Hire',
    STRONG_NO_HIRE: 'Strong No Hire',
  }
  return `<span class="badge ${colors[rec] || 'badge-gray'}">${labels[rec] || rec}</span>`
}

const getRatingStars = (rating?: number | null) => {
  if (!rating) return '-'
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const interview = await prisma.candidateInterview.findUnique({
    where: { id: params.id },
    include: {
      candidate: {
        include: {
          job: {
            select: { title: true, department: true },
          },
        },
      },
      interviewType: {
        include: {
          rubricTemplate: {
            include: {
              criteria: true,
            },
          },
        },
      },
      assignedQuestions: {
        include: {
          question: true,
        },
      },
      interviewerTokens: true,
      evaluations: true,
    },
  })

  if (!interview) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  const interviewers = (interview.interviewers as Array<{
    employeeId?: string
    name: string
    email: string
  }>) || []

  // Build questions section from assigned questions
  const assignedQuestions = interview.assignedQuestions || []
  const questionsHtml = assignedQuestions.length > 0
    ? assignedQuestions.map((aq, idx) => {
        const q = aq.question
        if (!q) return ''
        return `
        <div class="question-card">
          <div class="question-header">
            <span class="question-number">${idx + 1}</span>
            <span class="category-badge">${escapeHtml(q.category || 'General')}</span>
          </div>
          <p class="question-text">${escapeHtml(q.text || '')}</p>
          ${q.followUp ? `
            <div class="follow-ups">
              <strong>Follow-up:</strong>
              <p>${escapeHtml(q.followUp)}</p>
            </div>
          ` : ''}
        </div>
      `
      }).join('')
    : '<p class="muted">No questions configured for this interview.</p>'

  // Build interviewer responses section
  const tokenResponses = interview.interviewerTokens || []
  const interviewerResponsesHtml = tokenResponses.length > 0
    ? tokenResponses
        .filter(t => (t as { tokenType?: string }).tokenType !== 'PEOPLE_TEAM')
        .map(token => {
          const responses = (token.questionResponses as Array<{
            questionId: string
            score?: number
            notes?: string
            questionText?: string
          }>) || []

          return `
            <div class="interviewer-section">
              <div class="interviewer-header">
                <div class="interviewer-info">
                  <strong>${escapeHtml(token.interviewerName)}</strong>
                  <span class="muted">${escapeHtml(token.interviewerEmail)}</span>
                </div>
                <div class="interviewer-status">
                  ${token.evaluationStatus === 'SUBMITTED'
                    ? '<span class="badge badge-green">Submitted</span>'
                    : token.evaluationStatus === 'IN_PROGRESS'
                      ? '<span class="badge badge-yellow">In Progress</span>'
                      : '<span class="badge badge-gray">Pending</span>'
                  }
                </div>
              </div>

              ${token.evaluationStatus === 'SUBMITTED' ? `
                <div class="evaluation-summary">
                  <div class="eval-row">
                    <span class="eval-label">Overall Rating:</span>
                    <span class="eval-value">${getRatingStars(token.overallRating)}</span>
                  </div>
                  <div class="eval-row">
                    <span class="eval-label">Recommendation:</span>
                    ${getRecommendationBadge(token.recommendation)}
                  </div>
                  ${token.evaluationNotes ? `
                    <div class="eval-notes">
                      <strong>Notes:</strong>
                      <p>${escapeHtml(token.evaluationNotes)}</p>
                    </div>
                  ` : ''}
                </div>

                ${responses.length > 0 ? `
                  <div class="question-responses">
                    <h4>Question Responses</h4>
                    ${responses.map(r => `
                      <div class="response-card">
                        <div class="response-question">${escapeHtml(r.questionText || 'Question')}</div>
                        <div class="response-score">Score: ${r.score ? getRatingStars(r.score) : '-'}</div>
                        ${r.notes ? `<div class="response-notes">${escapeHtml(r.notes)}</div>` : ''}
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              ` : '<p class="muted">Awaiting evaluation submission.</p>'}
            </div>
          `
        }).join('')
    : '<p class="muted">No interviewer feedback yet.</p>'

  // Build Fireflies section
  const firefliesHtml = interview.firefliesSummary || interview.firefliesTranscript
    ? `
      <div class="section">
        <div class="section-title"><h2>Meeting Notes (Fireflies)</h2></div>
        ${interview.firefliesSummary ? `
          <div class="fireflies-card">
            <h4>Summary</h4>
            <p>${escapeHtml(interview.firefliesSummary)}</p>
          </div>
        ` : ''}
        ${(interview.firefliesActionItems as string[] | null)?.length ? `
          <div class="fireflies-card">
            <h4>Action Items</h4>
            <ul>
              ${(interview.firefliesActionItems as string[]).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${(interview.firefliesHighlights as string[] | null)?.length ? `
          <div class="fireflies-card">
            <h4>Highlights</h4>
            <ul>
              ${(interview.firefliesHighlights as string[]).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `
    : ''

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: "Inter", "Segoe UI", Arial, sans-serif;
            color: #0f172a;
            font-size: 11px;
            line-height: 1.5;
            margin: 0;
            padding: 20px;
          }
          h1 { font-size: 20px; margin: 0 0 4px 0; }
          h2 { font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; }
          h3 { font-size: 12px; margin: 0 0 8px 0; }
          h4 { font-size: 11px; margin: 0 0 6px 0; color: #475569; }
          .muted { color: #64748b; font-size: 10px; }

          .header {
            display: flex;
            justify-content: space-between;
            padding: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #f8fafc;
            margin-bottom: 16px;
          }
          .header-left h1 { color: #0f172a; }
          .header-meta { margin-top: 8px; }
          .header-meta span { margin-right: 16px; }

          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 600;
          }
          .badge-green { background: #dcfce7; color: #166534; }
          .badge-yellow { background: #fef9c3; color: #854d0e; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          .badge-gray { background: #f1f5f9; color: #475569; }
          .badge-blue { background: #dbeafe; color: #1e40af; }

          .section {
            margin-bottom: 16px;
            padding: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }
          .section-title {
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .info-label { color: #64748b; }
          .info-value { font-weight: 500; }

          .question-card {
            padding: 10px;
            margin-bottom: 8px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 3px solid #6366f1;
          }
          .question-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          }
          .question-number {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #6366f1;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 600;
          }
          .category-badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            background: #e0e7ff;
            color: #4338ca;
          }
          .question-text { margin: 0; font-size: 11px; }
          .follow-ups { margin-top: 8px; font-size: 10px; color: #64748b; }
          .follow-ups ul { margin: 4px 0 0 0; padding-left: 16px; }

          .interviewer-section {
            padding: 12px;
            margin-bottom: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          .interviewer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .interviewer-info { display: flex; flex-direction: column; }
          .evaluation-summary {
            background: #f8fafc;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 10px;
          }
          .eval-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          }
          .eval-label { color: #64748b; min-width: 100px; }
          .eval-notes { margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
          .eval-notes p { margin: 4px 0 0 0; }

          .question-responses { margin-top: 10px; }
          .response-card {
            padding: 8px;
            margin-bottom: 6px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
          }
          .response-question { font-weight: 500; margin-bottom: 4px; }
          .response-score { font-size: 10px; color: #f59e0b; }
          .response-notes { margin-top: 4px; font-size: 10px; color: #64748b; }

          .fireflies-card {
            padding: 10px;
            margin-bottom: 8px;
            background: #f0fdf4;
            border-radius: 8px;
            border: 1px solid #bbf7d0;
          }
          .fireflies-card h4 { color: #166534; }
          .fireflies-card ul { margin: 0; padding-left: 16px; }
          .fireflies-card p { margin: 0; }

          .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 9px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>${escapeHtml(stageDisplayNames[interview.stage] || interview.stageName || interview.stage)}</h1>
            <div class="muted">${escapeHtml(interview.candidate.name)} • ${escapeHtml(interview.candidate.job?.title || 'Position')}</div>
            <div class="header-meta">
              <span><strong>Date:</strong> ${formatDate(interview.scheduledAt)}</span>
              <span><strong>Duration:</strong> ${interview.duration || 60} min</span>
              <span><strong>Status:</strong> <span class="badge ${interview.status === 'COMPLETED' ? 'badge-green' : interview.status === 'CANCELLED' ? 'badge-red' : 'badge-blue'}">${interview.status}</span></span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title"><h2>Interview Details</h2></div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Candidate</span>
              <span class="info-value">${escapeHtml(interview.candidate.name)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email</span>
              <span class="info-value">${escapeHtml(interview.candidate.email)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Position</span>
              <span class="info-value">${escapeHtml(interview.candidate.job?.title || '-')}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Department</span>
              <span class="info-value">${escapeHtml(interview.candidate.job?.department || '-')}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Interview Type</span>
              <span class="info-value">${escapeHtml(stageDisplayNames[interview.stage] || interview.stageName || interview.stage)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Meeting Link</span>
              <span class="info-value">${interview.meetingLink ? 'Configured' : '-'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title"><h2>Interviewers (${interviewers.length})</h2></div>
          ${interviewers.length > 0
            ? interviewers.map(i => `
                <div style="padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                  <strong>${escapeHtml(i.name)}</strong>
                  <span class="muted"> - ${escapeHtml(i.email)}</span>
                </div>
              `).join('')
            : '<p class="muted">No interviewers assigned.</p>'
          }
        </div>

        <div class="section">
          <div class="section-title"><h2>Interview Questions (${assignedQuestions.length})</h2></div>
          ${questionsHtml}
        </div>

        <div class="section">
          <div class="section-title"><h2>Interviewer Feedback</h2></div>
          ${interviewerResponsesHtml}
        </div>

        ${firefliesHtml}

        ${interview.feedback ? `
          <div class="section">
            <div class="section-title"><h2>Overall Interview Feedback</h2></div>
            <p>${escapeHtml(interview.feedback)}</p>
          </div>
        ` : ''}

        <div class="footer">
          Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')} • Curacel People
        </div>
      </body>
    </html>
  `

  const pdfBuffer = await renderHtmlToPdfBuffer(html)
  const candidateName = safeFileName(interview.candidate.name || 'candidate')
  const interviewType = safeFileName(interview.stageName || interview.stage)
  const fileName = `interview-${candidateName}-${interviewType}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
