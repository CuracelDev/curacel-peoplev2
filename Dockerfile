FROM node:20-alpine AS base
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# openssl is required for Prisma Client to work on Alpine
RUN apk add --no-cache libc6-compat openssl

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
# Remove package-lock.json to ensure platform-specific dependencies (like SWC for Alpine) are installed correctly
RUN rm -f package-lock.json && npm install --legacy-peer-deps

# Development stage for docker-compose
FROM base AS development
WORKDIR /app
COPY package.json package-lock.json* ./
RUN rm -f package-lock.json && npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate
EXPOSE 3800
CMD ["npm", "run", "dev"]

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY . .
# Remove node_modules that might have been copied from the host to ensure a clean state
RUN rm -rf node_modules
COPY --from=deps /app/node_modules ./node_modules

# Generate Prisma Client
RUN npx prisma@5.10.2 generate

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
# Note: Ensure "output: 'standalone'" is configured in next.config.js
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder
# Note: If your project doesn't have a public folder, you can remove this line
COPY --from=builder /app/public ./public

# Set up .next directory permissions
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3800

ENV PORT 3800
ENV HOSTNAME "0.0.0.0"

# Health check using wget (available in alpine)
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3800/api/auth/session || exit 1

CMD ["node", "server.js"]