# Claude Code Instructions

## Core Philosophy: AI-First Development

**CRITICAL: Every feature must be built with agentic AI capabilities.**

All applications should be intelligent and proactive - doing more work than the user. Apply this principle to every feature:

### AI Integration Requirements

1. **Proactive Actions**: Features should anticipate user needs and take action automatically
   - Auto-fill forms based on context
   - Suggest next steps before users ask
   - Auto-complete workflows when possible

2. **Intelligent Recommendations**: Every list, dashboard, and decision point should include AI-powered suggestions
   - Candidate screening with AI scoring and recommendations
   - Smart scheduling that considers all factors
   - Automated prioritization of tasks and items

3. **Natural Language Interfaces**: Where applicable, add conversational AI capabilities
   - Allow users to describe what they want in plain English
   - AI interprets intent and executes complex actions

4. **Autonomous Workflows**: Build features that can run with minimal human intervention
   - Background AI agents that monitor and act
   - Automated follow-ups and reminders
   - Self-healing processes that handle edge cases

### API Usage

- **Primary**: Claude API (Anthropic) - for complex reasoning, document analysis, agentic workflows
- **Secondary**: OpenAI API - for embeddings, specific use cases where needed
- Use streaming responses for real-time AI interactions
- Implement proper error handling and fallbacks

### Examples of AI-First Features

| Traditional | AI-First |
|------------|----------|
| Manual candidate screening | AI scores, ranks, and recommends candidates with explanations |
| User fills onboarding form | AI pre-fills based on offer letter, suggests missing info |
| Manual interview scheduling | AI finds optimal times, sends invites, handles rescheduling |
| Static job descriptions | AI generates JDs, optimizes for SEO and inclusivity |
| Manual employee queries | AI answers HR questions, escalates when needed |

### Implementation Pattern

```typescript
// Every feature should consider:
// 1. What can AI do automatically?
// 2. What should AI recommend?
// 3. Where can AI assist the user?
// 4. How can AI learn from this interaction?
```

---

## UI Guidelines for New Pages

**IMPORTANT: Do NOT add page titles (h1 headers with subtitles) to new pages.** The breadcrumb navigation provides sufficient context. Keep the UI clean and consistent with existing pages.

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
- **Claude API (Anthropic)** - primary AI for reasoning, agents, document analysis
- **OpenAI API** - embeddings, specific use cases
