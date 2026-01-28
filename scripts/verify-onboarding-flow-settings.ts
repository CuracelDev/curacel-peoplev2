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
  // NextAuth + Next router may not trigger a full navigation event.
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

async function getAppCount() {
  const count = await prisma.app.count()
  return count
}

async function main() {
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
  const email = process.env.DEV_SIGNIN_EMAIL ?? 'admin@example.com'
  const testStepName = 'E2E Test Manual Step (delete me)'
  const expectedApps = await getAppCount()

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1024, height: 768 })

    await signIn(page, baseUrl, email)

    await page.goto(`${baseUrl}/settings/onboarding-flow`, { waitUntil: 'networkidle2' })
    await page.waitForFunction(() => document.body.innerText.includes('Onboarding flow'), { timeout: 60000 })

    await page.waitForFunction(
      () => document.querySelectorAll('tbody tr').length > 0 || document.body.innerText.includes('No onboarding steps yet'),
      { timeout: 60000 }
    )

    const rowCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length)
    invariant(rowCount > 0, 'No onboarding flow rows found')

    await clickButtonByText(page, 'Add step')

    if (expectedApps > 0) {
      // Switch to integration step and ensure the app list includes all integrations.
      await page.waitForSelector('[role="dialog"]', { timeout: 20000 })
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
      invariant(
        optionCount >= expectedApps,
        `Expected at least ${expectedApps} integration apps, but saw ${optionCount}`
      )

      // Close the dropdown and switch back to manual for the create/delete cycle.
      await page.keyboard.press('Escape')
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

    const beforeSubmit = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const nameInput = dialog?.querySelector('input#name') as HTMLInputElement | null
      const submit = dialog?.querySelector('button[type="submit"]') as HTMLButtonElement | null
      return {
        nameValue: nameInput?.value ?? null,
        submitDisabled: submit?.disabled ?? null,
      }
    })
    invariant(beforeSubmit.nameValue === testStepName, `Name input did not receive typed value: ${beforeSubmit.nameValue}`)
    invariant(beforeSubmit.submitDisabled === false, 'Submit button is disabled unexpectedly')

    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const submit = dialog?.querySelector('button[type="submit"]') as HTMLButtonElement | null
      if (!submit) throw new Error('Dialog submit button not found')
      submit.click()
    })

    // Either the dialog closes (success) or it stays open (likely an error).
    try {
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 15000 })
    } catch {
      const dialogText = await page.evaluate(
        () => (document.querySelector('[role="dialog"]') as HTMLElement | null)?.innerText ?? ''
      )
      throw new Error(`Dialog did not close after submit. Dialog text:\n${dialogText}`)
    }

    await page.waitForFunction(
      (name: string) => document.body.innerText.includes(name),
      { timeout: 30000 },
      testStepName
    )

    console.log('ok: onboarding flow settings add step')
  } finally {
    try {
      await prisma.onboardingTaskTemplate.deleteMany({
        where: { name: 'E2E Test Manual Step (delete me)' },
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
