import { loadEnvConfig } from '@next/env'
import puppeteer from 'puppeteer'
import prisma from '@/lib/prisma'

loadEnvConfig(process.cwd())

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function signIn(page: puppeteer.Page, baseUrl: string, email: string) {
  await page.goto(`${baseUrl}/auth/signin`, { waitUntil: 'networkidle2' })
  const emailInput = await page.$('input[type="email"]')
  if (!emailInput) return

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

async function clickButtonByText(page: puppeteer.Page, text: string) {
  await page.evaluate((label) => {
    const button = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').trim().includes(label)
    )
    if (!button) throw new Error(`Button not found: ${label}`)
    ;(button as HTMLButtonElement).click()
  }, text)
}

async function main() {
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
  const email = process.env.DEV_SIGNIN_EMAIL ?? 'admin@example.com'
  const testStepName = 'E2E Test Offboarding Step (delete me)'
  const expectedApps = await prisma.app.count()

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1024, height: 768 })

    await signIn(page, baseUrl, email)

    await page.goto(`${baseUrl}/settings/offboarding-flow`, { waitUntil: 'networkidle2' })
    await page.waitForFunction(() => document.body.innerText.includes('Offboarding flow'), { timeout: 60000 })

    await page.waitForFunction(
      () => document.querySelectorAll('tbody tr').length > 0 || document.body.innerText.includes('No offboarding steps yet'),
      { timeout: 60000 }
    )

    await clickButtonByText(page, 'Add step')

    if (expectedApps > 0) {
      await page.waitForSelector('[role="dialog"]', { timeout: 20000 })
      // Switch to integration and check dropdown has at least all apps.
      await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        const kindCombobox = dialog?.querySelectorAll('[role="combobox"]')?.[0] as HTMLElement | undefined
        if (!kindCombobox) throw new Error('Kind combobox not found')
        kindCombobox.click()
      })
      await page.waitForSelector('[role="listbox"]', { timeout: 20000 })
      await page.evaluate(() => {
        const option = Array.from(document.querySelectorAll('[role="option"]')).find((el) =>
          (el.textContent || '').includes('Integration step')
        ) as HTMLElement | undefined
        if (!option) throw new Error('Integration step option not found')
        option.click()
      })

      await page.waitForTimeout(300)
      await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        const appCombobox = dialog?.querySelectorAll('[role="combobox"]')?.[1] as HTMLElement | undefined
        if (!appCombobox) throw new Error('App combobox not found')
        appCombobox.click()
      })
      await page.waitForSelector('[role="listbox"]', { timeout: 20000 })
      const optionCount = await page.evaluate(() => document.querySelectorAll('[role="option"]').length)
      invariant(optionCount >= expectedApps, `Expected at least ${expectedApps} integration apps, but saw ${optionCount}`)
      await page.keyboard.press('Escape')

      // Switch back to manual.
      await page.waitForTimeout(200)
      await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        const kindCombobox = dialog?.querySelectorAll('[role="combobox"]')?.[0] as HTMLElement | undefined
        if (!kindCombobox) throw new Error('Kind combobox not found')
        kindCombobox.click()
      })
      await page.waitForSelector('[role="listbox"]', { timeout: 20000 })
      await page.evaluate(() => {
        const option = Array.from(document.querySelectorAll('[role="option"]')).find((el) =>
          (el.textContent || '').includes('Manual step')
        ) as HTMLElement | undefined
        if (!option) throw new Error('Manual step option not found')
        option.click()
      })
    }

    await page.waitForSelector('input#name', { timeout: 20000 })
    await page.click('input#name', { clickCount: 3 })
    await page.type('input#name', testStepName)

    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const submit = dialog?.querySelector('button[type="submit"]') as HTMLButtonElement | null
      if (!submit) throw new Error('Dialog submit button not found')
      submit.click()
    })

    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 15000 })
    await page.waitForFunction((name: string) => document.body.innerText.includes(name), { timeout: 30000 }, testStepName)

    console.log('ok: offboarding flow settings add step')
  } finally {
    try {
      await prisma.offboardingTaskTemplate.deleteMany({
        where: { name: 'E2E Test Offboarding Step (delete me)' },
      })
    } catch {
      // ignore
    }
    await prisma.$disconnect()
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
