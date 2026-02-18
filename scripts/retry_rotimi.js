const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Client } = require('pg');
const { randomUUID } = require('crypto');

async function main() {
    const candidateId = 'e7ed4797-3a7a-4bae-9418-7e29aa417c56'; // Rotimi
    const stage = 'TRIAL';

    console.log(`Resetting ${stage} email for candidate ${candidateId}...`);

    // 1. Find the email
    const email = await prisma.queuedStageEmail.findFirst({
        where: {
            candidateId,
            toStage: stage,
            status: { in: ['FAILED', 'SKIPPED'] }
        }
    });

    if (!email) {
        console.log('No FAILED/SKIPPED email found.');
        return;
    }

    console.log('Found email:', email.id, email.status);

    // 2. Reset status
    await prisma.queuedStageEmail.update({
        where: { id: email.id },
        data: {
            status: 'PENDING',
            error: null,
            processedAt: null,
            scheduledFor: new Date()
        }
    });
    console.log('Reset email status to PENDING.');

    // 3. Create new job directly via PG
    // Strip params to avoid sslmode conflict
    const url = process.env.DATABASE_URL.split('?')[0];
    const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    const jobId = randomUUID();
    const res = await client.query(`
    INSERT INTO public.job (id, name, data, state, createdon, startafter)
    VALUES ($1, 'stage-email-send', $2, 'created', now(), now())
    RETURNING id
  `, [jobId, { queuedEmailId: email.id }]);

    console.log('Created new job:', res.rows[0].id);

    await client.end();
}

main().catch(console.error).finally(() => prisma.$disconnect());
