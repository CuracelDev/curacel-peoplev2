import { loadEnvConfig } from '@next/env'
import puppeteer from 'puppeteer'
import prisma from '@/lib/prisma'

loadEnvConfig(process.cwd())

type ViewportCase = {
  name: string
  width: number
  height: number
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function signIn(page: puppeteer.Page, baseUrl: string, email: string) {
  await page.goto(`${baseUrl}/auth/signin`, { waitUntil: 'networkidle2' })
  const emailInput = await page.$('input[type="email"]')
  if (!emailInput) {
    // Already signed in (redirected away from the sign-in page).
    return
  }

  await page.click('input[type="email"]', { clickCount: 3 })
  await page.type('input[type="email"]', email)
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('Sign in as Admin')
    )
    if (!button) throw new Error('Sign in button not found')
    button.click()
  })
  await page
    .waitForFunction(() => !window.location.pathname.startsWith('/auth/signin'), { timeout: 60000 })
    .catch(() => null)
}

async function getOfferId(cliArg?: string) {
  if (cliArg) return cliArg
  const offer = await prisma.offer.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  invariant(offer?.id, 'No offers found in database')
  return offer.id
}

async function getOrganizationLetterheadExpectations() {
  const org = await prisma.organization.findFirst({
    select: {
      letterheadEmail: true,
      letterheadWebsite: true,
      letterheadPhone: true,
      letterheadAddress: true,
    },
  })
  return {
    email: org?.letterheadEmail?.trim() || null,
    website: org?.letterheadWebsite?.trim() || null,
    phone: org?.letterheadPhone?.trim() || null,
    address: org?.letterheadAddress?.trim() || null,
  }
}

async function verifyOfferPreview(page: puppeteer.Page, baseUrl: string, offerId: string) {
  await page.goto(`${baseUrl}/contracts/${offerId}`, { waitUntil: 'networkidle2' })
  await page.waitForFunction(() => document.body.innerText.includes('Contract letter'), { timeout: 60000 })
  await page.waitForTimeout(1500)

  return page.evaluate(() => {
    const doc = document.documentElement
    const previewHost = Array.from(document.querySelectorAll('div')).find(
      (el) => el.className.includes('prose') && el.className.includes('shadow-inner')
    )

    const letterheadExists = Boolean(previewHost?.querySelector('[data-curacel-letterhead="1"]'))
    const letterheadText =
      (previewHost?.querySelector('[data-curacel-letterhead="1"]') as HTMLElement | null)?.innerText?.trim() ?? ''

    const rawHtmlShown =
      document.body.innerText.includes('data:image/png;base64,') ||
      document.body.innerText.includes('signature_block_image_url')

    const previewText = previewHost?.innerText?.trim() ?? ''
    const firstParagraph = previewHost?.querySelector('p')
    const paragraphText = firstParagraph?.innerText?.trim() ?? ''

    const hostRect = previewHost?.getBoundingClientRect()
    const paragraphRect = firstParagraph?.getBoundingClientRect()

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: { scrollWidth: doc.scrollWidth, scrollHeight: doc.scrollHeight },
      rawHtmlShown,
      letterheadExists,
      letterheadText,
      preview: {
        exists: Boolean(previewHost),
        textLength: previewText.length,
        firstParagraphTextLength: paragraphText.length,
        host: previewHost
          ? {
              offsetWidth: previewHost.offsetWidth,
              clientWidth: previewHost.clientWidth,
              scrollWidth: previewHost.scrollWidth,
              rect: hostRect
                ? { x: hostRect.x, y: hostRect.y, width: hostRect.width, height: hostRect.height }
                : null,
            }
          : null,
        firstParagraph: firstParagraph
          ? {
              rect: paragraphRect
                ? { x: paragraphRect.x, y: paragraphRect.y, width: paragraphRect.width, height: paragraphRect.height }
                : null,
            }
          : null,
      },
    }
  })
}

async function main() {
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
  const email = process.env.DEV_SIGNIN_EMAIL ?? 'admin@example.com'
  const offerId = await getOfferId(process.argv[2])
  const expected = await getOrganizationLetterheadExpectations()

  const viewports: ViewportCase[] = [
    { name: 'desktop', width: 1024, height: 768 },
    { name: 'mobile', width: 414, height: 896 },
  ]

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage()
      await page.setViewport({ width: viewport.width, height: viewport.height })

      await signIn(page, baseUrl, email)
      const result = await verifyOfferPreview(page, baseUrl, offerId)

      invariant(result.preview.exists, `[${viewport.name}] Preview container not found`)
      invariant(!result.rawHtmlShown, `[${viewport.name}] Signature image URL is visible in page text`)
      invariant(
        result.preview.firstParagraphTextLength > 0,
        `[${viewport.name}] Preview first paragraph is empty`
      )
      invariant(result.letterheadExists, `[${viewport.name}] Letterhead wrapper not found in preview`)
      if (expected.email) {
        invariant(
          result.letterheadText.includes(expected.email),
          `[${viewport.name}] Letterhead is missing email: ${expected.email}`
        )
      }
      if (expected.website) {
        const websiteLabel = expected.website.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
        invariant(
          result.letterheadText.includes(websiteLabel) || result.letterheadText.includes(expected.website),
          `[${viewport.name}] Letterhead is missing website: ${expected.website}`
        )
      }
      if (expected.phone) {
        invariant(
          result.letterheadText.includes(expected.phone),
          `[${viewport.name}] Letterhead is missing phone: ${expected.phone}`
        )
      }
      if (expected.address) {
        invariant(
          result.letterheadText.includes(expected.address),
          `[${viewport.name}] Letterhead is missing address: ${expected.address}`
        )
      }
      invariant(
        (result.preview.host?.offsetWidth ?? 0) < 5000,
        `[${viewport.name}] Preview container width is abnormally large: ${result.preview.host?.offsetWidth}`
      )
      invariant(
        (result.preview.host?.scrollWidth ?? 0) <= (result.preview.host?.clientWidth ?? 0) + 1,
        `[${viewport.name}] Preview container has horizontal overflow: ${result.preview.host?.scrollWidth} > ${result.preview.host?.clientWidth}`
      )
      invariant(
        result.document.scrollWidth < 5000,
        `[${viewport.name}] Document scrollWidth is abnormally large: ${result.document.scrollWidth}`
      )

      console.log(
        `[${viewport.name}] ok: previewTextLength=${result.preview.textLength}, docScrollWidth=${result.document.scrollWidth}`
      )

      await page.close()
    }
  } finally {
    await browser.close()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
