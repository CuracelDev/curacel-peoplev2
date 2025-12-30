import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BYOD_AGREEMENT_HTML = `
<h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 24px;">
  BRING YOUR OWN DEVICE (BYOD) UNDERTAKING FORM
</h1>

<div style="margin-bottom: 24px;">
  <p style="margin-bottom: 12px;">
    I, <strong>{{employee_name}}</strong>, working in the <strong>{{department}}</strong> department
    as <strong>{{job_title}}</strong>, hereby acknowledge that I will be using my personal device(s)
    for official company work purposes.
  </p>
</div>

<h2 style="font-size: 18px; font-weight: bold; margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
  Device Information
</h2>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
  <tr>
    <td style="padding: 8px; border: 1px solid #ccc; width: 40%; font-weight: 600;">Device Model/Name</td>
    <td style="padding: 8px; border: 1px solid #ccc;">{{device_model}}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ccc; font-weight: 600;">Product Serial Number</td>
    <td style="padding: 8px; border: 1px solid #ccc;">{{serial_number}}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ccc; font-weight: 600;">Charger Serial Number</td>
    <td style="padding: 8px; border: 1px solid #ccc;">{{charger_serial}}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ccc; font-weight: 600;">IMEI Number (if applicable)</td>
    <td style="padding: 8px; border: 1px solid #ccc;">{{imei_number}}</td>
  </tr>
</table>

<h2 style="font-size: 18px; font-weight: bold; margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
  Terms and Conditions
</h2>

<div style="margin-bottom: 24px;">
  <p style="margin-bottom: 12px;">By signing this undertaking, I agree to the following:</p>

  <ol style="margin-left: 20px; line-height: 1.8;">
    <li style="margin-bottom: 8px;">
      <strong>IT Access:</strong> I understand that the Company's IT department may need access to my device
      for security configuration, software installation, or troubleshooting purposes related to company work.
    </li>
    <li style="margin-bottom: 8px;">
      <strong>Data Responsibility:</strong> I acknowledge that I am responsible for maintaining the security
      of company data stored on or accessed through my personal device. I will use appropriate security
      measures including but not limited to password protection, encryption, and keeping software up to date.
    </li>
    <li style="margin-bottom: 8px;">
      <strong>Acceptable Use:</strong> I will use my device in accordance with the Company's IT policies
      and acceptable use guidelines. I will not install or use software that may compromise company
      security or data.
    </li>
    <li style="margin-bottom: 8px;">
      <strong>Data Separation:</strong> I understand that company data should be kept separate from personal
      data where possible, and I will follow company guidelines for data handling and storage.
    </li>
    <li style="margin-bottom: 8px;">
      <strong>Loss or Theft:</strong> I will immediately report any loss, theft, or security breach
      involving my device to the IT department and my manager.
    </li>
    <li style="margin-bottom: 8px;">
      <strong>Exit Procedures:</strong> Upon termination of employment, I agree to allow the IT department
      to remove all company data, applications, and access credentials from my device.
    </li>
    <li style="margin-bottom: 8px;">
      <strong>No Company Liability:</strong> I understand that the Company is not responsible for loss,
      damage, or theft of my personal device, nor for any personal data stored on my device.
    </li>
    <li style="margin-bottom: 8px;">
      <strong>Compliance:</strong> I agree to comply with all applicable data protection laws and
      regulations when handling company data on my personal device.
    </li>
  </ol>
</div>

<h2 style="font-size: 18px; font-weight: bold; margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
  Acknowledgment
</h2>

<div style="margin-bottom: 24px;">
  <p style="margin-bottom: 16px;">
    I have read and understood this BYOD Undertaking Form. I agree to abide by all terms and conditions
    outlined above and any related company policies regarding the use of personal devices for work purposes.
  </p>

  <p style="margin-bottom: 16px;">
    I acknowledge that failure to comply with these terms may result in disciplinary action, up to and
    including termination of employment.
  </p>
</div>

<table style="width: 100%; border-collapse: collapse; margin-top: 32px;">
  <tr>
    <td style="padding: 16px; width: 50%;">
      <p style="margin-bottom: 40px; font-weight: 600;">Employee Signature:</p>
      <p style="border-top: 1px solid #000; padding-top: 8px;">{{employee_name}}</p>
    </td>
    <td style="padding: 16px; width: 50%;">
      <p style="margin-bottom: 40px; font-weight: 600;">Date:</p>
      <p style="border-top: 1px solid #000; padding-top: 8px;">{{signature_date}}</p>
    </td>
  </tr>
</table>
`

const BYOD_VARIABLE_SCHEMA = {
  employee_name: {
    label: 'Employee Full Name',
    type: 'text' as const,
    required: true,
  },
  department: {
    label: 'Department',
    type: 'text' as const,
    required: true,
  },
  job_title: {
    label: 'Job Title',
    type: 'text' as const,
    required: true,
  },
  device_model: {
    label: 'Device Model/Name',
    type: 'text' as const,
    required: true,
  },
  serial_number: {
    label: 'Product Serial Number',
    type: 'text' as const,
    required: false,
    defaultValue: 'N/A',
  },
  charger_serial: {
    label: 'Charger Serial Number',
    type: 'text' as const,
    required: false,
    defaultValue: 'N/A',
  },
  imei_number: {
    label: 'IMEI Number',
    type: 'text' as const,
    required: false,
    defaultValue: 'N/A',
  },
  signature_date: {
    label: 'Signature Date',
    type: 'date' as const,
    required: true,
  },
}

async function main() {
  console.log('Seeding BYOD Agreement template...')

  // Check if BYOD template already exists
  const existing = await prisma.offerTemplate.findFirst({
    where: {
      name: { contains: 'BYOD', mode: 'insensitive' },
    },
  })

  if (existing) {
    console.log('BYOD template already exists, updating...')
    await prisma.offerTemplate.update({
      where: { id: existing.id },
      data: {
        name: 'BYOD Agreement',
        description: 'Bring Your Own Device undertaking form for employees using personal devices for work',
        bodyHtml: BYOD_AGREEMENT_HTML,
        bodyMarkdown: null,
        employmentType: null, // Applies to all employment types
        includeNda: false,
        includePii: false,
        variableSchema: BYOD_VARIABLE_SCHEMA,
        isActive: true,
      },
    })
    console.log('BYOD template updated successfully!')
  } else {
    await prisma.offerTemplate.create({
      data: {
        name: 'BYOD Agreement',
        description: 'Bring Your Own Device undertaking form for employees using personal devices for work',
        bodyHtml: BYOD_AGREEMENT_HTML,
        bodyMarkdown: null,
        employmentType: null,
        includeNda: false,
        includePii: false,
        variableSchema: BYOD_VARIABLE_SCHEMA,
        isActive: true,
      },
    })
    console.log('BYOD template created successfully!')
  }
}

main()
  .catch((e) => {
    console.error('Error seeding BYOD template:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
