import prisma from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

async function main() {
  const domain = process.env.GOOGLE_WORKSPACE_DOMAIN
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

  if (!domain) throw new Error('GOOGLE_WORKSPACE_DOMAIN is required')
  if (!adminEmail) throw new Error('GOOGLE_WORKSPACE_ADMIN_EMAIL is required')
  if (!serviceAccountKey) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is required')

  const app = await prisma.app.findFirst({ where: { type: 'GOOGLE_WORKSPACE' } })
  if (!app) throw new Error('No GOOGLE_WORKSPACE app found; run Initialize Apps/seed first')

  const config = { domain, adminEmail, serviceAccountKey }

  await prisma.appConnection.upsert({
    where: { appId_domain: { appId: app.id, domain } },
    create: {
      appId: app.id,
      domain,
      configEncrypted: encrypt(JSON.stringify(config)),
      isActive: true,
    },
    update: {
      domain,
      configEncrypted: encrypt(JSON.stringify(config)),
      isActive: true,
    },
  })

  console.log('Google Workspace connection saved for domain', domain)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
