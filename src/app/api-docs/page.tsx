import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://your-domain.com'

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-muted/50 py-10 px-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Curacel People API</h1>
          <p className="text-sm text-foreground/80">
            Public documentation for integrating with Curacel People. Version 1.0
          </p>
          <p className="text-xs text-muted-foreground">
            Last updated: December 30, 2024
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
              <code className="rounded bg-muted px-2 py-1 text-sm">{BASE_URL}</code>
              <p className="mt-2 text-sm text-foreground/80">
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
            <CardContent className="space-y-3 text-sm text-foreground">
              <p>Create an API key from <strong>Settings → API Settings</strong> in the application.</p>
              <p>Include the key in the Authorization header:</p>
              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`Authorization: Bearer <api_key>`}</pre>
              </div>
              <p>Or use the custom header:</p>
              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`x-api-key: <api_key>`}</pre>
              </div>
              <div className="mt-4 rounded border border-warning/20 bg-warning/10 p-3 text-warning-foreground">
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
            <CardContent className="space-y-4 text-sm text-foreground">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/employees</code>
                  <span className="text-muted-foreground">— list employees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-success">POST</Badge>
                  <code>/api/v1/employees</code>
                  <span className="text-muted-foreground">— create employee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  <code>/api/v1/employees/:id</code>
                  <span className="text-muted-foreground">— fetch employee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-600">PATCH</Badge>
                  <code>/api/v1/employees/:id</code>
                  <span className="text-muted-foreground">— update employee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600">DELETE</Badge>
                  <code>/api/v1/employees/:id</code>
                  <span className="text-muted-foreground">— delete employee</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Query Parameters (GET /employees)</h4>
                <ul className="list-disc list-inside text-foreground/80 space-y-1">
                  <li><code>limit</code> — number of results (default: 20, max: 100)</li>
                  <li><code>page</code> — page number for pagination</li>
                  <li><code>status</code> — filter by status (CANDIDATE, ACTIVE, OFFBOARDING, EXITED)</li>
                  <li><code>department</code> — filter by department</li>
                  <li><code>search</code> — search by name or email</li>
                </ul>
              </div>

              <div className="rounded bg-gray-900 p-3 text-xs text-gray-100">
                <pre>{`curl -H "Authorization: Bearer <api_key>" \\
  "\${BASE_URL}/api/v1/employees?limit=10&status=ACTIVE"`}</pre>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
