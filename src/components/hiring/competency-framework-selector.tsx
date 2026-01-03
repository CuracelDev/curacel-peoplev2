'use client'

import { useState, useMemo, useEffect } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, X, Info, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface CompetencyRequirement {
  subCompetencyId: string
  requiredLevel: number
  requiredLevelName: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  isRequired: boolean
}

interface CompetencyFrameworkSelectorProps {
  department: string | null
  value: CompetencyRequirement[]
  onChange: (value: CompetencyRequirement[]) => void
}

export function CompetencyFrameworkSelector({
  department,
  value,
  onChange,
}: CompetencyFrameworkSelectorProps) {
  const [search, setSearch] = useState('')
  const [activeFramework, setActiveFramework] = useState<'DEPARTMENT' | 'AI' | 'VALUES'>(
    'DEPARTMENT'
  )
  const [expandedCores, setExpandedCores] = useState<Set<string>>(new Set())
  const [initialExpanded, setInitialExpanded] = useState(false)

  const getDepartmentLabel = (value: string | null) => {
    if (!value) return ''
    if (value === 'Sales') return 'Commercial'
    return value
  }

  const getDepartmentQueryValue = (value: string | null) => {
    if (!value) return undefined
    if (value === 'Commercial') return 'Sales'
    return value
  }

  // Fetch frameworks
  const { data: departmentData } = trpc.competencyFramework.getByType.useQuery(
    { type: 'DEPARTMENT', department: getDepartmentQueryValue(department) },
    { enabled: !!department }
  )

  const { data: aiData } = trpc.competencyFramework.getByType.useQuery({ type: 'AI' })
  const { data: valuesData } = trpc.competencyFramework.getByType.useQuery({ type: 'VALUES' })

  // Get active framework source
  const activeSource =
    activeFramework === 'DEPARTMENT'
      ? departmentData?.[0]
      : activeFramework === 'AI'
        ? aiData?.[0]
        : valuesData?.[0]

  // Filter competencies
  const filteredCores = useMemo(() => {
    if (!activeSource?.coreCompetencies) return []
    const query = search.toLowerCase()
    if (!query) return activeSource.coreCompetencies

    return activeSource.coreCompetencies
      .map((core) => ({
        ...core,
        subCompetencies: core.subCompetencies.filter(
          (sub: any) =>
            sub.name.toLowerCase().includes(query) || core.name.toLowerCase().includes(query)
        ),
      }))
      .filter((core) => core.subCompetencies.length > 0)
  }, [activeSource, search])

  // Auto-expand all cores on initial load or framework change
  useEffect(() => {
    if (filteredCores.length > 0 && !initialExpanded) {
      const allCoreIds = new Set(filteredCores.map((core: any) => core.id))
      setExpandedCores(allCoreIds)
      setInitialExpanded(true)
    }
  }, [filteredCores, initialExpanded])

  // Reset expansion state when changing frameworks
  useEffect(() => {
    setInitialExpanded(false)
  }, [activeFramework])

  const isSelected = (subCompetencyId: string) =>
    value.some((req) => req.subCompetencyId === subCompetencyId)

  const getRequirement = (subCompetencyId: string) =>
    value.find((req) => req.subCompetencyId === subCompetencyId)

  const toggleCompetency = (subCompetency: any) => {
    const existing = value.find((req) => req.subCompetencyId === subCompetency.id)

    if (existing) {
      onChange(value.filter((req) => req.subCompetencyId !== subCompetency.id))
    } else {
      const levelNames = (activeSource?.levelNames as string[]) || []
      const defaultLevel = Math.ceil(levelNames.length / 2)

      onChange([
        ...value,
        {
          subCompetencyId: subCompetency.id,
          requiredLevel: defaultLevel,
          requiredLevelName: levelNames[defaultLevel - 1] || 'Intermediate',
          priority: 'MEDIUM',
          isRequired: true,
        },
      ])
    }
  }

  const updateRequirement = (subCompetencyId: string, updates: Partial<CompetencyRequirement>) => {
    onChange(
      value.map((req) => (req.subCompetencyId === subCompetencyId ? { ...req, ...updates } : req))
    )
  }

  const toggleCore = (coreId: string) => {
    const newExpanded = new Set(expandedCores)
    if (newExpanded.has(coreId)) {
      newExpanded.delete(coreId)
    } else {
      newExpanded.add(coreId)
    }
    setExpandedCores(newExpanded)
  }

  if (!department) {
    return (
      <div className="text-center py-12 space-y-4">
        <Info className="h-16 w-16 text-indigo-400 mx-auto" />
        <div>
          <div className="text-lg font-semibold text-foreground mb-2">
            Select a Team/Department First
          </div>
          <div className="text-sm text-muted-foreground max-w-md mx-auto">
            Department competencies will appear once you select a team or department in the{' '}
            <span className="font-medium text-indigo-600">Basic Information</span> section above.
            <br /><br />
            You can also select from AI and Values competencies (which don't require a department).
          </div>
        </div>
      </div>
    )
  }

  const levelNames = (activeSource?.levelNames as string[]) || []

  return (
    <div className="space-y-4">
      {/* Department indicator for DEPARTMENT framework */}
      {activeFramework === 'DEPARTMENT' && department && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
            Department Competencies For
          </div>
          <div className="text-sm font-semibold text-indigo-900">{getDepartmentLabel(department)}</div>
        </div>
      )}

      {/* Selected summary */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Requirements ({value.length})</Label>
          <div className="flex flex-wrap gap-2">
            {value.map((req) => {
              // Search across all framework sources, not just the active one
              const subComp = [
                ...(departmentData?.[0]?.coreCompetencies || []),
                ...(aiData?.[0]?.coreCompetencies || []),
                ...(valuesData?.[0]?.coreCompetencies || [])
              ]
                .flatMap((c: any) => c.subCompetencies)
                .find((s: any) => s.id === req.subCompetencyId)

              return (
                <Badge key={req.subCompetencyId} variant="secondary" className="gap-2 py-1.5 px-3">
                  <span>{subComp?.name || 'Unknown'}</span>
                  <span className="text-xs opacity-70">@ {req.requiredLevelName}</span>
                  <button
                    onClick={() => onChange(value.filter((r) => r.subCompetencyId !== req.subCompetencyId))}
                    className="hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Framework tabs */}
      <div className="flex gap-2 border-b">
        {['DEPARTMENT', 'AI', 'VALUES'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveFramework(type as any)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeFramework === type
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {type === 'DEPARTMENT' ? 'Department' : type === 'AI' ? 'AI' : 'Values'}
          </button>
        ))}
      </div>

      {/* Search and expand controls */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search competencies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (expandedCores.size === filteredCores.length) {
              setExpandedCores(new Set())
            } else {
              setExpandedCores(new Set(filteredCores.map((core: any) => core.id)))
            }
          }}
        >
          {expandedCores.size === filteredCores.length ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      {/* Competency tree */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {filteredCores.map((core: any) => (
          <Collapsible
            key={core.id}
            open={expandedCores.has(core.id)}
            onOpenChange={() => toggleCore(core.id)}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-start justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5">
                    {expandedCores.has(core.id) ? (
                      <ChevronDown className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-base">{core.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {core.subCompetencies.length} sub-competencies
                      </Badge>
                    </div>
                    {core.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {core.description}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="ml-2 flex-shrink-0">
                  {value.filter((req) =>
                    core.subCompetencies.some((sub: any) => sub.id === req.subCompetencyId)
                  ).length}{' '}
                  selected
                </Badge>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-2 space-y-2">
              {core.subCompetencies.map((sub: any) => {
                const requirement = getRequirement(sub.id)
                const selected = isSelected(sub.id)

                return (
                  <div
                    key={sub.id}
                    className={cn(
                      'ml-6 p-3 border rounded-lg transition-all',
                      selected
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-border hover:border-indigo-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleCompetency(sub)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <div className="font-medium text-sm">{sub.name}</div>
                          {sub.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {sub.description}
                            </div>
                          )}
                        </div>

                        {selected && requirement && (
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                            <div className="space-y-1">
                              <Label className="text-xs">Required Level</Label>
                              <Select
                                value={requirement.requiredLevel.toString()}
                                onValueChange={(v) => {
                                  const level = parseInt(v)
                                  updateRequirement(sub.id, {
                                    requiredLevel: level,
                                    requiredLevelName: levelNames[level - 1] || 'Unknown',
                                  })
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {levelNames.map((name, index) => (
                                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                                      {name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Priority</Label>
                              <Select
                                value={requirement.priority}
                                onValueChange={(v: any) => updateRequirement(sub.id, { priority: v })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CRITICAL">Critical</SelectItem>
                                  <SelectItem value="HIGH">High</SelectItem>
                                  <SelectItem value="MEDIUM">Medium</SelectItem>
                                  <SelectItem value="LOW">Low</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Required?</Label>
                              <div className="flex items-center h-8">
                                <Checkbox
                                  checked={requirement.isRequired}
                                  onCheckedChange={(checked) =>
                                    updateRequirement(sub.id, { isRequired: !!checked })
                                  }
                                />
                                <span className="ml-2 text-xs">
                                  {requirement.isRequired ? 'Must have' : 'Nice to have'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {filteredCores.length === 0 && (
        <div className="text-center py-12">
          {search ? (
            <div className="text-muted-foreground">
              No competencies found matching "{search}"
            </div>
          ) : activeFramework === 'DEPARTMENT' && !activeSource ? (
            <div className="space-y-3">
              <Info className="h-12 w-12 text-indigo-400 mx-auto" />
              <div className="text-foreground font-medium">No Department Competencies Found</div>
              <div className="text-sm text-muted-foreground max-w-md mx-auto">
                Department-specific competencies haven't been configured for "{department}".
                <br />
                You can still select from AI and Values competencies.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Info className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="text-muted-foreground">No {activeFramework.toLowerCase()} competencies available</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
