import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get the first job or create one
  const existingJob = await prisma.job.findFirst()

  if (existingJob) {
    // Update existing job with mock data
    const updatedJob = await prisma.job.update({
      where: { id: existingJob.id },
      data: {
        title: 'Senior Backend Engineer',
        department: 'Engineering',
        employmentType: 'full-time',
        status: 'ACTIVE',
        priority: 4,
        deadline: new Date('2026-01-31'),
        hiresCount: 1,
        salaryMin: 120000,
        salaryMax: 180000,
        salaryCurrency: 'USD',
        salaryFrequency: 'annually',
        equityMin: 0.1,
        equityMax: 0.5,
        locations: ['Remote', 'Lagos, NG', 'Nairobi, KE'],
        autoArchiveLocation: true,
      },
    })
    console.log('Updated job:', updatedJob.title)
  } else {
    // Create a new job with mock data
    const newJob = await prisma.job.create({
      data: {
        title: 'Senior Backend Engineer',
        department: 'Engineering',
        employmentType: 'full-time',
        status: 'ACTIVE',
        priority: 4,
        deadline: new Date('2026-01-31'),
        hiresCount: 1,
        salaryMin: 120000,
        salaryMax: 180000,
        salaryCurrency: 'USD',
        salaryFrequency: 'annually',
        equityMin: 0.1,
        equityMax: 0.5,
        locations: ['Remote', 'Lagos, NG', 'Nairobi, KE'],
        autoArchiveLocation: true,
      },
    })
    console.log('Created job:', newJob.title)
  }

  // Create additional mock jobs for variety
  const mockJobs = [
    {
      title: 'Product Designer',
      department: 'Design',
      employmentType: 'full-time',
      status: 'ACTIVE' as const,
      priority: 3,
      deadline: new Date('2026-02-15'),
      hiresCount: 2,
      salaryMin: 90000,
      salaryMax: 140000,
      salaryCurrency: 'USD',
      salaryFrequency: 'annually',
      locations: ['Lagos, NG'],
    },
    {
      title: 'Growth Lead',
      department: 'Growth',
      employmentType: 'full-time',
      status: 'ACTIVE' as const,
      priority: 5,
      deadline: new Date('2026-01-15'),
      hiresCount: 1,
      salaryMin: 100000,
      salaryMax: 150000,
      salaryCurrency: 'USD',
      salaryFrequency: 'annually',
      locations: ['Remote', 'Lagos, NG'],
    },
  ]

  for (const jobData of mockJobs) {
    const exists = await prisma.job.findFirst({
      where: { title: jobData.title },
    })

    if (!exists) {
      await prisma.job.create({ data: jobData })
      console.log('Created job:', jobData.title)
    } else {
      console.log('Job already exists:', jobData.title)
    }
  }

  console.log('Done seeding mock jobs!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
