
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const assessments = await prisma.candidateAssessment.findMany({
        where: {
            template: {
                name: { contains: 'OCEAN', mode: 'insensitive' }
            }
        },
        include: {
            candidate: true,
            template: true
        },
        take: 10
    })

    console.log(JSON.stringify(assessments.map(a => ({
        id: a.id,
        candidate: a.candidate.name,
        candidateStage: a.candidate.stage,
        template: a.template.name,
        externalUrl: a.externalUrl,
        templateExternalUrl: a.template.externalUrl,
        status: a.status
    })), null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
