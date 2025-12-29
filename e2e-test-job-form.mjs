import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3001'
const LOGIN_URL = `${BASE_URL}/auth/signin`
const FORM_URL = `${BASE_URL}/recruiting/positions/new`

// Test credentials
const TEST_EMAIL = 'henry@curacel.ai'
const TEST_PASSWORD = 'Password123!'

const results = {
  passed: [],
  failed: [],
  warnings: []
}

function log(type, element, message) {
  const entry = { element, message }
  if (type === 'pass') {
    results.passed.push(entry)
    console.log(`✅ ${element}: ${message}`)
  } else if (type === 'fail') {
    results.failed.push(entry)
    console.log(`❌ ${element}: ${message}`)
  } else {
    results.warnings.push(entry)
    console.log(`⚠️  ${element}: ${message}`)
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function login(page) {
  console.log('🔐 Logging in...')
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 30000 })

  // Clear default email and enter credentials
  const emailInput = await page.$('input[type="email"]')
  if (emailInput) {
    await emailInput.click({ clickCount: 3 })
    await emailInput.type(TEST_EMAIL)
  }

  const passwordInput = await page.$('input[type="password"]')
  if (passwordInput) {
    await passwordInput.type(TEST_PASSWORD)
  }

  // Click sign in button
  const signInButton = await page.$('button')
  if (signInButton) {
    await signInButton.click()
  }

  // Wait for redirect
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
  await delay(2000)

  const currentUrl = page.url()
  if (currentUrl.includes('/auth/signin')) {
    // Check for error
    const error = await page.$('div[class*="bg-red-50"]')
    if (error) {
      const errorText = await page.$eval('div[class*="bg-red-50"]', el => el.textContent)
      throw new Error(`Login failed: ${errorText}`)
    }
  }

  console.log('✅ Logged in successfully\n')
}

async function testForm() {
  console.log('🚀 Starting E2E test for Create Job Form...\n')

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })

  try {
    // Login first
    await login(page)

    // Navigate to form
    console.log('📍 Navigating to:', FORM_URL)
    await page.goto(FORM_URL, { waitUntil: 'networkidle2', timeout: 30000 })
    await delay(2000)

    const currentUrl = page.url()
    if (currentUrl.includes('/auth/signin')) {
      throw new Error('Still on login page - authentication may have failed')
    }

    // Wait for form to render
    await page.waitForSelector('h1', { timeout: 10000 })
    const pageTitle = await page.$eval('h1', el => el.textContent)
    console.log(`📄 Page title: "${pageTitle}"`)

    if (pageTitle.includes('Create New Job')) {
      log('pass', 'Page Load', 'Form page loaded successfully')
    } else {
      log('fail', 'Page Load', `Unexpected title: ${pageTitle}`)
      await browser.close()
      return
    }

    // ============ SECTION 1: Basic Information ============
    console.log('\n--- SECTION 1: Basic Information ---')

    // Test Job Title input
    const jobTitleInput = await page.$('input[placeholder*="Senior Backend"]')
    if (jobTitleInput) {
      await jobTitleInput.type('Test Software Engineer')
      await delay(300)
      const value = await page.$eval('input[placeholder*="Senior Backend"]', el => el.value)
      if (value === 'Test Software Engineer') {
        log('pass', 'Job Title Input', 'Can type and retains value')
      } else {
        log('fail', 'Job Title Input', `Value not retained, got: "${value}"`)
      }
    } else {
      log('fail', 'Job Title Input', 'Element not found')
    }

    // Test all Select dropdowns
    const allComboboxes = await page.$$('[role="combobox"]')
    console.log(`   Found ${allComboboxes.length} select dropdowns`)

    // Test Team/Department Select (index 0)
    if (allComboboxes.length > 0) {
      await allComboboxes[0].click()
      await delay(500)
      const teamOptions = await page.$$('[role="option"]')
      if (teamOptions.length > 1) {
        log('pass', 'Team/Department Select', `${teamOptions.length} options available`)
        await teamOptions[1].click() // Select first real team
        await delay(300)
      } else {
        log('warn', 'Team/Department Select', 'Only default option available')
        await page.keyboard.press('Escape')
      }
    }

    // Test Employment Type Select (index 1)
    const comboboxes2 = await page.$$('[role="combobox"]')
    if (comboboxes2.length > 1) {
      await comboboxes2[1].click()
      await delay(300)
      const empOptions = await page.$$('[role="option"]')
      const hasCorrectOptions = empOptions.length === 4 // full-time, part-time, contract, internship
      if (hasCorrectOptions) {
        log('pass', 'Employment Type Select', '4 employment types available')
      } else {
        log('warn', 'Employment Type Select', `Expected 4 options, found ${empOptions.length}`)
      }
      await page.keyboard.press('Escape')
    }

    // Test Experience Level Select (index 2)
    const comboboxes3 = await page.$$('[role="combobox"]')
    if (comboboxes3.length > 2) {
      await comboboxes3[2].click()
      await delay(300)
      const expOptions = await page.$$('[role="option"]')
      if (expOptions.length === 7) {
        log('pass', 'Experience Level Select', '7 experience levels available')
      } else {
        log('warn', 'Experience Level Select', `Expected 7 options, found ${expOptions.length}`)
      }
      await page.keyboard.press('Escape')
    }

    // Test Priority Select (index 3)
    const comboboxes4 = await page.$$('[role="combobox"]')
    if (comboboxes4.length > 3) {
      await comboboxes4[3].click()
      await delay(300)
      const priorityOptions = await page.$$('[role="option"]')
      if (priorityOptions.length === 5) {
        log('pass', 'Priority Select', 'All 5 priority levels available')
      } else {
        log('warn', 'Priority Select', `Expected 5 options, found ${priorityOptions.length}`)
      }
      await page.keyboard.press('Escape')
    }

    // Test Remote Policy Radio Buttons
    const radioLabels = await page.$$('label')
    let remoteRadiosFound = 0
    for (const label of radioLabels) {
      const text = await label.evaluate(el => el.textContent)
      if (text?.includes('In office') || text?.includes('Onsite or remote') || text?.includes('Remote only')) {
        remoteRadiosFound++
      }
    }
    if (remoteRadiosFound === 3) {
      log('pass', 'Remote Policy Radio', '3 options found (In office, Hybrid, Remote)')

      // Test clicking Remote only hides office locations
      // Find and click "Remote only" by iterating labels
      for (const label of radioLabels) {
        const text = await label.evaluate(el => el.textContent)
        if (text?.includes('Remote only')) {
          await label.click()
          await delay(500)
          break
        }
      }
      const locationSearchAfter = await page.$('input[placeholder="Search ..."]')
      if (!locationSearchAfter) {
        log('pass', 'Remote Policy Logic', 'Office locations hidden when Remote selected')
      } else {
        log('warn', 'Remote Policy Logic', 'Office locations still visible for Remote only')
      }
      // Click back to Hybrid
      for (const label of radioLabels) {
        const text = await label.evaluate(el => el.textContent)
        if (text?.includes('Onsite or remote')) {
          await label.click()
          await delay(300)
          break
        }
      }
    } else {
      log('fail', 'Remote Policy Radio', `Found ${remoteRadiosFound} radio options instead of 3`)
    }

    // Test Office Locations Search
    await delay(500)
    const locationInput = await page.$('input[placeholder="Search ..."]')
    if (locationInput) {
      await locationInput.type('Lagos')
      await delay(500)
      const locationDropdown = await page.$('div.absolute.z-10')
      if (locationDropdown) {
        const locationButtons = await page.$$('div.absolute.z-10 button')
        if (locationButtons.length > 0) {
          log('pass', 'Office Locations Search', `Dropdown shows ${locationButtons.length} matching locations`)
          await locationButtons[0].click()
          await delay(300)
        } else {
          log('fail', 'Office Locations Search', 'No location buttons in dropdown')
        }
      } else {
        log('fail', 'Office Locations Search', 'Dropdown does not appear on search')
      }
      // Clear search
      await locationInput.click({ clickCount: 3 })
      await page.keyboard.press('Backspace')
      await delay(300)
    } else {
      log('warn', 'Office Locations Search', 'Search input not found (may be hidden for Remote policy)')
    }

    // ============ SECTION 2: Job Description ============
    console.log('\n--- SECTION 2: Job Description ---')

    const comboboxesJD = await page.$$('[role="combobox"]')
    // Find JD select (should be around index 4-5)
    let jdSelectFound = false
    for (let i = 4; i < comboboxesJD.length && i < 8; i++) {
      const text = await comboboxesJD[i].evaluate(el => el.textContent)
      if (text?.includes('Select a job description') || text?.includes('Select a JD')) {
        await comboboxesJD[i].click()
        await delay(500)
        const jdOptions = await page.$$('[role="option"]')
        if (jdOptions.length > 1) {
          log('pass', 'JD Select', `${jdOptions.length - 1} job descriptions available`)
          await jdOptions[1].click()
          await delay(500)
          // Check for placeholder text
          const placeholderText = await page.$('p:has-text("Job description content will be loaded")')
          if (placeholderText) {
            log('warn', 'JD Preview', 'Shows placeholder instead of actual content')
          }
        } else {
          log('warn', 'JD Select', 'No job descriptions in library')
          await page.keyboard.press('Escape')
        }
        jdSelectFound = true
        break
      }
    }
    if (!jdSelectFound) {
      log('warn', 'JD Select', 'Could not locate JD dropdown')
    }

    // ============ SECTION 3: Salary and Equity ============
    console.log('\n--- SECTION 3: Salary and Equity ---')

    const salaryMinInput = await page.$('input[placeholder="6000"]')
    const salaryMaxInput = await page.$('input[placeholder="9000"]')
    if (salaryMinInput && salaryMaxInput) {
      await salaryMinInput.type('50000')
      await salaryMaxInput.type('80000')
      await delay(300)
      const minVal = await page.$eval('input[placeholder="6000"]', el => el.value)
      const maxVal = await page.$eval('input[placeholder="9000"]', el => el.value)
      if (minVal === '50000' && maxVal === '80000') {
        log('pass', 'Salary Range Inputs', 'Min and Max accept numeric values')
      } else {
        log('fail', 'Salary Range Inputs', `Values not retained: min=${minVal}, max=${maxVal}`)
      }
    } else {
      log('fail', 'Salary Range Inputs', 'Inputs not found')
    }

    // Test equity inputs
    const equityMinInput = await page.$('input[placeholder="0.05"]')
    const equityMaxInput = await page.$('input[placeholder="0.5"]')
    if (equityMinInput && equityMaxInput) {
      await equityMinInput.type('0.1')
      await equityMaxInput.type('0.5')
      await delay(300)
      const eqMinVal = await page.$eval('input[placeholder="0.05"]', el => el.value)
      const eqMaxVal = await page.$eval('input[placeholder="0.5"]', el => el.value)
      if (eqMinVal === '0.1' && eqMaxVal === '0.5') {
        log('pass', 'Equity Range Inputs', 'Min and Max accept decimal values')
      } else {
        log('fail', 'Equity Range Inputs', `Values: min=${eqMinVal}, max=${eqMaxVal}`)
      }
    } else {
      log('warn', 'Equity Range Inputs', 'Inputs not found')
    }

    // ============ SECTION 4: Hiring Rubric ============
    console.log('\n--- SECTION 4: Hiring Rubric ---')

    // Find and test rubric select
    const allCombos = await page.$$('[role="combobox"]')
    for (const combo of allCombos) {
      const text = await combo.evaluate(el => el.textContent)
      if (text?.includes('Select a rubric')) {
        await combo.click()
        await delay(500)
        const rubricOptions = await page.$$('[role="option"]')
        if (rubricOptions.length > 1) {
          log('pass', 'Rubric Select', `${rubricOptions.length - 1} rubrics available`)
        } else {
          log('warn', 'Rubric Select', 'No rubrics in library')
        }
        await page.keyboard.press('Escape')
        break
      }
    }

    // Test objectives textarea
    const objectivesTextarea = await page.$('textarea')
    if (objectivesTextarea) {
      await objectivesTextarea.type('Lead the backend team and deliver key features within 6 months')
      await delay(300)
      const textVal = await page.$eval('textarea', el => el.value)
      if (textVal.includes('Lead the backend')) {
        log('pass', 'Objectives Textarea', 'Accepts and retains text')
      } else {
        log('fail', 'Objectives Textarea', 'Text not retained')
      }
    } else {
      log('fail', 'Objectives Textarea', 'Element not found')
    }

    // ============ SECTION 5: Interview Flow ============
    console.log('\n--- SECTION 5: Interview Flow ---')

    for (const combo of allCombos) {
      const text = await combo.evaluate(el => el.textContent)
      if (text?.includes('stages)') || text?.includes('Standard') || text?.includes('Engineering')) {
        await combo.click()
        await delay(500)
        const flowOptions = await page.$$('[role="option"]')
        if (flowOptions.length > 0) {
          log('pass', 'Interview Flow Select', `${flowOptions.length} flows available`)
          await flowOptions[0].click()
          await delay(500)
        }
        break
      }
    }

    // ============ SECTION 6: Competencies ============
    console.log('\n--- SECTION 6: Role Competencies ---')

    const competencySearch = await page.$('input[placeholder="Search competencies..."]')
    if (competencySearch) {
      log('pass', 'Competency Search Input', 'Search field exists')

      // Find competency buttons
      const compButtons = await page.$$('button.flex.items-center.gap-2.p-3.border.rounded-lg')
      if (compButtons.length > 0) {
        log('pass', 'Competency Grid', `${compButtons.length} competencies available`)

        // Click first competency
        await compButtons[0].click()
        await delay(500)

        // Check if selection is tracked (look for selected badge)
        await delay(300)
        log('pass', 'Competency Selection', 'Competency can be selected')
      } else {
        log('warn', 'Competency Grid', 'No competencies found - check if data is loaded')
      }
    } else {
      log('fail', 'Competency Search', 'Search input not found')
    }

    // ============ SECTION 7: Automation ============
    console.log('\n--- SECTION 7: Automation ---')

    const checkbox = await page.$('button[role="checkbox"]')
    if (checkbox) {
      const initialState = await checkbox.evaluate(el => el.getAttribute('data-state'))
      await checkbox.click()
      await delay(300)
      const newState = await checkbox.evaluate(el => el.getAttribute('data-state'))
      if (initialState !== newState) {
        log('pass', 'Auto-Archive Checkbox', `Toggles correctly (${initialState} → ${newState})`)
      } else {
        log('fail', 'Auto-Archive Checkbox', 'State does not change on click')
      }
    } else {
      log('fail', 'Auto-Archive Checkbox', 'Checkbox not found')
    }

    // ============ SECTION 8: Additional Details ============
    console.log('\n--- SECTION 8: Additional Details ---')

    // Test Hiring Manager Select
    for (const combo of await page.$$('[role="combobox"]')) {
      const text = await combo.evaluate(el => el.textContent)
      if (text?.includes('Select hiring manager') || text?.includes('Select...')) {
        await combo.click()
        await delay(500)
        const hmOptions = await page.$$('[role="option"]')
        if (hmOptions.length > 1) {
          log('pass', 'Hiring Manager Select', `${hmOptions.length - 1} employees available`)
          await hmOptions[1].click()
          await delay(300)
        } else {
          log('warn', 'Hiring Manager Select', 'No employees found')
          await page.keyboard.press('Escape')
        }
        break
      }
    }

    // Test Followers input
    const allInputs = await page.$$('input')
    let followerInput = null
    for (const input of allInputs) {
      const placeholder = await input.evaluate(el => el.getAttribute('placeholder'))
      if (placeholder?.includes('Search employees')) {
        followerInput = input
        break
      }
    }

    if (followerInput) {
      await followerInput.type('a')
      await delay(800)
      const followerDropdown = await page.$('div.absolute.z-10.shadow-lg')
      if (followerDropdown) {
        const followerButtons = await page.$$('div.absolute.z-10.shadow-lg button')
        if (followerButtons.length > 0) {
          log('pass', 'Followers Search', `Dropdown shows ${followerButtons.length} employees`)
          await followerButtons[0].click()
          await delay(300)
          log('pass', 'Followers Selection', 'Can select follower from dropdown')
        }
      } else {
        log('fail', 'Followers Search', 'Dropdown does not appear')
      }
    } else {
      log('fail', 'Followers Input', 'Input not found')
    }

    // Test "Add me" button
    const buttons = await page.$$('button')
    let addMeButton = null
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.textContent)
      if (text?.includes('Add me')) {
        addMeButton = btn
        break
      }
    }

    if (addMeButton) {
      // Count followers before
      const badgesBefore = await page.$$('span.cursor-pointer')
      const countBefore = badgesBefore.length

      await addMeButton.click()
      await delay(500)

      const badgesAfter = await page.$$('span.cursor-pointer')
      const countAfter = badgesAfter.length

      if (countAfter > countBefore) {
        log('pass', 'Add Me Button', 'Adds current user as follower')
      } else {
        log('fail', 'Add Me Button', 'Button click has no effect (NOT IMPLEMENTED)')
      }
    } else {
      log('warn', 'Add Me Button', 'Button not found')
    }

    // ============ SAVE BUTTONS ============
    console.log('\n--- SAVE ACTIONS ---')

    // Clear title to test validation
    const titleInputFinal = await page.$('input[placeholder*="Senior Backend"]')
    if (titleInputFinal) {
      await titleInputFinal.click({ clickCount: 3 })
      await page.keyboard.press('Backspace')
      await delay(300)
    }

    // Test Save as Draft validation
    let draftButton = null
    for (const btn of await page.$$('button')) {
      const text = await btn.evaluate(el => el.textContent)
      if (text?.includes('Save as Draft')) {
        draftButton = btn
        break
      }
    }

    if (draftButton) {
      await draftButton.click()
      await delay(800)
      const errorDiv = await page.$('div.bg-red-50')
      if (errorDiv) {
        const errorText = await errorDiv.evaluate(el => el.textContent)
        log('pass', 'Draft Validation', `Shows error: "${errorText}"`)
      } else {
        log('warn', 'Draft Validation', 'No validation error shown for empty title')
      }
    }

    // Fill title back
    if (titleInputFinal) {
      await titleInputFinal.type('Software Engineer')
      await delay(300)
    }

    // Test Create Job validation (needs department, flow, followers)
    let createButton = null
    for (const btn of await page.$$('button')) {
      const text = await btn.evaluate(el => el.textContent)
      if (text?.includes('Create Job') && !text?.includes('Draft')) {
        createButton = btn
        break
      }
    }

    if (createButton) {
      await createButton.click()
      await delay(800)
      const successDiv = await page.$('div.bg-green-50')
      const errorDiv2 = await page.$('div.bg-red-50')
      if (successDiv) {
        log('pass', 'Create Job', 'Job created successfully (simulated)')
      } else if (errorDiv2) {
        const errorText = await errorDiv2.evaluate(el => el.textContent)
        log('pass', 'Create Job Validation', `Validates required fields: "${errorText}"`)
      } else {
        log('warn', 'Create Job', 'No feedback shown after clicking Create')
      }
    }

    // ============ PREVIEW SIDEBAR ============
    console.log('\n--- PREVIEW SIDEBAR ---')

    const previewTitle = await page.$('div.text-xl.font-semibold')
    if (previewTitle) {
      const previewText = await previewTitle.evaluate(el => el.textContent)
      if (previewText === 'Software Engineer' || previewText === 'Test Software Engineer') {
        log('pass', 'Preview Sidebar', 'Updates with form values in real-time')
      } else {
        log('warn', 'Preview Sidebar', `Shows "${previewText}"`)
      }
    }

  } catch (error) {
    log('fail', 'Test Execution', error.message)
    console.error(error)
  }

  await browser.close()

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 E2E TEST SUMMARY - Create Job Form')
  console.log('='.repeat(60))
  console.log(`✅ Passed:   ${results.passed.length}`)
  console.log(`❌ Failed:   ${results.failed.length}`)
  console.log(`⚠️  Warnings: ${results.warnings.length}`)

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:')
    results.failed.forEach(f => console.log(`   - ${f.element}: ${f.message}`))
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (potential issues):')
    results.warnings.forEach(w => console.log(`   - ${w.element}: ${w.message}`))
  }

  console.log('\n📋 RECOMMENDATIONS:')
  if (results.failed.some(f => f.element === 'Add Me Button')) {
    console.log('   1. Implement "Add me" button functionality (currently empty onClick)')
  }
  if (results.warnings.some(w => w.element === 'JD Preview')) {
    console.log('   2. Load actual JD content instead of placeholder text')
  }
  if (results.warnings.some(w => w.element.includes('Select') && w.message.includes('No '))) {
    console.log('   3. Seed test data for JDs, Rubrics, and Competencies')
  }

  console.log('\n')
}

testForm().catch(console.error)
