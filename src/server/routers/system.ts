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

                // We'll try to use the container name directly if a service is provided,
                // otherwise we use docker compose with a project name to aggregate.
                // Project name is usually 'curacel-people' based on the container names.
                const projectName = 'curacel-people'

                let command = ''
                if (service && service !== 'all') {
                    // If we have a specific service, we can try to find the container name
                    // In our compose it's 'curacel-people-app-v2', etc.
                    const containerName = service.includes(projectName) ? service : `${projectName}-${service}-v2`
                    command = `docker logs --tail ${lines} --timestamps ${containerName}`
                } else {
                    // For all logs, use project name with docker compose to avoid needing the .yml file
                    command = `docker compose -p ${projectName} logs --tail ${lines} --no-color --timestamps`
                }

                try {
                    const { stdout, stderr } = await execAsync(command)
                    return {
                        logs: stdout || stderr || 'No logs found.',
                        success: true,
                    }
                } catch (error) {
                    // Fallback: If project name 'curacel-people' failed, try without v2 suffix or wait for generic 'docker compose logs'
                    // Actually, let's try a very broad fallback: find any container with our project label
                    const fallbackCmd = `docker ps --filter "label=com.docker.compose.project" --format "{{.ID}}" | xargs -I {} docker logs --tail ${Math.floor(lines / 3)} --timestamps {}`

                    try {
                        const { stdout, stderr } = await execAsync(fallbackCmd)
                        return {
                            logs: stdout || stderr || 'No logs found in fallback.',
                            success: true,
                        }
                    } catch (v1Error) {
                        console.error('Failed to fetch docker logs:', v1Error)
                        return {
                            logs: `Error fetching logs: Project context not found.\n\nTechnicals: ${v1Error instanceof Error ? v1Error.message : String(v1Error)}\n\n💡 Try selecting a specific service from the dropdown.`,
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
            // Find container names via docker ps to avoid needing the config file
            const { stdout } = await execAsync('docker ps --format "{{.Names}}"')
            const containers = stdout.split('\n').filter(Boolean)
            return containers.length > 0 ? containers : ['app', 'db', 'redis']
        } catch (error) {
            return ['app', 'db', 'redis']
        }
    }),
})
