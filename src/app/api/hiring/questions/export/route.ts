import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import prisma from '@/lib/prisma'
import { renderHtmlToPdfBuffer } from '@/lib/pdf'
import type { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

const categoryConfig: Record<string, { name: string; color: string }> = {
    situational: { name: 'Situational', color: '#4f46e5' },
    behavioral: { name: 'Behavioral', color: '#10b981' },
    motivational: { name: 'Motivational', color: '#f59e0b' },
    technical: { name: 'Technical', color: '#db2777' },
    culture: { name: 'Culture/Values', color: '#0891b2' },
}

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;')

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const jobId = searchParams.get('jobId')
    const interviewTypeId = searchParams.get('interviewTypeId')
    const search = searchParams.get('search')
    const onlyFavorites = searchParams.get('onlyFavorites') === 'true'

    const where: Prisma.InterviewQuestionWhereInput = { isActive: true }

    if (category && category !== 'all') {
        where.category = category
    }

    if (jobId && jobId !== 'all') {
        where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : []),
            { OR: [{ jobId: jobId }, { jobId: null }] }
        ]
    }

    if (interviewTypeId && interviewTypeId !== 'all') {
        where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : []),
            { OR: [{ interviewTypeId: interviewTypeId }, { interviewTypeId: null }] }
        ]
    }

    if (search) {
        where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : []),
            {
                OR: [
                    { text: { contains: search, mode: 'insensitive' as const } },
                    { followUp: { contains: search, mode: 'insensitive' as const } },
                    { tags: { hasSome: [search] } },
                ],
            }
        ]
    }

    if (onlyFavorites) {
        where.isFavorite = true
    }

    const questions = await prisma.interviewQuestion.findMany({
        where,
        include: {
            job: { select: { title: true } },
            interviewType: { select: { name: true } },
        },
        orderBy: [
            { category: 'asc' },
            { isFavorite: 'desc' },
            { timesUsed: 'desc' },
        ],
    })

    // Group by category
    const grouped = questions.reduce((acc, q) => {
        if (!acc[q.category]) acc[q.category] = []
        acc[q.category].push(q)
        return acc
    }, {} as Record<string, typeof questions>)

    const categoryOrder = ['situational', 'behavioral', 'motivational', 'technical', 'culture']

    const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; font-size: 11px; margin: 0; padding: 0; }
          .header { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 40px; margin-bottom: 30px; }
          .header h1 { font-size: 28px; margin: 0; color: #0f172a; font-weight: 800; letter-spacing: -0.02em; }
          .header p { margin: 8px 0 0; color: #64748b; font-size: 13px; }
          .content { padding: 0 40px 40px; }
          .category-section { margin-bottom: 35px; }
          .category-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; page-break-after: avoid; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
          .category-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
          .question-card { border: 1px solid #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 12px; page-break-inside: avoid; background: #ffffff; }
          .question-text { font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #0f172a; line-height: 1.4; }
          .follow-up { font-style: italic; color: #475569; margin-bottom: 12px; border-left: 2px solid #e2e8f0; padding-left: 12px; font-size: 12px; }
          .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
          .tag { background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 600; }
          .job-badge { background: #eef2ff; color: #4f46e5; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 700; }
          .type-badge { background: #fffbeb; color: #b45309; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 700; }
          .favorite-star { color: #f59e0b; font-size: 14px; }
          .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 9px; color: #94a3b8; padding: 15px 0; background: white; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Question Bank</h1>
          <p>Curacel Internal Interview Resources • ${new Date().toLocaleDateString()} • ${questions.length} Questions</p>
        </div>

        <div class="content">
          ${categoryOrder
            .map((catId) => {
                const catQuestions = grouped[catId]
                if (!catQuestions?.length) return ''
                const catInfo = categoryConfig[catId]

                return `
            <div class="category-section">
              <div class="category-header">
                <span class="category-title" style="color: ${catInfo.color}">${catInfo.name}</span>
                <span style="color: #94a3b8">(${catQuestions.length})</span>
              </div>
              ${catQuestions
                        .map(
                            (q) => `
                <div class="question-card">
                  <div class="question-text">
                    ${q.isFavorite ? '<span class="favorite-star">★</span> ' : ''}${escapeHtml(q.text)}
                  </div>
                  ${q.followUp ? `<div class="follow-up">${escapeHtml(q.followUp)}</div>` : ''}
                  <div class="meta">
                    ${q.job ? `<span class="job-badge">${escapeHtml(q.job.title)}</span>` : ''}
                    ${q.interviewType ? `<span class="type-badge">${escapeHtml(q.interviewType.name)}</span>` : ''}
                    ${q.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                  </div>
                </div>
              `
                        )
                        .join('')}
            </div>
          `
            })
            .join('')}
        </div>

        <div class="footer">
          Generated by Curacel PeopleOS • Internal Recruitment Resource
        </div>
      </body>
    </html>
  `

    const pdfBuffer = await renderHtmlToPdfBuffer(html)

    return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="question-bank-export.pdf"`,
        },
    })
}
