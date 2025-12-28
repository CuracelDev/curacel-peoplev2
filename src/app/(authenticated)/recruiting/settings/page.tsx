'use client'

import { useState } from 'react'
import {
  Save,
  Heart,
  Star,
  Smile,
  Users,
  Lock,
  Settings,
  Plus,
  Eye,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const settingsNav = [
  { id: 'values', name: 'Company Values', icon: Heart },
  { id: 'competencies', name: 'Competencies', icon: Star },
  { id: 'personality', name: 'Personality Templates', icon: Smile },
  { id: 'team', name: 'Team Profiles', icon: Users },
  { id: 'integrations', name: 'Integrations', icon: Lock },
  { id: 'api', name: 'API & Keys', icon: Settings },
]

const pressValues = [
  { letter: 'P', name: 'Passionate Work', description: "We approach every challenge with enthusiasm and dedication. We don't just do our jobs - we care deeply about the impact of our work." },
  { letter: 'R', name: 'Relentless Growth', description: 'We continuously push ourselves to learn, improve, and expand our capabilities. Comfort zones are meant to be challenged.' },
  { letter: 'E', name: 'Empowered Action', description: "We take ownership and make decisions. We don't wait for permission to do what's right for our customers and colleagues." },
  { letter: 'S', name: 'Sense of Urgency', description: 'We move quickly and decisively. In insurance, timing matters - we treat every problem as if it needs solving today.' },
  { letter: 'S', name: 'Seeing Possibilities', description: 'We see opportunities where others see obstacles. We\'re building the future of insurance in Africa.' },
]

const competencies = [
  { name: 'Problem Solving', description: 'Ability to analyze complex problems, identify root causes, and develop effective solutions.', level: 'Required' },
  { name: 'Communication', description: 'Clear and effective written and verbal communication across all levels of the organization.', level: 'Required' },
  { name: 'Collaboration', description: 'Works effectively with cross-functional teams and builds strong working relationships.', level: 'Required' },
  { name: 'Adaptability', description: 'Thrives in ambiguous situations and adapts quickly to changing priorities.', level: 'Required' },
  { name: 'Ownership', description: 'Takes full responsibility for outcomes and follows through on commitments.', level: 'Required' },
  { name: 'Customer Focus', description: 'Prioritizes customer needs and consistently delivers value to end users.', level: 'Required' },
]

const integrations = [
  { name: 'Fireflies.ai', status: 'connected', statusText: 'Connected - Last sync 2 hours ago', color: 'bg-orange-500' },
  { name: 'Google Forms', status: 'connected', statusText: 'Connected - Webhook active', color: 'bg-blue-500' },
  { name: 'Kand.io', status: 'disconnected', statusText: 'Not connected', color: 'bg-gray-100' },
  { name: 'TestGorilla', status: 'disconnected', statusText: 'Not connected', color: 'bg-gray-100' },
  { name: 'Testify', status: 'disconnected', statusText: 'Not connected', color: 'bg-gray-100' },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('values')
  const [selectedDepartment, setSelectedDepartment] = useState('engineering')
  const [oceanProfile, setOceanProfile] = useState({
    openness: 75,
    conscientiousness: 85,
    extraversion: 50,
    agreeableness: 70,
    neuroticism: 30,
  })

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Configure company-wide hiring criteria and integrations</p>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-6">
        {/* Settings Navigation */}
        <Card className="h-fit sticky top-20">
          <CardContent className="p-3">
            {settingsNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
                  activeSection === item.id
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.name}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="space-y-6">
          {/* Company Values (PRESS) */}
          <Card id="values">
            <CardHeader className="p-5 border-b">
              <h2 className="text-lg font-semibold">Company Values (PRESS)</h2>
              <p className="text-sm text-gray-500">Define the core values that guide your hiring decisions. These are used by the AI to evaluate cultural fit.</p>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {pressValues.map((value, i) => (
                <div key={i} className="flex gap-4 p-4 border border-gray-200 rounded-xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg flex items-center justify-center text-2xl font-bold flex-shrink-0">
                    {value.letter}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{value.name}</div>
                    <Textarea
                      rows={2}
                      defaultValue={value.description}
                      className="mt-2"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Competency Framework */}
          <Card id="competencies">
            <CardHeader className="p-5 border-b">
              <h2 className="text-lg font-semibold">Competency Framework</h2>
              <p className="text-sm text-gray-500">Define the competencies expected of all hires at Curacel. Role-specific competencies are set per job.</p>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {competencies.map((competency, i) => (
                  <div key={i} className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold">{competency.name}</div>
                      <Badge variant="secondary">{competency.level}</Badge>
                    </div>
                    <div className="text-sm text-gray-600">{competency.description}</div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Competency
              </Button>
            </CardContent>
          </Card>

          {/* Personality Templates */}
          <Card id="personality">
            <CardHeader className="p-5 border-b">
              <h2 className="text-lg font-semibold">Personality Templates</h2>
              <p className="text-sm text-gray-500">Define ideal OCEAN personality profiles for different departments. Used for team fit analysis.</p>
            </CardHeader>
            <CardContent className="p-5">
              <div className="mb-4">
                <Label className="mb-2 block">Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-6">
                <Label className="mb-4 block">OCEAN Profile (Engineering)</Label>
                <div className="grid grid-cols-5 gap-3">
                  {Object.entries(oceanProfile).map(([key, value]) => (
                    <div key={key} className="text-center p-3 border border-gray-200 rounded-lg">
                      <div className="text-xs text-gray-500 mb-2 capitalize">{key}</div>
                      <div className="text-lg font-semibold mb-2">{value}%</div>
                      <Slider
                        value={[value]}
                        max={100}
                        step={1}
                        onValueChange={([v]) => setOceanProfile((prev) => ({ ...prev, [key]: v }))}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <Label className="mb-2 block">Preferred MBTI Types</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">INTJ</Badge>
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">INTP</Badge>
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">ENTJ</Badge>
                  <Badge variant="secondary">ENTP</Badge>
                  <Badge variant="secondary">ISTJ</Badge>
                  <Badge variant="secondary">ISTP</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card id="integrations">
            <CardHeader className="p-5 border-b">
              <h2 className="text-lg font-semibold">Integrations</h2>
              <p className="text-sm text-gray-500">Connect external services to automate data collection and analysis.</p>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {integrations.map((integration, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center text-white', integration.color)}>
                    <ExternalLink className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{integration.name}</div>
                    <div className={cn(
                      'text-sm',
                      integration.status === 'connected' ? 'text-green-600' : 'text-gray-500'
                    )}>
                      {integration.statusText}
                    </div>
                  </div>
                  <Button
                    variant={integration.status === 'connected' ? 'outline' : 'default'}
                    size="sm"
                  >
                    {integration.status === 'connected' ? 'Configure' : 'Connect'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* API & Keys */}
          <Card id="api">
            <CardHeader className="p-5 border-b">
              <h2 className="text-lg font-semibold">API & Keys</h2>
              <p className="text-sm text-gray-500">Manage API keys for AI services and external integrations.</p>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <Label className="mb-2 block">Anthropic API Key (Claude)</Label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg font-mono text-sm">
                  <span className="flex-1 text-gray-600">sk-ant-api03-****************************</span>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Show
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Fireflies API Key</Label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg font-mono text-sm">
                  <span className="flex-1 text-gray-600">ff-****************************</span>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Show
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>

              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add New Key
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
