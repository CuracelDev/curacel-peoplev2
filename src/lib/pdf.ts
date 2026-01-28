import htmlToPdf from 'html-pdf-node'

export async function renderHtmlToPdfBuffer(html: string): Promise<Buffer> {
  const file = { content: html }
  const buffer = await htmlToPdf.generatePdf(file, {
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  })
  return buffer
}

