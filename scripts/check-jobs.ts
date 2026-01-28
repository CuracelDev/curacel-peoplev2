import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.job.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      isPublic: true,
      slug: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  console.log('\n=== Jobs in Database ===\n')
  jobs.forEach(job => {
    console.log(`ID: ${job.id}`)
    console.log(`Title: ${job.title}`)
    console.log(`Status: ${job.status}`)
    console.log(`Is Public: ${job.isPublic}`)
    console.log(`Slug: ${job.slug}`)
    console.log('---')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
