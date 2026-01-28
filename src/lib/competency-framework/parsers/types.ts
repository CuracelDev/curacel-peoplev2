/**
 * Type definitions for competency framework parsers
 */

export type SheetFormatType =
  | 'STANDARD_4_LEVEL'      // 7 departments: People Ops, Sales, Finance, Product, Marketing, Success, Engineering
  | 'EXTENDED_5_LEVEL'      // 2 frameworks: HealthOps, Company Values
  | 'AI_BEHAVIORAL'         // AI Framework with behavioral indicators

export type CompetencyFrameworkType = 'DEPARTMENT' | 'AI' | 'VALUES'

export interface SheetMetadata {
  type: CompetencyFrameworkType
  name: string
  department?: string
  sheetUrl: string
  sheetId: string
  tabName?: string
}

export interface ParsedLevel {
  level: number
  name: string
  description: string
}

export interface ParsedBehavioralIndicator {
  level: number
  levelName: string
  indicators: string[]
}

export interface ParsedSubCompetency {
  name: string
  description?: string
  levels: ParsedLevel[]
  hasBehavioralIndicators: boolean
  behavioralIndicators?: ParsedBehavioralIndicator[]
}

export interface ParsedCoreCompetency {
  name: string
  description?: string
  functionArea?: string
  category?: string
  subCompetencies: ParsedSubCompetency[]
}

export interface ParsedCompetencyFramework {
  metadata: SheetMetadata
  formatType: SheetFormatType
  levelNames: string[]
  minLevel: number
  maxLevel: number
  coreCompetencies: ParsedCoreCompetency[]
}

/**
 * Raw sheet data - represents a single row from Google Sheets
 */
export interface SheetRow {
  [columnIndex: number]: string | undefined
}

/**
 * Column indices for standard 4-level format
 */
export interface Standard4LevelColumns {
  function: number          // Column A (0)
  functionObjective: number // Column B (1)
  coreCompetency: number    // Column C (2)
  subCompetency: number     // Column D (3)
  basic: number             // Column E (4)
  intermediate: number      // Column F (5)
  proficient: number        // Column G (6)
  advanced: number          // Column H (7)
}

/**
 * Column indices for extended 5-level format
 */
export interface Extended5LevelColumns extends Standard4LevelColumns {
  expert: number            // Column I (8)
}

/**
 * Column indices for AI behavioral format
 */
export interface AIBehavioralColumns {
  competency: number        // Column A (0)
  unacceptable: number      // Column B (1) - Level 0
  basic: number             // Column C (2) - Level 1
  intermediate: number      // Column D (3) - Level 2
  proficient: number        // Column E (4) - Level 3
  advanced: number          // Column F (5) - Level 4
}

/**
 * Column indices for Values format (same as Extended 5-level but different structure)
 */
export interface ValuesColumns {
  value: number             // Column A (0)
  valueDefinition: number   // Column B (1)
  competency: number        // Column C (2)
  definition: number        // Column D (3)
  basic: number             // Column E (4)
  intermediate: number      // Column F (5)
  proficient: number        // Column G (6)
  advanced: number          // Column H (7)
  expert: number            // Column I (8)
}
