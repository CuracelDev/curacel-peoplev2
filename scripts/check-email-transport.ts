import { loadEnvConfig } from '@next/env'
import { getEmailTransportStatus } from '@/lib/email'

loadEnvConfig(process.cwd())

const status = getEmailTransportStatus()
console.log(status)
