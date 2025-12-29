import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to convert plain text to HTML
function textToHtml(text: string): string {
  return text
    .split('\n\n')
    .map((paragraph) => {
      const trimmed = paragraph.trim()
      if (!trimmed) return ''
      
      // Check if it's a heading (all caps or starts with specific patterns)
      if (trimmed.match(/^[A-Z][A-Z\s:]+$/)) {
        return `<h3 style="color: #2d3748; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">${trimmed}</h3>`
      }
      
      // Check if it's a list item
      if (trimmed.startsWith('- ') || trimmed.match(/^\d+\.\s/)) {
        const items = trimmed.split('\n').filter(line => line.trim())
        const listItems = items.map(item => {
          const clean = item.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '')
          return `<li style="margin-bottom: 8px;">${clean}</li>`
        }).join('\n')
        return `<ul style="margin-left: 20px; margin-bottom: 15px;">${listItems}</ul>`
      }
      
      return `<p style="margin-bottom: 15px; line-height: 1.6;">${trimmed}</p>`
    })
    .filter(Boolean)
    .join('\n')
}

const FULL_TIME_TEMPLATE = `Contract of Employment

Dear %{employee_name},

Curacel Systems Limited (the "Company"), a company incorporated under the laws of the Federal Republic of Nigeria, having its office at 19 Adeyemi Lawson Street, Ikoyi, Lagos, is pleased to employ you under the following terms and conditions (the "Agreement"):

Commencement Date: %{employment_start_date}

Position: For the period of your employment under this Agreement, the Company agrees to employ you in the position of %{job_title}. You will report to the %{supervisor_title} or to such other person as the Company subsequently may determine. 

Job Description: You will perform the duties and have the responsibilities and authority customarily performed and held by an employee in your position or as otherwise may be assigned or delegated to you by the Company including but not limited to your Job Description as provided in this Agreement.

%{duties}

Salary: You will be paid a starting net monthly salary of %{gross_salary}

 

Benefits:%{benefits}

Equity: 0.1 - 0.5% Options

5-year vesting, 1-year cliff.

Additional performance-tied option grants.

Hours of Work: The Company's standard working hours are from 9 am to 5 pm However, you are required to put in the necessary hours required to properly execute the tasks assigned to you.

Place of Work: The Company's primary location is at 16, Oyekan Road, Surulere, Lagos, Nigeria, where you will be expected to provide the Services twice/thrice a week. However you may be expected to provide the Services remotely or at any other place determined by the Company.

Bonus: %{bonus}

 

To Pass Probation

Your performance during the probationary period will be assessed against the objectives outlined in Appendix A

Taxes & Statutory Deductions: The Company will deduct and remit statutory taxes on your behalf in accordance with applicable laws. You agree that the Company does not have a duty to design its compensation to minimise your tax liabilities and you will not make any claim against the Company or its Board of Directors related to tax liabilities arising from your compensation.

Annual Leave, Absence from Work: You are entitled to a paid annual leave period of 14 working days annually, which you may take any time after you have been confirmed and with prior approval of the Company, at a time that will not interfere with the proper performance of your duties. You cannot accumulate and carry over your annual leave entitlement from one year to the following year. If you are unable to work as a result of ill health or injury, you shall notify the Company by providing a medical certificate setting out the reasons for absence from work. You shall be able to access seven (7) business days of sick leave within a year.

Should it become necessary, you are entitled to maternity leave for a period of three (3) consecutive months commencing at any time before the expected delivery date or as directed by a medical practitioner. You shall however notify the Company at least four (4) weeks before you intend taking the maternity leave.

Appraisals/Promotions: You shall be appraised by the management of the Company or any other authorised person from time to time and promotion shall be based on your performance.

Disciplinary and Grievance Procedure: You shall be subject to the disciplinary and grievance procedures as provided in the Company's employee handbook from time to time.

Confidentiality and Invention/ Intellectual Property Assignment Agreement: You will be required, as a condition of your employment with the Company, to sign the Company's standard Confidentiality and Invention/Intellectual Property Assignment Agreement provided in Appendix II of this Agreement.

Termination of Employment and Notice Period: This Agreement may be terminated by: 

Death 

Disabilities, which include any physical or mental impairment which, as reasonably determined by the Company, renders you unable to perform the essential functions of your position at the Company 

With or Without Cause. 

Notwithstanding the above should you wish to terminate this Agreement during the Probation Period, one (1) month's notice in writing must be given to the Company. Salary may be paid or forfeited in lieu of notice. After your Confirmation, should either Party wish to terminate this relationship, one (1) month's notice in writing must be given to the non-terminating Party. Salary may be paid or forfeited in lieu of notice by either Party. This notice period is deemed necessary as it is pertinent that you do a proper handover and annual leave periods will not be accepted as part of the notice period. 

Please note that payment in lieu of notice will only be accepted following approval from your line manager that you have concluded assigned tasks and done proper handover. 

Nothing in this Agreement shall prevent the Company from terminating your employment without notice or salary in lieu of notice in the appropriate circumstances including: 

any material breach by you of this Agreement, the Confidential Information Non-Disclosure & Intellectual Property/ Invention Assignment Agreement between you and the Company, or any other written agreement between you and the Company, if such breach causes material harm to the Company; 

any material failure by you to comply with the Company's written policies or rules, as they may be in effect from time to time during your Employment, if such failure causes material harm to the Company; 

any conviction of, or a plea of "guilty" to a crime under the laws of the Federal Republic of Nigeria or any other country; 

your misappropriation of funds or property of the Company; 

neglect of your duties; 

or any gross or wilful misconduct by you resulting in a material loss to the Company or material damage to the reputation of the Company. 

Restrictive Covenants: While employed by the Company and for 12 months after the termination of your employment, you shall not seek to: 

Canvass or solicit business, orders or custom for any products or services provided by this business from any customer, supplier or sponsor; either current, existing or in prospect; 

Solicit or entice away any of the Company's employees or contract employees

Transfer your services to the Company's customer, supplier or sponsor. 

Employment Relationship: Employment with the Company is for no specific period of time. Your employment with the Company will be "at will," meaning that either you or the Company may terminate your employment at any time and for any reason, with or without cause. Any contrary representations which may have been made to you are superseded by this offer. This is the full and complete agreement between you and the Company regarding this issue. Although your job duties, title, compensation and benefits, as well as the Company's personnel policies and procedures, may change from time to time, the "at will" nature of your employment may only be changed in an express written agreement signed by you and the Company's Managing Director.

Conflicting Employment: You hereby agree that, during the duration of this Agreement you shall be committed to carrying out your duties in the Company and will not engage in any other employment (Full-time or Part-time), occupation, consulting, or other business activity nor will you engage in any other activities that conflict with your obligations to the Company without the prior written consent of the Company.

Loss, Damage and Return of Company Property: The Company shall not accept any responsibility for the loss or damage of your personal property, motor vehicle and/or any other personal belongings brought into the Company's premises in the course of your employment. Upon termination of employment with the Company for any reason or at any time prior at the Company's request, you shall return all property belonging to the Company or its affiliates including but not limited to, any Company-provided laptops, computers, cell phones, or other equipment, or documents, or property belonging to the Company.

Governing Law: The validity, interpretation, construction and performance of this Agreement, and all acts and transactions pursuant to this Agreement and the rights and obligations of the parties hereto shall be governed, construed and interpreted in accordance with the Laws of the Federal Republic of Nigeria.

Entire Agreement: This Agreement contains the entire Agreement between the parties hereto with respect to the subject matter hereof, and supersedes all prior arrangements or understandings (whether written or oral) with respect thereto.

Severability: If any provision in this Agreement is held to be invalid or unenforceable in any jurisdiction, the validity and enforceability of all remaining provisions contained in this Agreement shall not in any way be affected or impaired.

We reserve the right to make reasonable changes to this Agreement and will notify you in writing of such changes. Such changes will be deemed to be accepted unless you notify us of any objections you may have before the commencement date. By signing this Agreement, you confirm with the Company that you are under no contractual or other legal obligations that would prohibit you from performing your duties with the Company.

If you wish to accept this offer, please sign and date both copies of this Agreement and both copies of the enclosed Confidential Information and Intellectual Property/Invention Assignment Agreement on or before %{offer_expiration_date} and return them to the undersigned representative of the Company.`

function convertTemplateToHtml(template: string): string {
  // Wrap in a styled container
  const html = `
    <div style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.8; color: #1a1a1a;">
      ${template
        .split('\n\n')
        .map((paragraph) => {
          const trimmed = paragraph.trim()
          if (!trimmed) return ''
          
          // Headings (all caps or specific patterns)
          if (trimmed.match(/^[A-Z][A-Z\s:&]+$/) && trimmed.length < 100) {
            return `<h3 style="color: #2d3748; font-weight: bold; margin-top: 24px; margin-bottom: 12px; font-size: 1.1em;">${trimmed}</h3>`
          }
          
          // List items
          if (trimmed.includes('\n') && (trimmed.includes('- ') || trimmed.match(/\d+\.\s/))) {
            const items = trimmed.split('\n').filter(line => line.trim())
            const listItems = items.map(item => {
              const clean = item.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim()
              if (!clean) return ''
              return `<li style="margin-bottom: 10px; margin-left: 20px;">${clean}</li>`
            }).filter(Boolean).join('\n')
            return `<ul style="margin-left: 20px; margin-bottom: 15px; padding-left: 20px;">${listItems}</ul>`
          }
          
          // Regular paragraphs
          return `<p style="margin-bottom: 15px; text-align: left;">${trimmed}</p>`
        })
        .filter(Boolean)
        .join('\n')}
    </div>
  `
  return html
}

async function main() {
  console.log('🌱 Seeding database...')

  // Create default apps
  const defaultApps = [
    { type: 'GOOGLE_WORKSPACE' as const, name: 'Google Workspace', description: 'Provision Google Workspace accounts, groups, and organizational units' },
    { type: 'SLACK' as const, name: 'Slack', description: 'Provision Slack workspace access and channel memberships' },
    { type: 'BITBUCKET' as const, name: 'Bitbucket', description: 'Provision Bitbucket repository access and permissions' },
    { type: 'JIRA' as const, name: 'Jira', description: 'Provision Jira project access and issue management' },
    { type: 'PASSBOLT' as const, name: 'Passbolt', description: 'Provision Passbolt password management and secure sharing' },
    { type: 'HUBSPOT' as const, name: 'HubSpot', description: 'Provision HubSpot CRM access and marketing automation' },
    { type: 'STANDUPNINJA' as const, name: 'StandupNinja', description: 'Provision StandupNinja team standup and status management' },
  ]

  const createdApps: Record<string, string> = {}
  for (const app of defaultApps) {
    const created = await prisma.app.upsert({
      where: { type_name: { type: app.type, name: app.name } },
      create: {
        ...app,
        isEnabled: true,
      },
      update: {},
    })
    createdApps[app.type] = created.id
  }

  const googleWorkspace = await prisma.app.findUnique({
    where: { type_name: { type: 'GOOGLE_WORKSPACE', name: 'Google Workspace' } },
  })
  const slack = await prisma.app.findUnique({
    where: { type_name: { type: 'SLACK', name: 'Slack' } },
  })

  if (!googleWorkspace || !slack) {
    throw new Error('Failed to create Google Workspace or Slack apps')
  }

  console.log('✅ Created apps:', createdApps)

  // Create Full-Time Employment Template
  const fullTimeTemplate = await prisma.offerTemplate.upsert({
    where: { id: 'full-time-template' },
    create: {
      id: 'full-time-template',
      name: 'Full-time Employment Contract',
      description: 'Standard full-time employment contract for Curacel Systems Limited',
      employmentType: 'FULL_TIME',
      bodyHtml: convertTemplateToHtml(FULL_TIME_TEMPLATE),
      bodyMarkdown: FULL_TIME_TEMPLATE,
      includeNda: true,
      includePii: true,
      variableSchema: {
        employee_name: { label: 'Employee Name', type: 'text', required: true },
        employment_start_date: { label: 'Employment Start Date', type: 'date', required: true },
        job_title: { label: 'Job Title', type: 'text', required: true },
        supervisor_title: { label: 'Supervisor Title', type: 'text', required: true },
        duties: { label: 'Primary Duties', type: 'text', required: false },
        gross_salary: { label: 'Gross Salary', type: 'text', required: true },
        benefits: { label: 'Benefits', type: 'text', required: false },
        bonus: { label: 'Bonus', type: 'text', required: false },
        offer_expiration_date: { label: 'Offer Expiration Date', type: 'date', required: true },
      },
    },
    update: {
      bodyHtml: convertTemplateToHtml(FULL_TIME_TEMPLATE),
      bodyMarkdown: FULL_TIME_TEMPLATE,
    },
  })

  // Create Part-Time Template (simplified version)
  const partTimeTemplate = await prisma.offerTemplate.upsert({
    where: { id: 'part-time-template' },
    create: {
      id: 'part-time-template',
      name: 'Part-time Employment Contract',
      description: 'Standard part-time employment contract',
      employmentType: 'PART_TIME',
      bodyHtml: convertTemplateToHtml(FULL_TIME_TEMPLATE.replace('full-time', 'part-time').replace('Full-time', 'Part-time')),
      bodyMarkdown: FULL_TIME_TEMPLATE.replace('full-time', 'part-time').replace('Full-time', 'Part-time'),
      includeNda: true,
      includePii: true,
      variableSchema: {
        employee_name: { label: 'Employee Name', type: 'text', required: true },
        employment_start_date: { label: 'Employment Start Date', type: 'date', required: true },
        job_title: { label: 'Job Title', type: 'text', required: true },
        supervisor_title: { label: 'Supervisor Title', type: 'text', required: true },
        duties: { label: 'Primary Duties', type: 'text', required: false },
        gross_salary: { label: 'Gross Salary', type: 'text', required: true },
        benefits: { label: 'Benefits', type: 'text', required: false },
        bonus: { label: 'Bonus', type: 'text', required: false },
        offer_expiration_date: { label: 'Offer Expiration Date', type: 'date', required: true },
      },
    },
    update: {},
  })

  // Create Contractor Template
  const contractorTemplate = await prisma.offerTemplate.upsert({
    where: { id: 'contractor-template' },
    create: {
      id: 'contractor-template',
      name: 'Contractor Agreement',
      description: 'Standard contractor agreement',
      employmentType: 'CONTRACTOR',
      bodyHtml: convertTemplateToHtml(FULL_TIME_TEMPLATE.replace('Contract of Employment', 'Contractor Agreement').replace('employment', 'contractor engagement')),
      bodyMarkdown: FULL_TIME_TEMPLATE.replace('Contract of Employment', 'Contractor Agreement').replace('employment', 'contractor engagement'),
      includeNda: true,
      includePii: true,
      variableSchema: {
        employee_name: { label: 'Contractor Name', type: 'text', required: true },
        employment_start_date: { label: 'Contract Start Date', type: 'date', required: true },
        employment_end_date: { label: 'Contract End Date', type: 'date', required: false },
        job_title: { label: 'Job Title', type: 'text', required: true },
        supervisor_title: { label: 'Supervisor Title', type: 'text', required: true },
        duties: { label: 'Primary Duties', type: 'text', required: false },
        gross_salary: { label: 'Contract Amount', type: 'text', required: true },
        benefits: { label: 'Benefits', type: 'text', required: false },
        offer_expiration_date: { label: 'Offer Expiration Date', type: 'date', required: true },
      },
    },
    update: {},
  })

  // Create Intern Template
  const internTemplate = await prisma.offerTemplate.upsert({
    where: { id: 'intern-template' },
    create: {
      id: 'intern-template',
      name: 'Internship Agreement',
      description: 'Standard internship agreement',
      employmentType: 'INTERN',
      bodyHtml: convertTemplateToHtml(FULL_TIME_TEMPLATE.replace('Contract of Employment', 'Internship Agreement').replace('employment', 'internship')),
      bodyMarkdown: FULL_TIME_TEMPLATE.replace('Contract of Employment', 'Internship Agreement').replace('employment', 'internship'),
      includeNda: true,
      includePii: true,
      variableSchema: {
        employee_name: { label: 'Intern Name', type: 'text', required: true },
        employment_start_date: { label: 'Internship Start Date', type: 'date', required: true },
        employment_end_date: { label: 'Internship End Date', type: 'date', required: false },
        job_title: { label: 'Internship Position', type: 'text', required: true },
        supervisor_title: { label: 'Supervisor Title', type: 'text', required: true },
        duties: { label: 'Primary Duties', type: 'text', required: false },
        gross_salary: { label: 'Stipend', type: 'text', required: false },
        benefits: { label: 'Benefits', type: 'text', required: false },
        offer_expiration_date: { label: 'Offer Expiration Date', type: 'date', required: true },
      },
    },
    update: {},
  })

  // Create Confirmation Template
  const confirmationTemplate = await prisma.offerTemplate.upsert({
    where: { id: 'confirmation-template' },
    create: {
      id: 'confirmation-template',
      name: 'Employment Confirmation Contract',
      description: 'Employment contract sent when confirming employment after probation period',
      bodyHtml: convertTemplateToHtml(FULL_TIME_TEMPLATE.replace('Contract of Employment', 'Employment Confirmation Contract')),
      bodyMarkdown: FULL_TIME_TEMPLATE.replace('Contract of Employment', 'Employment Confirmation Contract'),
      includeNda: true,
      includePii: true,
      variableSchema: {
        employee_name: { label: 'Employee Name', type: 'text', required: true },
        employment_start_date: { label: 'Employment Start Date', type: 'date', required: true },
        job_title: { label: 'Job Title', type: 'text', required: true },
        supervisor_title: { label: 'Supervisor Title', type: 'text', required: true },
        gross_salary: { label: 'Gross Salary', type: 'text', required: true },
        offer_expiration_date: { label: 'Confirmation Date', type: 'date', required: true },
      },
    },
    update: {},
  })

  // Create Termination Template
  const terminationTemplate = await prisma.offerTemplate.upsert({
    where: { id: 'termination-template' },
    create: {
      id: 'termination-template',
      name: 'Employment Termination Contract',
      description: 'Contract sent when terminating employment',
      bodyHtml: convertTemplateToHtml(`Employment Termination Notice

Dear %{employee_name},

This letter serves as formal notice of the termination of your employment with Curacel Systems Limited (the "Company"), effective %{termination_date}.

Termination Details:
- Last Day of Employment: %{termination_date}
- Notice Period: %{notice_period}
- Final Pay: %{final_pay}

Please return all Company property including laptops, computers, cell phones, and any other equipment or documents belonging to the Company.

If you have any questions, please contact HR.

Sincerely,
%{signature_block}`),
      bodyMarkdown: `Employment Termination Notice

Dear %{employee_name},

This letter serves as formal notice of the termination of your employment with Curacel Systems Limited (the "Company"), effective %{termination_date}.

Termination Details:
- Last Day of Employment: %{termination_date}
- Notice Period: %{notice_period}
- Final Pay: %{final_pay}

Please return all Company property including laptops, computers, cell phones, and any other equipment or documents belonging to the Company.

If you have any questions, please contact HR.

Sincerely,
%{signature_block}`,
      includeNda: false,
      includePii: true,
      variableSchema: {
        employee_name: { label: 'Employee Name', type: 'text', required: true },
        termination_date: { label: 'Termination Date', type: 'date', required: true },
        notice_period: { label: 'Notice Period', type: 'text', required: true },
        final_pay: { label: 'Final Pay', type: 'text', required: true },
        signature_block: { label: 'Signature Block', type: 'text', required: true },
      },
    },
    update: {},
  })

  // Create NDA Template
  const ndaTemplate = await prisma.offerTemplate.upsert({
    where: { id: 'nda-template' },
    create: {
      id: 'nda-template',
      name: 'Non-Disclosure and Invention Agreement',
      description: 'Agreement to protect confidential information and inventions',
      bodyHtml: convertTemplateToHtml(`Non-Disclosure and Invention Assignment Agreement

Dear %{employee_name},

This Non-Disclosure and Invention Assignment Agreement ("Agreement") is entered into between you and Curacel Systems Limited (the "Company").

Confidentiality: You agree to maintain the confidentiality of all proprietary and confidential information of the Company.

Invention Assignment: You agree to assign to the Company all inventions, discoveries, and improvements made during your employment.

This Agreement is effective as of %{agreement_date} and shall survive the termination of your employment.

By signing below, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement.

Signature: %{employee_signature}
Date: %{signature_date}

Company Representative: %{signature_block}`),
      bodyMarkdown: `Non-Disclosure and Invention Assignment Agreement

Dear %{employee_name},

This Non-Disclosure and Invention Assignment Agreement ("Agreement") is entered into between you and Curacel Systems Limited (the "Company").

Confidentiality: You agree to maintain the confidentiality of all proprietary and confidential information of the Company.

Invention Assignment: You agree to assign to the Company all inventions, discoveries, and improvements made during your employment.

This Agreement is effective as of %{agreement_date} and shall survive the termination of your employment.

By signing below, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement.

Signature: %{employee_signature}
Date: %{signature_date}

Company Representative: %{signature_block}`,
      includeNda: false,
      includePii: true,
      variableSchema: {
        employee_name: { label: 'Employee Name', type: 'text', required: true },
        agreement_date: { label: 'Agreement Date', type: 'date', required: true },
        employee_signature: { label: 'Employee Signature', type: 'text', required: true },
        signature_date: { label: 'Signature Date', type: 'date', required: true },
        signature_block: { label: 'Company Signature Block', type: 'text', required: true },
      },
    },
    update: {},
  })

  console.log('✅ Created offer templates:', {
    fullTime: fullTimeTemplate.id,
    partTime: partTimeTemplate.id,
    contractor: contractorTemplate.id,
    intern: internTemplate.id,
    confirmation: confirmationTemplate.id,
    termination: terminationTemplate.id,
    nda: ndaTemplate.id,
  })

  // Create sample provisioning rules
  await prisma.appProvisioningRule.upsert({
    where: { id: 'google-all-employees' },
    create: {
      id: 'google-all-employees',
      appId: googleWorkspace.id,
      name: 'All Employees',
      description: 'Add all employees to the all-company group',
      condition: {},
      provisionData: {
        groups: ['Excellers@curacel.ai'],
      },
      priority: 0,
      isActive: true,
    },
    update: {
      provisionData: { groups: ['Excellers@curacel.ai'] },
    },
  })

  await prisma.appProvisioningRule.upsert({
    where: { id: 'google-engineering' },
    create: {
      id: 'google-engineering',
      appId: googleWorkspace.id,
      name: 'Engineering Department',
      description: 'Add engineering employees to engineering groups',
      condition: { department: 'Engineering' },
      provisionData: {
        groups: ['engineering@curacel.ai'],
        orgUnitPath: '/Engineering',
      },
      priority: 10,
      isActive: true,
    },
    update: {
      provisionData: {
        groups: ['engineering@curacel.ai'],
        orgUnitPath: '/Engineering',
      },
    },
  })

  await prisma.appProvisioningRule.upsert({
    where: { id: 'google-success' },
    create: {
      id: 'google-success',
      appId: googleWorkspace.id,
      name: 'Success / Support',
      description: 'Add success/support employees to success groups',
      condition: { department: 'Success' },
      provisionData: {
        groups: ['success@curacel.ai'],
        orgUnitPath: '/Success',
      },
      priority: 8,
      isActive: true,
    },
    update: {
      provisionData: {
        groups: ['success@curacel.ai'],
        orgUnitPath: '/Success',
      },
    },
  })

  await prisma.appProvisioningRule.upsert({
    where: { id: 'google-interns' },
    create: {
      id: 'google-interns',
      appId: googleWorkspace.id,
      name: 'Interns',
      description: 'Add interns to spartans group and intern org unit',
      condition: { employmentType: 'INTERN' },
      provisionData: {
        groups: ['spartans@curacel.ai'],
        orgUnitPath: '/Interns',
      },
      priority: 6,
      isActive: true,
    },
    update: {
      provisionData: {
        groups: ['spartans@curacel.ai'],
        orgUnitPath: '/Interns',
      },
    },
  })

  await prisma.appProvisioningRule.upsert({
    where: { id: 'google-managers' },
    create: {
      id: 'google-managers',
      appId: googleWorkspace.id,
      name: 'Managers',
      description: 'Add managers to leads group',
      condition: { jobTitle: 'Manager' },
      provisionData: {
        groups: ['leads@curacel.ai'],
      },
      priority: 7,
      isActive: true,
    },
    update: {
      provisionData: {
        groups: ['leads@curacel.ai'],
      },
    },
  })

  await prisma.appProvisioningRule.upsert({
    where: { id: 'slack-all-employees' },
    create: {
      id: 'slack-all-employees',
      appId: slack.id,
      name: 'All Employees',
      description: 'Add all employees to default Slack channels',
      condition: {},
      provisionData: {
        channels: ['general', 'announcements'],
      },
      priority: 0,
      isActive: true,
    },
    update: {},
  })

  await prisma.appProvisioningRule.upsert({
    where: { id: 'slack-engineering' },
    create: {
      id: 'slack-engineering',
      appId: slack.id,
      name: 'Engineering Department',
      description: 'Add engineering employees to engineering channels',
      condition: { department: 'Engineering' },
      provisionData: {
        channels: ['engineering', 'tech-discussions'],
      },
      priority: 10,
      isActive: true,
    },
    update: {},
  })

  console.log('✅ Created provisioning rules')

  // ============================================
  // JOB SETTINGS - JDs, RUBRICS, COMPETENCIES
  // ============================================

  // Create Job Descriptions
  const jobDescriptions = [
    {
      id: 'jd-senior-backend',
      name: 'Senior Backend Engineer',
      department: 'Engineering',
      content: `# Senior Backend Engineer

## About the Role
We're looking for a Senior Backend Engineer to join our growing engineering team. You'll be responsible for designing, building, and maintaining our core platform services.

## Responsibilities
- Design and implement scalable backend services and APIs
- Lead technical discussions and code reviews
- Mentor junior engineers and contribute to team growth
- Collaborate with product and design teams to deliver features
- Ensure high code quality through testing and best practices
- Participate in on-call rotations

## Requirements
- 5+ years of backend development experience
- Strong proficiency in Node.js, Python, or Go
- Experience with PostgreSQL, Redis, and message queues
- Understanding of distributed systems and microservices
- Excellent problem-solving and communication skills

## Nice to Have
- Experience with Kubernetes and cloud platforms (AWS/GCP)
- Contributions to open source projects
- Experience in fintech or insurtech`,
    },
    {
      id: 'jd-product-designer',
      name: 'Product Designer',
      department: 'Design',
      content: `# Product Designer

## About the Role
We're seeking a talented Product Designer to help shape the future of our platform. You'll work closely with product and engineering teams to create intuitive, beautiful user experiences.

## Responsibilities
- Lead end-to-end design for new features and products
- Conduct user research and usability testing
- Create wireframes, prototypes, and high-fidelity designs
- Maintain and evolve our design system
- Collaborate with engineers to ensure design quality
- Present designs to stakeholders and incorporate feedback

## Requirements
- 3+ years of product design experience
- Strong portfolio demonstrating UX/UI expertise
- Proficiency in Figma and prototyping tools
- Experience with design systems
- Excellent communication and collaboration skills

## Nice to Have
- Experience with B2B or enterprise products
- Basic understanding of HTML/CSS
- Motion design skills`,
    },
    {
      id: 'jd-growth-lead',
      name: 'Growth Lead',
      department: 'Growth',
      content: `# Growth Lead

## About the Role
We're looking for a data-driven Growth Lead to drive user acquisition and engagement. You'll own our growth strategy and execute experiments to scale our user base.

## Responsibilities
- Develop and execute growth strategies across channels
- Design and run A/B tests to optimize conversion
- Analyze user behavior and identify growth opportunities
- Manage paid acquisition campaigns
- Collaborate with product on growth features
- Build and lead a growth team

## Requirements
- 4+ years of growth marketing experience
- Strong analytical skills and data proficiency
- Experience with growth tools (Amplitude, Mixpanel, etc.)
- Track record of driving measurable growth
- Excellent communication and leadership skills

## Nice to Have
- Experience at B2B SaaS companies
- Technical background or SQL proficiency
- Startup experience`,
    },
    {
      id: 'jd-devops-engineer',
      name: 'DevOps Engineer',
      department: 'Engineering',
      content: `# DevOps Engineer

## About the Role
We're seeking a DevOps Engineer to help build and maintain our cloud infrastructure. You'll work on CI/CD pipelines, monitoring, and ensuring system reliability.

## Responsibilities
- Design and maintain cloud infrastructure on AWS/GCP
- Build and optimize CI/CD pipelines
- Implement monitoring, alerting, and logging solutions
- Ensure security best practices across infrastructure
- Automate deployment and operational tasks
- Participate in incident response and on-call rotations

## Requirements
- 3+ years of DevOps/SRE experience
- Strong experience with Kubernetes and Docker
- Proficiency with IaC tools (Terraform, Pulumi)
- Experience with CI/CD platforms (GitHub Actions, GitLab CI)
- Understanding of networking and security

## Nice to Have
- Certifications (AWS, GCP, CKA)
- Experience with service mesh (Istio, Linkerd)
- Background in software development`,
    },
    {
      id: 'jd-frontend-engineer',
      name: 'Frontend Engineer',
      department: 'Engineering',
      content: `# Frontend Engineer

## About the Role
We're looking for a Frontend Engineer to build beautiful, performant user interfaces. You'll work closely with designers and backend engineers to deliver exceptional user experiences.

## Responsibilities
- Build and maintain React/Next.js applications
- Implement responsive, accessible UI components
- Optimize frontend performance and bundle size
- Write unit and integration tests
- Contribute to our component library
- Collaborate with designers on implementation

## Requirements
- 3+ years of frontend development experience
- Strong proficiency in React and TypeScript
- Experience with modern CSS (Tailwind, styled-components)
- Understanding of web performance optimization
- Familiarity with testing frameworks (Jest, Playwright)

## Nice to Have
- Experience with Next.js and server-side rendering
- Animation and motion design skills
- Contributions to design systems`,
    },
  ]

  for (const jd of jobDescriptions) {
    await prisma.jobDescription.upsert({
      where: { id: jd.id },
      create: jd,
      update: { name: jd.name, department: jd.department, content: jd.content },
    })
  }
  console.log('✅ Created job descriptions:', jobDescriptions.length)

  // Create Hiring Rubrics
  const rubrics = [
    {
      id: 'rubric-engineering',
      name: 'Engineering Technical Assessment',
      description: 'Comprehensive rubric for evaluating engineering candidates',
      criteria: [
        { name: 'Technical Skills', description: 'Core programming and technical knowledge', weight: 5 },
        { name: 'Problem Solving', description: 'Ability to break down and solve complex problems', weight: 4 },
        { name: 'System Design', description: 'Understanding of architecture and scalability', weight: 4 },
        { name: 'Code Quality', description: 'Writing clean, maintainable, tested code', weight: 3 },
        { name: 'Communication', description: 'Ability to explain technical concepts clearly', weight: 3 },
      ],
    },
    {
      id: 'rubric-product',
      name: 'Product Manager Assessment',
      description: 'Rubric for evaluating product management candidates',
      criteria: [
        { name: 'Product Sense', description: 'Understanding of user needs and product strategy', weight: 5 },
        { name: 'Analytical Skills', description: 'Data-driven decision making', weight: 4 },
        { name: 'Communication', description: 'Clear articulation of ideas and requirements', weight: 4 },
        { name: 'Execution', description: 'Track record of shipping products', weight: 4 },
        { name: 'Leadership', description: 'Ability to influence without authority', weight: 3 },
      ],
    },
    {
      id: 'rubric-general',
      name: 'General Interview Rubric',
      description: 'Standard rubric for general candidate evaluation',
      criteria: [
        { name: 'Role Fit', description: 'Skills and experience match for the role', weight: 5 },
        { name: 'Culture Fit', description: 'Alignment with company values', weight: 4 },
        { name: 'Communication', description: 'Clear and effective communication', weight: 3 },
        { name: 'Problem Solving', description: 'Analytical thinking and adaptability', weight: 3 },
        { name: 'Growth Potential', description: 'Ability and desire to learn and grow', weight: 3 },
      ],
    },
  ]

  for (const rubric of rubrics) {
    const { criteria, ...rubricData } = rubric
    await prisma.hiringRubric.upsert({
      where: { id: rubric.id },
      create: {
        ...rubricData,
        criteria: {
          create: criteria.map((c, i) => ({ ...c, sortOrder: i })),
        },
      },
      update: { name: rubric.name, description: rubric.description },
    })
  }
  console.log('✅ Created hiring rubrics:', rubrics.length)

  // Create Competencies
  const competencies = [
    // Technical
    { name: 'Technical Excellence', category: 'Technical', description: 'Deep technical knowledge and ability to apply it effectively' },
    { name: 'System Design', category: 'Technical', description: 'Ability to design scalable, maintainable systems' },
    { name: 'Code Quality', category: 'Technical', description: 'Writing clean, tested, maintainable code' },
    { name: 'Debugging', category: 'Technical', description: 'Systematic approach to identifying and fixing issues' },

    // Problem Solving
    { name: 'Problem Solving', category: 'Problem Solving', description: 'Breaking down complex problems into manageable parts' },
    { name: 'Innovation', category: 'Problem Solving', description: 'Finding creative solutions to challenges' },
    { name: 'Critical Thinking', category: 'Problem Solving', description: 'Analyzing situations objectively and making sound judgments' },

    // Leadership
    { name: 'Leadership', category: 'Leadership', description: 'Guiding and inspiring others to achieve goals' },
    { name: 'Mentorship', category: 'Leadership', description: 'Developing and supporting team members' },
    { name: 'Decision Making', category: 'Leadership', description: 'Making timely, well-informed decisions' },

    // Communication
    { name: 'Communication', category: 'Communication', description: 'Clear and effective verbal and written communication' },
    { name: 'Presentation', category: 'Communication', description: 'Presenting ideas clearly to various audiences' },
    { name: 'Stakeholder Management', category: 'Communication', description: 'Managing expectations and relationships effectively' },

    // Collaboration
    { name: 'Collaboration', category: 'Collaboration', description: 'Working effectively with others towards shared goals' },
    { name: 'Cross-functional Partnership', category: 'Collaboration', description: 'Building bridges across teams and departments' },
    { name: 'Feedback', category: 'Collaboration', description: 'Giving and receiving constructive feedback' },

    // Personal
    { name: 'Adaptability', category: 'Personal', description: 'Adjusting to changing circumstances and requirements' },
    { name: 'Ownership', category: 'Personal', description: 'Taking responsibility for outcomes and seeing things through' },
    { name: 'Growth Mindset', category: 'Personal', description: 'Continuous learning and improvement' },
    { name: 'Resilience', category: 'Personal', description: 'Persevering through challenges and setbacks' },

    // Business
    { name: 'Customer Focus', category: 'Business', description: 'Understanding and prioritizing customer needs' },
    { name: 'Data-Driven', category: 'Business', description: 'Making decisions based on data and metrics' },
    { name: 'Business Acumen', category: 'Business', description: 'Understanding business context and impact' },
    { name: 'Strategic Thinking', category: 'Business', description: 'Long-term planning and vision' },
  ]

  for (const comp of competencies) {
    await prisma.competency.upsert({
      where: { name_category: { name: comp.name, category: comp.category } },
      create: comp,
      update: { description: comp.description },
    })
  }
  console.log('✅ Created competencies:', competencies.length)

  // Create a sample admin user (you'll need to update this with a real email)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    create: {
      email: 'admin@company.com',
      name: 'Admin User',
      role: 'SUPER_ADMIN',
    },
    update: {},
  })

  console.log('✅ Created admin user:', adminUser.email)

  console.log('✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
