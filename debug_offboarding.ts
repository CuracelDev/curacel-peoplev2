import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const employee = await prisma.employee.findFirst({
        where: { fullName: { contains: 'Ifeoma' } }
    });

    if (!employee) {
        console.log('Employee Ifeoma not found');
        return;
    }

    console.log('Employee found:', employee.id, employee.fullName, employee.workEmail);

    const logs = await prisma.auditLog.findMany({
        where: {
            OR: [
                { employeeId: employee.id },
                { resourceId: employee.id },
                { metadata: { path: ['employeeId'], equals: employee.id } }
            ]
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log('Audit Logs:', JSON.stringify(logs, null, 2));

    const accounts = await prisma.appAccount.findMany({
        where: { employeeId: employee.id },
        include: { app: true }
    });

    console.log('App Accounts:', JSON.stringify(accounts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
