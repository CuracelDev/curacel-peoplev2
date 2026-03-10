import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const templates = await prisma.assessmentTemplate.findMany({
    where: { name: { contains: 'Big Ocean', mode: 'insensitive' } }
  })
  console.log(templates)
}
main()
