# Claude Code Instructions

## Auto-Restart Server

After any update that requires a server restart (schema changes, router changes, component changes):
1. Kill any existing dev server on port 3000
2. Run `npm run dev` in background
3. Display the new URL (http://localhost:3000)

## Auto-Push to GitHub

After every successful update:
1. Stage all changes with `git add -A`
2. Commit with a descriptive message following conventional commits (feat:, fix:, etc.)
3. Push to origin main with `git push origin main`

## Development Workflow

1. Make code changes
2. Restart dev server if needed
3. Verify changes work
4. Commit and push to GitHub

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Prisma ORM with PostgreSQL
- tRPC for API
- Tailwind CSS
- Recharts for data visualization
- NextAuth.js for authentication
