
import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const redisEnabled = process.env.REDIS_ENABLED !== 'false'

// Mock Redis client for when Redis is disabled
const mockRedis = {
    get: async () => null,
    set: async () => 'OK',
    setex: async () => 'OK',
    del: async () => 0,
    on: () => mockRedis,
} as unknown as Redis

let redisClient: Redis

if (redisEnabled) {
    redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true, // Don't connect until first command
        retryStrategy(times) {
            if (times > 3) {
                console.warn('[Redis] Max retries reached, disabling Redis')
                return null // Stop retrying
            }
            return Math.min(times * 100, 2000)
        },
    })

    redisClient.on('error', (err) => {
        // Log only once, not on every retry
        if (!redisClient.status || redisClient.status === 'connecting') {
            console.warn('[Redis] Connection failed, caching disabled:', err.message)
        }
    })

    redisClient.on('connect', () => {
        console.log('[Redis] Connected')
    })
} else {
    console.log('[Redis] Disabled via REDIS_ENABLED=false')
    redisClient = mockRedis
}

export const redis = redisClient
