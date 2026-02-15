
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const jobId = '2f2d04e5-b440-4858-82df-76917aefd4d6'
    const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, title: true, description: true },
    })

    if (!job) {
        console.log(`Job with id ${jobId} not found`)
        return
    }

    console.log(`Job found: ${job.title}`)
    console.log('--- DESCRIPTION START ---')
    console.log(job.description)
    console.log('--- DESCRIPTION END ---')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
