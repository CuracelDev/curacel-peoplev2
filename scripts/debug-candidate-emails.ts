
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const candidateId = '46621ba2-74d5-4092-be8c-e6ebb24e398a'

    console.log('--- Checking Candidate ---')
    const candidate = await prisma.jobCandidate.findUnique({
        where: { id: candidateId },
        include: { job: true }
    })
    console.log('Candidate:', candidate?.name, 'Current Stage:', candidate?.stage)

    console.log('\n--- Checking Email Settings ---')
    const settings = await prisma.emailSettings.findFirst()
    console.log('Email Settings:', JSON.stringify(settings?.autoSendStages, null, 2))

    console.log('\n--- Checking Queued Emails for Candidate ---')
    const queued = await prisma.queuedStageEmail.findMany({
        where: { candidateId },
        orderBy: { createdAt: 'desc' }
    })
    console.log('Queued Emails:', queued.length)
    queued.forEach(q => {
        console.log(`- To: ${q.toStage}, Status: ${q.status}, Scheduled: ${q.scheduledFor}, Error: ${q.error || 'None'}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
