import htmlToPdf from 'html-pdf-node'

export async function renderHtmlToPdfBuffer(html: string): Promise<Buffer> {
  console.log('[PDF] Starting PDF generation...')
  const file = { content: html }
  try {
    const buffer = await htmlToPdf.generatePdf(file, {
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    })
    console.log('[PDF] PDF generation successful, buffer size:', buffer.length)
    return buffer
  } catch (error) {
    console.error('[PDF] PDF generation failed:', error)
    throw error
  }
}

