'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

type DocBlock = {
  title: string
  text?: string
  items?: string[]
  ordered?: boolean
}

type DocSection = {
  id: string
  title: string
  description: string
  blocks: DocBlock[]
}

const docSections: DocSection[] = [
  {
    id: 'quick-start',
    title: 'Quick start',
    description: 'A setup checklist for new organizations.',
    blocks: [
      {
        title: 'Goal',
        text: 'Configure the essentials so you can send contracts, onboard employees, and track activity.',
      },
      {
        title: 'Step-by-step',
        ordered: true,
        items: [
          'Open Settings > Organization profile and add your company name, logo, and letterhead details.',
          'Invite the right admins in Settings > App Admins and assign roles for HR and IT.',
          'Create signature blocks in Settings > Signature blocks for anyone who signs contracts.',
          'Add legal entities in Settings > Legal entities so contracts reference the correct company.',
          'Review and edit contract templates in Settings > Contract templates.',
          'Connect tools in Settings > Applications and test each connection (Google Workspace, Slack, etc).',
          'Configure email notifications in Settings > Notifications and select recipients and triggers.',
          'Add employees in Employees so you can send offers and start workflows.',
          'Create a contract in Contracts, send it for signature, and start onboarding when it is signed.',
        ],
      },
      {
        title: 'Result',
        text: 'You now have a configured workspace with contracts, onboarding flows, and notifications ready to use.',
      },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation and roles',
    description: 'How to move around the product and who can see what.',
    blocks: [
      {
        title: 'Navigation basics',
        items: [
          'Use the left sidebar to switch between Dashboard, Employees, Contracts, Onboarding, Offboarding, Integrations, BlueAI, Notifications, and Settings.',
          'Use the menu button in the top bar to collapse or expand the sidebar.',
          'Use the bell icon in the top-right to open recent notifications (admin roles only).',
          'Use the BlueAI button at the bottom of the sidebar for quick questions.',
          'Use the profile menu at the bottom of the sidebar for My Profile and sign out.',
          'Most list pages include filters, search, and pagination to narrow results.',
        ],
      },
      {
        title: 'Role-based access',
        items: [
          'SUPER_ADMIN: full access to HR, IT, BlueAI, settings, and system data.',
          'HR_ADMIN: employees, contracts, onboarding, BlueAI, notifications, and most settings.',
          'IT_ADMIN: applications, provisioning, BlueAI, onboarding and offboarding automation, and settings.',
          'MANAGER: dashboard plus onboarding and offboarding visibility.',
          'EMPLOYEE: basic access, typically My Profile only.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Your high-level view of people, contracts, and workflows.',
    blocks: [
      {
        title: 'What it shows',
        items: [
          'Employee totals and active headcount.',
          'Pending contracts and signed contract counts.',
          'Onboarding and offboarding totals.',
          'Contract pipeline breakdown (draft, sent, viewed, signed).',
          'Active onboarding progress with quick links.',
          'Recent hires and upcoming start dates.',
        ],
      },
      {
        title: 'How to use it',
        ordered: true,
        items: [
          'Start your day here to spot pending contracts and onboarding progress.',
          'Click an employee or workflow in the lists to open the detailed record.',
          'Use the counts to identify bottlenecks (for example, many sent contracts with no signatures).',
        ],
      },
    ],
  },
  {
    id: 'employees',
    title: 'Employees',
    description: 'Create, update, and manage employee records.',
    blocks: [
      {
        title: 'Create an employee',
        ordered: true,
        items: [
          'Go to Employees and click Add Employee.',
          'Enter full name and personal email (required).',
          'Add optional details such as job title, department, and location.',
          'Click Create Employee and confirm the record appears in the list.',
          'Open the employee record to add more details later.',
        ],
      },
      {
        title: 'Manage employee details',
        items: [
          'Use search to find employees by name or email.',
          'Filter by status or department when the list grows.',
          'Open an employee to edit job info, work email, manager, or status.',
          'Update start and end dates, contact details, bank info, and emergency contacts.',
          'View the Personality tab to see life values and work style preferences.',
          'Start offboarding directly from an employee profile when needed.',
        ],
      },
      {
        title: 'Statuses and workflows',
        items: [
          'Statuses include Candidate, Offer Sent, Offer Signed, Pending Start, Active, Offboarding, and Exited.',
          'Onboarding candidates are pulled from Offer Signed status.',
          'Changing status affects filters and eligibility for workflows.',
        ],
      },
    ],
  },
  {
    id: 'contracts',
    title: 'Contracts',
    description: 'Create offers, send for signature, and track status.',
    blocks: [
      {
        title: 'Create a contract',
        ordered: true,
        items: [
          'Go to Contracts and click New employment contract.',
          'Select the employee (candidate) to attach the contract.',
          'Choose an employment type to auto-select the template.',
          'Fill job title, start date, probation end, and supervisor title.',
          'Add working hours, duties, and benefits as needed.',
          'Select the legal entity and signature block.',
          'Enter compensation details (amount, currency, frequency).',
          'Submit to create the contract record.',
        ],
      },
      {
        title: 'Send and track signatures',
        ordered: true,
        items: [
          'Open the contract from the list to review details.',
          'Check variables and the rendered HTML preview.',
          'Click Send for signature when ready.',
          'Use Resend for contracts in Sent or Viewed status.',
          'Use Cancel to stop a contract that should not proceed.',
          'Download the signed copy once the contract is signed.',
        ],
      },
      {
        title: 'Editing and status rules',
        items: [
          'Edit details while a contract is not Signed, Declined, Expired, or Cancelled.',
          'Statuses include Draft, Sent, Viewed, Signed, Declined, Expired, and Cancelled.',
          'Use the timeline to see the latest activity for the contract.',
        ],
      },
    ],
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    description: 'Manage new hire tasks and automation.',
    blocks: [
      {
        title: 'Start onboarding',
        ordered: true,
        items: [
          'Go to Onboarding and click Onboard New Employee.',
          'Select a candidate from the Offer Signed list.',
          'Set the start date and line manager.',
          'Choose the email provider (Personal, Google Workspace, or Custom).',
          'Confirm the work email address and create the workflow.',
          'The employee receives a self-service link to complete their profile and personality assessment.',
        ],
      },
      {
        title: 'Run tasks',
        ordered: true,
        items: [
          'Open a workflow from the list to view tasks and progress.',
          'For manual tasks, click Complete when finished.',
          'For automated tasks, click Run or Retry to execute the automation.',
          'Use Skip with a reason when a task does not apply.',
        ],
      },
      {
        title: 'Automation tips',
        items: [
          'Connect apps in Settings > Applications before running automated tasks.',
          'Use Settings > On/Offboarding Settings to add or reorder default steps.',
          'Use Notifications and Audit Log to track completed tasks.',
        ],
      },
    ],
  },
  {
    id: 'offboarding',
    title: 'Offboarding',
    description: 'Handle employee departures and access removal.',
    blocks: [
      {
        title: 'Start offboarding',
        ordered: true,
        items: [
          'Go to Offboarding and click Offboard employee.',
          'Select the employee and choose immediate or scheduled offboarding.',
          'Set an end date if scheduled, and add a reason or notes.',
          'Configure Google Workspace options if the app is connected.',
          'Create the workflow to start offboarding tasks.',
        ],
      },
      {
        title: 'Complete tasks',
        ordered: true,
        items: [
          'Open the workflow to see tasks and progress.',
          'Run automated tasks or complete manual tasks as they are done.',
          'Skip tasks with a reason if they are not required.',
          'Monitor status changes from Pending to In Progress and Completed.',
        ],
      },
      {
        title: 'Google Workspace options',
        items: [
          'Delete the account to remove access immediately.',
          'Transfer data to another email for Drive and Calendar.',
          'Set an alias email if mail forwarding is required.',
          'Use the default transfer email from Organization profile if available.',
        ],
      },
    ],
  },
  {
    id: 'ai-agent',
    title: 'BlueAI',
    description: 'Chat with BlueAI that understands your HR data and can help with tasks.',
    blocks: [
      {
        title: 'Access BlueAI',
        ordered: true,
        items: [
          'Click BlueAI in the left sidebar (available to SUPER_ADMIN, HR_ADMIN, and IT_ADMIN roles).',
          'Start a new conversation or select a previous chat from the sidebar.',
          'Type your question or request in the text area at the bottom.',
          'Press Enter or click the send button to submit.',
        ],
      },
      {
        title: 'Voice input',
        ordered: true,
        items: [
          'Click the microphone button next to the text input.',
          'Speak your message clearly (browser will request microphone permission).',
          'Click the stop button when finished recording.',
          'Your speech will be transcribed and added to the input field.',
          'Review and edit if needed, then send.',
        ],
      },
      {
        title: 'What BlueAI can do',
        items: [
          'Answer questions about employees, contracts, and onboarding status.',
          'Summarize HR metrics and provide insights.',
          'Help draft communications and policies.',
          'Explain how to use features in the system.',
          'Provide suggestions for workflow improvements.',
        ],
      },
      {
        title: 'Chat history',
        items: [
          'All conversations are saved and can be resumed later.',
          'Use the search box to find previous chats by title or content.',
          'Click New Chat to start a fresh conversation.',
          'Each chat maintains full context of previous messages.',
        ],
      },
    ],
  },
  {
    id: 'personality-values',
    title: 'Personality & Values',
    description: 'Collect and view employee work style preferences during onboarding.',
    blocks: [
      {
        title: 'What it captures',
        items: [
          'Life Values - employees rate importance of 12 values (Family, Career Growth, Work-Life Balance, etc.) on a 1-5 scale.',
          'What You Should Know About Me - 19 questions about work style, communication preferences, and collaboration habits.',
          'This data helps teams understand new hires and work together more effectively.',
        ],
      },
      {
        title: 'Employee onboarding experience',
        ordered: true,
        items: [
          'New hires receive their onboarding link via email.',
          'Step 1: Complete profile (address, contact, bank details, emergency contact).',
          'Step 2: Rate life values by importance (1-5 scale for each value).',
          'Step 3: Answer work style questions (as many or as few as desired).',
          'Step 4: View completion confirmation and resources.',
        ],
      },
      {
        title: 'Viewing employee personality data',
        ordered: true,
        items: [
          'Go to Employees and open an employee profile.',
          'Click the Personality tab.',
          'View Life Values sorted by importance (highest rated first).',
          'Review work style answers in the What You Should Know About Me section.',
          'If data is not available, the employee has not completed this section.',
        ],
      },
      {
        title: 'Best practices',
        items: [
          'Share personality profiles with managers before a new hire starts.',
          'Use life values to understand what motivates team members.',
          'Reference work style preferences in 1:1s and team settings.',
          'Respect that some employees may share less - all questions are optional.',
        ],
      },
    ],
  },
  {
    id: 'applications',
    title: 'Applications and integrations',
    description: 'Connect external systems used in onboarding and offboarding.',
    blocks: [
      {
        title: 'Applications page',
        ordered: true,
        items: [
          'Open Applications in the sidebar to see enabled apps.',
          'Toggle an app on or off when it is connected.',
          'Use Test Connection to validate credentials.',
          'Open Manage in Settings for advanced configuration.',
        ],
      },
      {
        title: 'Configure a connection',
        ordered: true,
        items: [
          'Go to Settings > Applications and open the app you want to connect.',
          'Enter the required credentials (domain, admin email, tokens).',
          'Click Save and verify the connection status.',
          'Run Test Connection to confirm everything is working.',
          'Use Disconnect if you need to rotate credentials.',
        ],
      },
      {
        title: 'Custom apps and archiving',
        items: [
          'Use Add application to create custom integrations.',
          'Archive apps you no longer need and restore them from the archived list.',
          'Use Initialize defaults if you want to rebuild the standard app list.',
        ],
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'In-app alerts and optional email notifications for admins.',
    blocks: [
      {
        title: 'In-app notifications',
        items: [
          'The bell icon shows the unread count for admin roles.',
          'Opening the dropdown marks items as read.',
          'Recent activity includes a label, actor, and timestamp.',
          'Click View all notifications to open the full list.',
        ],
      },
      {
        title: 'Notification center',
        ordered: true,
        items: [
          'Open Notifications from the bell menu or the sidebar.',
          'Use Show archived to view or hide archived items.',
          'Archive items you no longer need and restore them later.',
          'Open the audit log from this page for full history.',
        ],
      },
      {
        title: 'Email notification settings',
        ordered: true,
        items: [
          'Go to Settings > Notifications.',
          'Enable Send email alerts if you want emails in addition to in-app alerts.',
          'Choose the recipient mode: All admins, Initiator, or Selected admins.',
          'Select triggers by category (offers, employees, onboarding, offboarding, apps, provisioning, auth).',
          'Click Save changes and confirm the success message.',
        ],
      },
    ],
  },
  {
    id: 'audit-log',
    title: 'Audit log',
    description: 'System activity for compliance and troubleshooting.',
    blocks: [
      {
        title: 'View and filter',
        ordered: true,
        items: [
          'Go to Settings > Audit Log.',
          'Filter by action, resource type, and date range.',
          'Clear filters to reset the view.',
        ],
      },
      {
        title: 'How to interpret entries',
        items: [
          'Timestamp shows when the activity occurred.',
          'Actor shows who performed the action (user or system).',
          'Action shows what happened (created, updated, deleted, signed).',
          'Resource shows the affected entity and identifier.',
          'Details provide extra context for troubleshooting.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-hiring-flow',
    title: 'Recruiting hiring flow',
    description: 'Manage interview stages for each role type.',
    blocks: [
      {
        title: 'Where to edit',
        items: [
          'Go to Recruiting > Settings > Hiring Flow.',
          'Or open Settings > Hiring > Hiring Flows to jump into the same page.',
          'Pick the role flow you want to manage.',
        ],
      },
      {
        title: 'Step-by-step',
        ordered: true,
        items: [
          'Select a flow (Standard, Engineering, Sales, Executive).',
          'Edit stage names to match your process.',
          'Add or remove stages to reflect real-world steps.',
          'Review the preview to confirm the order.',
          'Click Save Changes to apply updates (button turns green to confirm).',
        ],
      },
      {
        title: 'Access',
        items: [
          'SUPER_ADMIN and HR_ADMIN can edit hiring flows.',
          'MANAGER can view flows when creating positions.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-interest-forms',
    title: 'Interest forms',
    description: 'Create application forms that candidates fill out when applying.',
    blocks: [
      {
        title: 'What they are',
        items: [
          'Interest forms are custom application questionnaires linked to job postings.',
          'Candidates complete these forms when they apply for a position.',
          'Forms can include text fields, dropdowns, multi-select, rating scales, and more.',
          'One form can be marked as default for new jobs.',
        ],
      },
      {
        title: 'Create or edit a form',
        ordered: true,
        items: [
          'Go to Recruiting > Settings > Interest Forms.',
          'Click Create Form or Edit on an existing form.',
          'Enter a form name and optional description.',
          'Add questions with the appropriate field type (Short Text, Long Text, Dropdown, Multi-Select, Rating Scale, etc).',
          'Mark questions as required or optional.',
          'For dropdown or multi-select, enter comma-separated options.',
          'Click Create Form or Update Form to save.',
        ],
      },
      {
        title: 'Link to jobs',
        items: [
          'When creating or editing a job, select an interest form to attach.',
          'Candidates see and complete this form on the public apply page.',
          'View submitted responses in the candidate profile.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-rubrics',
    title: 'Interview rubrics',
    description: 'Define scoring criteria for consistent candidate evaluation.',
    blocks: [
      {
        title: 'What they are',
        items: [
          'Rubrics define the criteria interviewers use to score candidates.',
          'Each rubric is tied to an interview stage (HR Screen, Technical, Panel, etc).',
          'Criteria include a name, description, and weight (1-5).',
          'Scores use a 1-5 scale from Poor to Excellent.',
        ],
      },
      {
        title: 'Create or edit a rubric',
        ordered: true,
        items: [
          'Go to Recruiting > Settings > Interview Rubrics.',
          'Click Create Rubric or Edit on an existing rubric.',
          'Enter a rubric name and select the interview stage.',
          'Add scoring criteria with names, descriptions, and weights.',
          'Higher weights indicate more important criteria.',
          'Click Create Rubric or Update Rubric to save.',
        ],
      },
      {
        title: 'Using rubrics in interviews',
        items: [
          'When scheduling an interview, the assigned rubric determines the scorecard.',
          'Interviewers rate each criterion from 1-5 with notes.',
          'Scores are aggregated across all interviewers for comparison.',
          'Click on a rubric to preview the scoring scale and criteria.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-scoring',
    title: 'Candidate scoring',
    description: 'Configure how overall candidate scores are weighted.',
    blocks: [
      {
        title: 'Where to configure',
        items: [
          'Go to Recruiting > Settings > Candidate Scoring.',
          'Enable or disable score inputs based on your process.',
        ],
      },
      {
        title: 'Step-by-step',
        ordered: true,
        items: [
          'Toggle the inputs you want included in the overall score.',
          'Adjust the weight sliders to set their importance.',
          'Review the enabled weight total (weights are normalized).',
          'Click Save Scoring to apply the new weights.',
        ],
      },
      {
        title: 'Notes',
        items: [
          'Only available profile data is included in the calculation.',
          'Missing inputs are excluded from the weighted average.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-job-score-display',
    title: 'Job score display',
    description: 'Control the score shown in the jobs list donut.',
    blocks: [
      {
        title: 'Where to configure',
        items: [
          'Go to Settings > Hiring > General Settings.',
          'Locate Jobs list score display.',
        ],
      },
      {
        title: 'Step-by-step',
        ordered: true,
        items: [
          'Choose Average score to show the mean candidate score.',
          'Choose Max score to highlight the top candidate score.',
          'Return to Hiring > Positions to see the updated donut value and label.',
        ],
      },
      {
        title: 'Notes',
        items: [
          'Only candidates with a score contribute to the metrics.',
          'The display choice does not change candidate scores, only the jobs list summary.',
        ],
      },
    ],
  },
  {
    id: 'candidate-profile-export',
    title: 'Candidate profile export',
    description: 'Download a structured PDF summary of a candidate profile.',
    blocks: [
      {
        title: 'How to export',
        ordered: true,
        items: [
          'Open Recruiting > Candidates and select a candidate.',
          'In the profile header, click Export Profile.',
          'Wait for the PDF to generate and download.',
          'Share the PDF with stakeholders or attach it to hiring notes.',
        ],
      },
      {
        title: 'What is included',
        items: [
          'Candidate contact details, stage, and position.',
          'Weighted score breakdown and overall score.',
          'Stage progress, interviews, and assessments.',
          'BlueAI summary, strengths, and areas to explore.',
          'Must-validate items and resume summary when available.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-jobs',
    title: 'Recruiting jobs',
    description: 'Create and manage job roles for the recruiting pipeline.',
    blocks: [
      {
        title: 'Create a job',
        ordered: true,
        items: [
          'Go to Recruiting > Positions and click Create Job.',
          'Fill in the job details (title, team, employment type, priority).',
          'Set a Deadline date to indicate when the role should be filled.',
          'Set Number of Hires if you plan to fill multiple seats.',
          'Add locations (multi-select); you can enter any city or region and Lagos is suggested.',
          'Choose the interview flow and required competencies.',
          'Click Create Job to publish or Save as Draft to finish later.',
        ],
      },
      {
        title: 'Dates in job headers',
        items: [
          'Start shows the job creation date.',
          'Deadline shows the target fill date you set in job details.',
        ],
      },
    ],
  },
  {
    id: 'settings-reference',
    title: 'Settings reference',
    description: 'What each Settings page does and how to use it.',
    blocks: [
      {
        title: 'Organization profile',
        items: [
          'Upload a logo and update company information.',
          'Edit letterhead fields (email, phone, website, address).',
          'Set the default Google Workspace transfer email if needed.',
          'Save changes to apply them across templates.',
        ],
      },
      {
        title: 'App Admins',
        items: [
          'Invite new admins by email and assign a role.',
          'Copy the invite link when email delivery is not available.',
          'Resend or revoke pending invites as needed.',
          'Update roles for existing admins.',
        ],
      },
      {
        title: 'Signature blocks',
        items: [
          'Create signatory blocks used on offers and contracts.',
          'Store the signatory name, title, and optional signature image.',
          'Edit existing blocks to update signatory information.',
        ],
      },
      {
        title: 'Legal entities',
        items: [
          'Add the legal entities used on offers and contracts.',
          'Remove entities that are no longer in use.',
          'Select a legal entity when creating a new contract.',
        ],
      },
      {
        title: 'Contract templates',
        items: [
          'Open a template type (full time, contractor, internship, etc).',
          'Edit the name, description, and template body.',
          'Use placeholders like %{variable_name} for dynamic values.',
          'Save to apply the template to new contracts.',
        ],
      },
      {
        title: 'On/Offboarding settings',
        items: [
          'Open On/Offboarding Settings to manage both flows.',
          'Add manual or integration steps for onboarding.',
          'Edit offboarding tasks used in employee departures.',
          'Reorder steps to match your internal process.',
          'Reset to defaults if you need the base workflow.',
        ],
      },
      {
        title: 'Integrations (Settings)',
        items: [
          'Initialize default integrations if the list is empty.',
          'Create custom integrations for tools not listed by default.',
          'Archive and restore integrations as your stack changes.',
          'Open an integration to configure credentials and run tests.',
        ],
      },
      {
        title: 'BlueAI Settings',
        items: [
          'Configure BlueAI behavior and capabilities.',
          'View chat history and usage statistics.',
          'Manage BlueAI access by role.',
        ],
      },
      {
        title: 'API settings',
        items: [
          'Create API keys for integrations and automation.',
          'Copy the generated key immediately and store it securely.',
          'Revoke keys that are no longer needed.',
          'Open API documentation for developer guidance.',
        ],
      },
      {
        title: 'Documentation',
        items: [
          'Use this page as a reference for every module.',
          'Start with Quick start if you are setting up a new workspace.',
          'Use the table of contents to jump to a specific section.',
        ],
      },
    ],
  },
  {
    id: 'my-profile',
    title: 'My Profile',
    description: 'Manage your own account details and password.',
    blocks: [
      {
        title: 'What you can do',
        items: [
          'View your name, email, and role.',
          'Open your linked employee profile if available.',
          'Update your password securely.',
        ],
      },
      {
        title: 'Step-by-step',
        ordered: true,
        items: [
          'Open the profile menu and click My Profile.',
          'Review your account details.',
          'Fill out the Update Password form and save changes.',
        ],
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Common issues and quick checks.',
    blocks: [
      {
        title: 'Notifications not showing',
        items: [
          'Confirm you are using an admin role (only admins see notifications).',
          'Check Settings > Notifications for email settings.',
          'Disable Show archived if you only want active items.',
        ],
      },
      {
        title: 'Automation tasks failing',
        items: [
          'Verify the app connection in Settings > Applications.',
          'Run Test Connection and confirm the status is Connected.',
          'Review provisioning rules and required app permissions.',
          'Check the Audit Log for details on the failure.',
        ],
      },
      {
        title: 'Contracts not sending',
        items: [
          'Confirm the candidate email and signature block are set.',
          'Make sure the contract is in Draft status before sending.',
          'Check Notifications and the Audit Log for any errors.',
        ],
      },
    ],
  },
]

export default function DocumentationPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Documentation"
        description="Step-by-step guidance for every area of Curacel People."
      />

      <div className="space-y-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Table of contents</CardTitle>
            <CardDescription>Jump to any section in this guide.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {docSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {section.title}
              </a>
            ))}
          </CardContent>
        </Card>

        {docSections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.blocks.map((block, blockIndex) => (
                  <div key={`${section.id}-${blockIndex}`} className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">{block.title}</h4>
                    {block.text ? (
                      <p className="text-sm text-foreground/80">{block.text}</p>
                    ) : null}
                    {block.items ? (
                      block.ordered ? (
                        <ol className="list-decimal list-inside text-sm text-foreground/80 space-y-1">
                          {block.items.map((item, itemIndex) => (
                            <li key={`${section.id}-${blockIndex}-${itemIndex}`}>{item}</li>
                          ))}
                        </ol>
                      ) : (
                        <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
                          {block.items.map((item, itemIndex) => (
                            <li key={`${section.id}-${blockIndex}-${itemIndex}`}>{item}</li>
                          ))}
                        </ul>
                      )
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        ))}
      </div>
    </div>
  )
}
