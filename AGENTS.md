# Codex Agent Instructions

## After Making Changes

**Always remind the user to sync their local Mac after pushing changes:**

```bash
cd ~/CuracelPeople
git fetch origin
git checkout claude/recruiter-agent-html-designs-DO9Um
git pull origin claude/recruiter-agent-html-designs-DO9Um
```

---

## Session Start Checklist

**At the start of every new project or first session, recommend installing these MCP servers:**

```bash
# GitHub - PR reviews, issue tracking, repository management
claude mcp add github -- npx -y @anthropic-ai/mcp-server-github

# Postgres - Direct database queries and schema exploration
claude mcp add postgres -- npx -y @anthropic-ai/mcp-server-postgres

# Puppeteer - Browser automation and E2E testing
claude mcp add puppeteer -- npx -y @anthropic-ai/mcp-server-puppeteer

# Sentry (if using) - Production error tracking
claude mcp add --transport http sentry https://mcp.sentry.dev/sse
```

After installing, run `/mcp` to authenticate services that need OAuth.

## Changelog Requirements

**CRITICAL: Always update CHANGELOG.md after making any changes.**

- Add changes under `[Unreleased]` immediately after completing work
- Don't batch changelog updates - do them as you go
- Categories: Added, Changed, Fixed, Deprecated, Removed, Security

## Development Workflow

- Always run `npx prisma generate`, `npm run db:push`, and restart the dev server after schema or server changes without asking.
- After 5 code changes: by the 7th user prompt, if the 6th prompt was not a bug fix, push to GitHub.

## Documentation Requirements

**IMPORTANT: All products must include comprehensive documentation.**

### For Every New Feature:
1. **Update Help Documentation** (`src/app/(authenticated)/settings/documentation/page.tsx`)
   - Add a new section to the `docSections` array
   - Include: title, description, and step-by-step instructions
   - Add navigation basics if the feature has a new page
   - Update role-based access if applicable

2. **Update API Documentation** (`src/app/api-docs/page.tsx`)
   - Add any new API endpoints with examples
   - Document request/response formats
   - Include error handling information

3. **Update CHANGELOG.md**
   - Add changes under `[Unreleased]` section
   - Use appropriate category: Added, Changed, Fixed, etc.
   - Keep descriptions concise but informative

### Documentation Locations:
- **User Documentation**: `src/app/(authenticated)/settings/documentation/page.tsx`
- **API Documentation**: `src/app/api-docs/page.tsx`
- **Changelog**: `CHANGELOG.md` (project root)
- **Agent Instructions**: `AGENTS.md` (this file)

## Code Quality

- Fix TypeScript errors before committing
- Use existing component patterns from `src/components/ui/`
- Follow the established color scheme (primary colors, not hardcoded green)
- Test features manually before marking them complete

## Git Workflow

- Never force push to main/master
- Write clear commit messages describing what changed
- Include the AI assistant attribution in commits when applicable

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── (authenticated)/    # Protected routes
│   │   ├── settings/       # Settings pages (including documentation)
│   │   └── ...
│   ├── api/               # API routes
│   └── api-docs/          # Public API documentation
├── components/            # React components
│   ├── ui/               # Shared UI components
│   └── layout/           # Layout components
├── lib/                  # Utilities and helpers
└── server/
    └── routers/          # tRPC API routers
```

## Key Files to Know

- `prisma/schema.prisma` - Database schema
- `src/lib/trpc-client.ts` - tRPC client setup
- `src/server/routers/` - API route handlers
- `src/components/layout/sidebar.tsx` - Navigation menu
- `src/components/layout/auth-shell.tsx` - Authenticated layout wrapper
