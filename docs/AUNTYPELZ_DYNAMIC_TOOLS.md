# AuntyPelz Dynamic AI Tools

This system allows you to create custom AI tools for AuntyPelz without modifying code. Tools are defined in the database and can be added, updated, or removed dynamically.

## Overview

The Dynamic AI Tools system consists of:

1. **Database Model** (`AICustomTool`) - Stores tool definitions
2. **Tool Registry** - Loads and manages tools
3. **Tool Executor** - Executes tools based on their configuration
4. **tRPC API** - Provides CRUD operations for tools
5. **OpenAI Integration** - Automatically registers tools for function calling

## Tool Structure

Each custom tool has:

- **name**: Unique function name (e.g., `archive_candidate`)
- **displayName**: Human-readable name shown to users
- **description**: What the tool does (shown to AI)
- **category**: Grouping (e.g., "hiring", "contracts", "employees")
- **parameters**: JSON Schema defining function parameters
- **executionType**: How the tool runs (`trpc_mutation`, `trpc_query`, `webhook`, `custom_code`)
- **executionConfig**: Configuration for execution
- **requiresConfirmation**: Whether user confirmation is needed
- **allowedRoles**: Array of roles that can use this tool

## Execution Types

### 1. tRPC Mutation/Query

Execute an existing tRPC procedure.

**Example Config:**
```json
{
  "router": "job",
  "procedure": "archive",
  "inputMapping": {
    "id": "candidateId"
  }
}
```

**Parameters Schema:**
```json
{
  "type": "object",
  "properties": {
    "candidateId": {
      "type": "string",
      "description": "ID of the candidate to archive"
    },
    "reason": {
      "type": "string",
      "description": "Reason for archiving"
    }
  },
  "required": ["candidateId"]
}
```

### 2. Webhook

Call an external webhook.

**Example Config:**
```json
{
  "url": "https://api.example.com/archive-candidate",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN",
    "X-Custom-Header": "value"
  }
}
```

**Parameters Schema:**
```json
{
  "type": "object",
  "properties": {
    "candidateId": {
      "type": "string",
      "description": "ID of the candidate"
    },
    "notify": {
      "type": "boolean",
      "description": "Whether to send notification"
    }
  },
  "required": ["candidateId"]
}
```

### 3. Custom Code

Execute custom JavaScript (use with caution).

**Example Config:**
```json
{
  "code": "const candidate = await prisma.jobCandidate.findUnique({ where: { id: args.candidateId } }); await prisma.jobCandidate.update({ where: { id: args.candidateId }, data: { stage: 'ARCHIVED', archivedReason: args.reason } }); return { success: true, candidateName: candidate.name };"
}
```

**Parameters Schema:**
```json
{
  "type": "object",
  "properties": {
    "candidateId": {
      "type": "string",
      "description": "ID of the candidate to archive"
    },
    "reason": {
      "type": "string",
      "description": "Reason for archiving"
    }
  },
  "required": ["candidateId", "reason"]
}
```

## API Usage

### Create a Custom Tool

```typescript
const tool = await trpc.aiCustomTools.create.mutate({
  name: 'archive_candidate',
  displayName: 'Archive Candidate',
  description: 'Archive a candidate from the hiring pipeline with a reason',
  category: 'hiring',
  parameters: {
    type: 'object',
    properties: {
      candidateId: {
        type: 'string',
        description: 'ID of the candidate to archive'
      },
      reason: {
        type: 'string',
        description: 'Reason for archiving'
      }
    },
    required: ['candidateId', 'reason']
  },
  executionType: 'trpc_mutation',
  executionConfig: {
    router: 'job',
    procedure: 'archiveCandidate',
    inputMapping: {
      id: 'candidateId',
      reason: 'reason'
    }
  },
  requiresConfirmation: true,
  allowedRoles: ['ADMIN', 'HR_ADMIN']
})
```

### List All Tools

```typescript
const tools = await trpc.aiCustomTools.list.query({
  category: 'hiring', // optional
  isActive: true // optional
})
```

### Update a Tool

```typescript
await trpc.aiCustomTools.update.mutate({
  id: 'tool-id',
  description: 'Updated description',
  isActive: false
})
```

### Delete a Tool

```typescript
await trpc.aiCustomTools.delete.mutate({
  id: 'tool-id'
})
```

### Test a Tool

```typescript
const result = await trpc.aiCustomTools.test.mutate({
  id: 'tool-id',
  args: {
    candidateId: 'candidate-123',
    reason: 'Position filled'
  }
})
```

## How It Works

1. **Tool Registration**: When AuntyPelz starts, it loads all active tools from the database
2. **OpenAI Function Calling**: Tools are automatically registered with OpenAI as available functions
3. **AI Decision**: When a user asks AuntyPelz to perform an action, the AI decides which tool to use
4. **Tool Execution**: The Tool Executor runs the tool based on its configuration
5. **Response**: Results are returned to the AI, which formats them for the user

## Security Considerations

- **Permissions**: Always set `allowedRoles` to limit who can use sensitive tools
- **Confirmation**: Set `requiresConfirmation: true` for destructive actions
- **Custom Code**: Be extremely careful with custom code execution - it has full database access
- **Webhooks**: Validate webhook URLs and use authentication headers
- **Input Validation**: The AI validates inputs against the parameters schema

## Best Practices

1. **Clear Descriptions**: Write detailed descriptions for the AI to understand when to use the tool
2. **Required Parameters**: Mark essential parameters as required
3. **Error Handling**: Tools should return clear error messages
4. **Testing**: Always test new tools before enabling them
5. **Categories**: Use consistent categories for organization
6. **Built-in Flag**: Never set `isBuiltIn: true` for custom tools (reserved for system tools)

## Example: Creating an Archive Candidate Tool

```typescript
// 1. Create the tool
const archiveTool = await trpc.aiCustomTools.create.mutate({
  name: 'archive_candidate',
  displayName: 'Archive Candidate',
  description: 'Move a candidate to the archived stage in the hiring pipeline. Use this when a candidate is no longer being considered for a position. Requires a reason for archiving.',
  category: 'hiring',
  parameters: {
    type: 'object',
    properties: {
      candidateId: {
        type: 'string',
        description: 'The unique ID of the candidate to archive'
      },
      reason: {
        type: 'string',
        description: 'The reason for archiving (e.g., "Position filled", "Withdrew application", "Not a good fit")'
      },
      notifyCandidate: {
        type: 'boolean',
        description: 'Whether to send an email notification to the candidate'
      }
    },
    required: ['candidateId', 'reason']
  },
  executionType: 'trpc_mutation',
  executionConfig: {
    router: 'job',
    procedure: 'updateCandidateStage',
    inputMapping: {
      candidateId: 'candidateId',
      stage: 'ARCHIVED',
      reason: 'reason',
      notify: 'notifyCandidate'
    }
  },
  requiresConfirmation: true,
  allowedRoles: ['ADMIN', 'HR_ADMIN']
})

// 2. The tool is now available to AuntyPelz!
// Users can say: "Archive candidate John Doe because the position was filled"
// AuntyPelz will automatically call this tool with the appropriate parameters
```

## Roadmap

Future enhancements:
- UI for creating and managing tools (Settings > AuntyPelz > Custom Tools)
- Tool analytics and usage tracking
- Tool versioning
- Tool marketplace/templates
- Better sandboxing for custom code execution
- Tool chaining (one tool calling another)
