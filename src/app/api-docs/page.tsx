import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://your-domain.com'

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Curacel People API</h1>
          <p className="text-sm text-gray-600">
            Public documentation for integrating with Curacel People. Version 1.0
          </p>
          <p className="text-xs text-gray-500">
            Last updated: December 2024
          </p>
        </div>

        {/* Table of Contents */}
        <Card>
          <CardHeader>
            <CardTitle>Contents</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
            <a href="#base-url" className="text-blue-600 hover:underline">Base URL</a>
            <a href="#authentication" className="text-blue-600 hover:underline">Authentication</a>
            <a href="#employees" className="text-blue-600 hover:underline">Employees</a>
            <a href="#contracts" className="text-blue-600 hover:underline">Contracts (Offers)</a>
            <a href="#onboarding" className="text-blue-600 hover:underline">Onboarding</a>
            <a href="#offboarding" className="text-blue-600 hover:underline">Offboarding</a>
            <a href="#recruiting" className="text-blue-600 hover:underline">Recruiting (Beta)</a>
            <a href="#applications" className="text-blue-600 hover:underline">Applications</a>
            <a href="#webhooks" className="text-blue-600 hover:underline">Webhooks</a>
            <a href="#errors" className="text-blue-600 hover:underline">Error Handling</a>
            <a href="#rate-limits" className="text-blue-600 hover:underline">Rate Limits</a>
          </CardContent>
        </Card>

        <section id="base-url">
          <Card>
            <CardHeader>
              <CardTitle>Base URL</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="rounded bg-gray-100 px-2 py-1 text-sm">{BASE_URL}</code>
              <p className="mt-2 text-sm text-gray-600">
                All API endpoints are relative to this base URL. Use HTTPS in production.
              </p>
            </CardContent>
          </Card>
        </section>

        <section id="authentication">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Secure your API requests with an API key</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <p>Create an API key from <strong>Settings → API Settings</strong> in the application.</p>
              <p>Include the key in the Authorization header:</p>
              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`Authorization: Bearer <api_key>`}</pre>
              </div>
              <p>Or use the custom header:</p>
              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`x-api-key: <api_key>`}</pre>
              </div>
              <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <strong>Security:</strong> Store API keys securely. Never expose them in client-side code or public repositories.
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>Manage employee records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/employees</code>
                  <span className="text-gray-500">— list employees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600">POST</Badge>
                  <code>/api/v1/employees</code>
                  <span className="text-gray-500">— create employee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/employees/:id</code>
                  <span className="text-gray-500">— fetch employee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-600">PATCH</Badge>
                  <code>/api/v1/employees/:id</code>
                  <span className="text-gray-500">— update employee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600">DELETE</Badge>
                  <code>/api/v1/employees/:id</code>
                  <span className="text-gray-500">— delete employee</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Query Parameters (GET /employees)</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>limit</code> — number of results (default: 20, max: 100)</li>
                  <li><code>page</code> — page number for pagination</li>
                  <li><code>status</code> — filter by status (CANDIDATE, ACTIVE, OFFBOARDING, EXITED)</li>
                  <li><code>department</code> — filter by department</li>
                  <li><code>search</code> — search by name or email</li>
                </ul>
              </div>

              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`curl -H "Authorization: Bearer <api_key>" \\
  "${BASE_URL}/api/v1/employees?limit=10&status=ACTIVE"`}</pre>
              </div>
              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`{
  "employees": [
    {
      "id": "emp_123",
      "fullName": "Ada Lovelace",
      "personalEmail": "ada@example.com",
      "workEmail": "ada@company.com",
      "status": "ACTIVE",
      "jobTitle": "Engineer",
      "department": "Engineering",
      "startDate": "2024-01-15",
      "lifeValues": { "Career Growth": 5, "Work-Life Balance": 4 },
      "personalityCompleted": true
    }
  ],
  "total": 1,
  "pages": 1
}`}</pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Create Employee Request</h4>
              </div>
              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`curl -X POST -H "Authorization: Bearer <api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fullName": "Ada Lovelace",
    "personalEmail": "ada@example.com",
    "jobTitle": "Engineer",
    "department": "Engineering",
    "startDate": "2024-01-15"
  }' \\
  ${BASE_URL}/api/v1/employees`}</pre>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="contracts">
          <Card>
            <CardHeader>
              <CardTitle>Contracts (Offers)</CardTitle>
              <CardDescription>Create and manage employment contracts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/contracts</code>
                  <span className="text-gray-500">— list contracts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600">POST</Badge>
                  <code>/api/v1/contracts</code>
                  <span className="text-gray-500">— create contract</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/contracts/:id</code>
                  <span className="text-gray-500">— fetch contract</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-600">PATCH</Badge>
                  <code>/api/v1/contracts/:id</code>
                  <span className="text-gray-500">— update contract</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600">POST</Badge>
                  <code>/api/v1/contracts/:id/send</code>
                  <span className="text-gray-500">— send for signature</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600">DELETE</Badge>
                  <code>/api/v1/contracts/:id</code>
                  <span className="text-gray-500">— delete contract</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Contract Statuses</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>DRAFT</code> — created but not sent</li>
                  <li><code>SENT</code> — sent to candidate for signature</li>
                  <li><code>VIEWED</code> — opened by candidate</li>
                  <li><code>SIGNED</code> — signed by candidate</li>
                  <li><code>DECLINED</code> — declined by candidate</li>
                  <li><code>EXPIRED</code> — past expiration date</li>
                  <li><code>CANCELLED</code> — cancelled by employer</li>
                </ul>
              </div>

              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`curl -X POST -H "Authorization: Bearer <api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "employeeId": "emp_123",
    "templateType": "FULL_TIME",
    "jobTitle": "Engineer",
    "startDate": "2024-02-01",
    "salaryAmount": 100000,
    "salaryCurrency": "USD",
    "salaryFrequency": "ANNUAL"
  }' \\
  ${BASE_URL}/api/v1/contracts`}</pre>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding</CardTitle>
              <CardDescription>Manage onboarding workflows for new hires</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/onboarding</code>
                  <span className="text-gray-500">— list workflows</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600">POST</Badge>
                  <code>/api/v1/onboarding</code>
                  <span className="text-gray-500">— start onboarding</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/onboarding/:id</code>
                  <span className="text-gray-500">— fetch workflow</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-600">PATCH</Badge>
                  <code>/api/v1/onboarding/:id</code>
                  <span className="text-gray-500">— update workflow</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600">POST</Badge>
                  <code>/api/v1/onboarding/:id/tasks/:taskId/complete</code>
                  <span className="text-gray-500">— complete task</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Workflow Statuses</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>NOT_STARTED</code> — workflow created, not begun</li>
                  <li><code>IN_PROGRESS</code> — tasks being completed</li>
                  <li><code>COMPLETED</code> — all tasks finished</li>
                  <li><code>CANCELLED</code> — workflow cancelled</li>
                </ul>
              </div>

              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`curl -X POST -H "Authorization: Bearer <api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "employeeId": "emp_123",
    "startDate": "2024-02-01",
    "emailProvider": "GOOGLE_WORKSPACE",
    "workEmail": "ada@company.com"
  }' \\
  ${BASE_URL}/api/v1/onboarding`}</pre>
              </div>

              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`{
  "id": "onb_123",
  "status": "IN_PROGRESS",
  "employeeId": "emp_123",
  "accessToken": "token_for_self_service",
  "tasks": [
    { "id": "task_1", "name": "Complete profile", "status": "PENDING" },
    { "id": "task_2", "name": "Create Google account", "status": "PENDING" }
  ]
}`}</pre>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="offboarding">
          <Card>
            <CardHeader>
              <CardTitle>Offboarding</CardTitle>
              <CardDescription>Manage employee departure workflows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/offboarding</code>
                  <span className="text-gray-500">— list workflows</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600">POST</Badge>
                  <code>/api/v1/offboarding</code>
                  <span className="text-gray-500">— start offboarding</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/offboarding/:id</code>
                  <span className="text-gray-500">— fetch workflow</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-600">PATCH</Badge>
                  <code>/api/v1/offboarding/:id</code>
                  <span className="text-gray-500">— update workflow</span>
                </div>
              </div>

              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`curl -X POST -H "Authorization: Bearer <api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "employeeId": "emp_123",
    "isImmediate": false,
    "endDate": "2024-03-15",
    "reason": "Resignation",
    "googleDeleteAccount": true,
    "googleTransferToEmail": "manager@company.com"
  }' \\
  ${BASE_URL}/api/v1/offboarding`}</pre>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="recruiting">
          <Card>
            <CardHeader>
              <CardTitle>Recruiting (Beta)</CardTitle>
              <CardDescription>Hiring flows and recruiting configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <p>
                Recruiting configuration is currently managed in the app under
                <strong> Recruiting → Settings → Interview</strong>. Public API endpoints for
                hiring flows will be documented here once available.
              </p>
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <strong>Status:</strong> API access is not yet available for hiring flows.
              </div>
              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`{
  "id": "engineering",
  "name": "Engineering",
  "description": "Includes technical assessment",
  "stages": ["Apply", "HR", "Kand.io", "Technical", "Panel"],
  "hiresCount": 2
}`}</pre>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="applications">
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
              <CardDescription>Manage connected applications and integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/applications</code>
                  <span className="text-gray-500">— list applications</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/applications/:id</code>
                  <span className="text-gray-500">— fetch application</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600">POST</Badge>
                  <code>/api/v1/applications/:id/test</code>
                  <span className="text-gray-500">— test connection</span>
                </div>
              </div>

              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`{
  "applications": [
    {
      "id": "app_123",
      "name": "Google Workspace",
      "type": "GOOGLE_WORKSPACE",
      "enabled": true,
      "connectionStatus": "CONNECTED",
      "lastTestedAt": "2024-01-10T10:00:00Z"
    },
    {
      "id": "app_456",
      "name": "Slack",
      "type": "SLACK",
      "enabled": true,
      "connectionStatus": "CONNECTED"
    }
  ]
}`}</pre>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>Receive real-time notifications about events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <p>Configure webhooks to receive notifications when events occur in the system.</p>

              <div className="space-y-2">
                <h4 className="font-semibold">Available Events</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>employee.created</code> — new employee added</li>
                  <li><code>employee.updated</code> — employee record changed</li>
                  <li><code>contract.sent</code> — contract sent for signature</li>
                  <li><code>contract.signed</code> — contract signed by candidate</li>
                  <li><code>onboarding.started</code> — onboarding workflow begun</li>
                  <li><code>onboarding.completed</code> — all tasks finished</li>
                  <li><code>offboarding.started</code> — offboarding workflow begun</li>
                  <li><code>offboarding.completed</code> — employee exited</li>
                </ul>
              </div>

              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`// Webhook payload example
{
  "event": "contract.signed",
  "timestamp": "2024-01-15T14:30:00Z",
  "data": {
    "contractId": "contract_123",
    "employeeId": "emp_123",
    "employeeName": "Ada Lovelace",
    "signedAt": "2024-01-15T14:30:00Z"
  }
}`}</pre>
              </div>

              <div className="rounded border border-blue-200 bg-blue-50 p-3 text-blue-800">
                <strong>Note:</strong> Webhook configuration is available in Settings → Notifications.
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Handling</CardTitle>
              <CardDescription>Understanding API error responses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <p>All errors return a JSON response with an error code and message.</p>

              <div className="space-y-2">
                <h4 className="font-semibold">HTTP Status Codes</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>200</code> — Success</li>
                  <li><code>201</code> — Created</li>
                  <li><code>400</code> — Bad Request (invalid input)</li>
                  <li><code>401</code> — Unauthorized (invalid or missing API key)</li>
                  <li><code>403</code> — Forbidden (insufficient permissions)</li>
                  <li><code>404</code> — Not Found</li>
                  <li><code>429</code> — Too Many Requests (rate limited)</li>
                  <li><code>500</code> — Internal Server Error</li>
                </ul>
              </div>

              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "personalEmail is required",
    "field": "personalEmail"
  }
}`}</pre>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="rate-limits">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
              <CardDescription>API usage limits and best practices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Default limit: <strong>100 requests per minute</strong> per API key</li>
                <li>Bulk operations: <strong>10 requests per minute</strong></li>
                <li>Rate limit headers are included in all responses</li>
              </ul>

              <div className="space-y-2">
                <h4 className="font-semibold">Rate Limit Headers</h4>
              </div>
              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705320000`}</pre>
              </div>

              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <strong>Tip:</strong> Implement exponential backoff when you receive a 429 response.
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700">
            <p>For API support, contact your administrator or check the in-app documentation at Settings → Documentation.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
