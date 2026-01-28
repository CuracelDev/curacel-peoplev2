'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { trpc } from '@/lib/trpc-client'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export default function CompetencyFrameworkDetailPage() {
  const params = useParams()
  const sourceId = params.id as string

  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<string>>(new Set())

  // Fetch detailed data for the source
  const { data: sourceData, isLoading } = trpc.competencyFramework.getSource.useQuery(
    { id: sourceId },
    { enabled: !!sourceId }
  )

  const toggleCompetency = (id: string) => {
    const newExpanded = new Set(expandedCompetencies)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCompetencies(newExpanded)
  }

  const expandAll = () => {
    if (!sourceData) return
    const allIds = new Set(sourceData.coreCompetencies.map(c => c.id))
    setExpandedCompetencies(allIds)
  }

  const collapseAll = () => {
    setExpandedCompetencies(new Set())
  }

  const getFormatTypeLabel = (formatType: string) => {
    switch (formatType) {
      case 'STANDARD_4_LEVEL':
        return '4 Levels'
      case 'EXTENDED_5_LEVEL':
        return '5 Levels'
      case 'AI_BEHAVIORAL':
        return 'AI Behavioral'
      default:
        return formatType
    }
  }

  const getDepartmentLabel = (department?: string | null) => {
    if (!department) return ''
    if (department === 'Sales') return 'Commercial'
    return department
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SettingsPageHeader
          title="Loading..."
          description="Fetching competency framework data"
          backHref="/hiring/settings/competency-framework"
        />
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading competency data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sourceData) {
    return (
      <div className="space-y-6">
        <SettingsPageHeader
          title="Not Found"
          description="Competency framework source not found"
          backHref="/hiring/settings/competency-framework"
        />
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Framework source not found or has been deleted.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title={sourceData.name}
        description={`${sourceData.coreCompetencies.length} core competencies`}
        backHref="/hiring/settings/competency-framework"
      />

      {/* Framework Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{sourceData.type}</Badge>
                {sourceData.department && (
                  <Badge variant="secondary">{getDepartmentLabel(sourceData.department)}</Badge>
                )}
                {sourceData.formatType && (
                  <Badge variant="secondary">{getFormatTypeLabel(sourceData.formatType)}</Badge>
                )}
              </div>
              {sourceData.levelNames && (sourceData.levelNames as string[]).length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Levels: {(sourceData.levelNames as string[]).join(' → ')}
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(sourceData.sheetUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Sheet
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {sourceData.coreCompetencies.length} core competencies with {' '}
          {sourceData.coreCompetencies.reduce((sum, c) => sum + c.subCompetencies.length, 0)} sub-competencies
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={expandAll}
          >
            Expand All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={collapseAll}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Core Competencies */}
      {sourceData.coreCompetencies.length > 0 ? (
        <div className="space-y-4">
          {sourceData.coreCompetencies.map((coreComp) => (
            <Card key={coreComp.id}>
              <Collapsible
                open={expandedCompetencies.has(coreComp.id)}
                onOpenChange={() => toggleCompetency(coreComp.id)}
              >
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-start justify-between">
                      <div className="text-left">
                        <CardTitle className="text-base flex items-center gap-2">
                          {expandedCompetencies.has(coreComp.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {coreComp.name}
                        </CardTitle>
                        {coreComp.description && (
                          <CardDescription className="text-xs mt-1 ml-6">
                            {coreComp.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {coreComp.subCompetencies.length} sub-competencies
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {coreComp.subCompetencies.map((subComp) => (
                      <div key={subComp.id} className="border-l-2 border-primary/20 pl-4 py-2">
                        <h4 className="font-medium text-sm mb-2">{subComp.name}</h4>
                        {subComp.description && (
                          <p className="text-xs text-muted-foreground mb-3">
                            {subComp.description}
                          </p>
                        )}

                        {/* Level Descriptions */}
                        {subComp.levelDescriptions && typeof subComp.levelDescriptions === 'object' && (
                          <div className="space-y-2">
                            {Object.entries(subComp.levelDescriptions as Record<string, string>)
                              .sort(([a], [b]) => parseInt(a) - parseInt(b))
                              .map(([level, description]) => {
                                const levelIndex = parseInt(level) - (sourceData.minLevel || 1)
                                const levelName = (sourceData.levelNames as string[])[levelIndex] || `Level ${level}`
                                return (
                                  <div key={level} className="text-xs bg-muted/50 p-3 rounded-md">
                                    <span className="font-medium text-primary">
                                      {levelName} (Level {level}):
                                    </span>{' '}
                                    <span className="text-foreground">{description}</span>
                                  </div>
                                )
                              })}
                          </div>
                        )}

                        {/* Behavioral Indicators */}
                        {subComp.hasBehavioralIndicators && subComp.behavioralIndicators && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium">Behavioral Indicators:</p>
                            {Object.entries(subComp.behavioralIndicators as Record<string, string[]>)
                              .sort(([a], [b]) => parseInt(a) - parseInt(b))
                              .map(([level, indicators]) => (
                                <div key={level} className="text-xs bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                                  <span className="font-medium">Level {level}:</span>
                                  <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                                    {indicators.map((indicator, idx) => (
                                      <li key={idx}>{indicator}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              No core competencies found. Try syncing this framework source.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
