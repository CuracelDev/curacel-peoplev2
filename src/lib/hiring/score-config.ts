export type CandidateScoreComponentKey =
  | 'experienceMatchScore'
  | 'skillsMatchScore'
  | 'domainFitScore'
  | 'educationScore'
  | 'pressValuesAvg'
  | 'interviewAverage'
  | 'assessmentAverage'
  | 'competencyAverage'
  | 'personalityAverage'

export type CandidateScoreComponent = {
  id: CandidateScoreComponentKey
  label: string
  description: string
  weight: number
  enabled: boolean
}

export const candidateScoreComponentDefinitions: CandidateScoreComponent[] = [
  {
    id: 'experienceMatchScore',
    label: 'Experience Match',
    description: 'Role alignment based on candidate experience.',
    weight: 20,
    enabled: true,
  },
  {
    id: 'skillsMatchScore',
    label: 'Skills Match',
    description: 'Skill coverage score from resume and assessments.',
    weight: 20,
    enabled: true,
  },
  {
    id: 'domainFitScore',
    label: 'Domain Fit',
    description: 'Industry or domain relevance.',
    weight: 10,
    enabled: true,
  },
  {
    id: 'educationScore',
    label: 'Education',
    description: 'Education alignment score.',
    weight: 10,
    enabled: true,
  },
  {
    id: 'pressValuesAvg',
    label: 'PRESS Values',
    description: 'Average PRESS values alignment.',
    weight: 10,
    enabled: true,
  },
  {
    id: 'interviewAverage',
    label: 'Interview Average',
    description: 'Average of completed interview scores.',
    weight: 20,
    enabled: true,
  },
  {
    id: 'assessmentAverage',
    label: 'Assessment Average',
    description: 'Average of completed assessment scores.',
    weight: 10,
    enabled: true,
  },
  {
    id: 'competencyAverage',
    label: 'Competency Average',
    description: 'Average competency scores across rubrics.',
    weight: 0,
    enabled: false,
  },
  {
    id: 'personalityAverage',
    label: 'Personality Fit',
    description: 'Average of personality profile scores.',
    weight: 0,
    enabled: false,
  },
]

export const normalizeCandidateScoreWeights = (
  input?: CandidateScoreComponent[] | null
): CandidateScoreComponent[] => {
  if (!input || input.length === 0) {
    return candidateScoreComponentDefinitions
  }

  const inputById = new Map(input.map((item) => [item.id, item]))

  return candidateScoreComponentDefinitions.map((definition) => {
    const override = inputById.get(definition.id)
    if (!override) {
      return definition
    }

    return {
      ...definition,
      weight: Number.isFinite(override.weight) ? override.weight : definition.weight,
      enabled: typeof override.enabled === 'boolean' ? override.enabled : definition.enabled,
    }
  })
}
