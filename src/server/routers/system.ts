import { z } from 'zod'
import { router, adminProcedure } from '@/lib/trpc'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const systemRouter = router({
    getLogs: adminProcedure
        .input(
            z.object({
                lines: z.number().default(100),
                service: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            try {
                const { lines, service } = input

                // Try 'docker compose' first (V2), then 'docker-compose' (V1)
                let command = `docker compose logs --tail ${lines} --no-color --timestamps`
                if (service) {
                    command += ` ${service}`
                }

                try {
                    const { stdout, stderr } = await execAsync(command)
                    return {
                        logs: stdout || stderr || 'No logs found.',
                        success: true,
                    }
                } catch (error) {
                    // Fallback to docker-compose v1
                    const v1Command = command.replace('docker compose', 'docker-compose')
                    try {
                        const { stdout, stderr } = await execAsync(v1Command)
                        return {
                            logs: stdout || stderr || 'No logs found.',
                            success: true,
                        }
                    } catch (v1Error) {
                        console.error('Failed to fetch docker logs:', v1Error)
                        return {
                            logs: `Error fetching logs: Docker might not be available or accessible from the application container.\n\nCommand attempted: ${command}\n\nTechnical details: ${v1Error instanceof Error ? v1Error.message : String(v1Error)}`,
                            success: false,
                        }
                    }
                }
            } catch (error) {
                return {
                    logs: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
                    success: false,
                }
            }
        }),

    getServices: adminProcedure.query(async () => {
        try {
            const { stdout } = await execAsync('docker compose ps --format json')
            const services = JSON.parse(stdout)
            return services.map((s: any) => s.Service)
        } catch (error) {
            // Fallback or handle missing docker
            return ['app', 'db', 'redis'] // Reasonable defaults
        }
    }),
})
