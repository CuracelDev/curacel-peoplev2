import type { AppProvisioningRule, Employee } from '@prisma/client'
import type { ProvisioningCondition } from './types'

export function matchesProvisioningCondition(
  employee: Employee,
  condition: ProvisioningCondition
): boolean {
  const meta =
    employee.meta && typeof employee.meta === 'object' && !Array.isArray(employee.meta)
      ? (employee.meta as Record<string, unknown>)
      : {}

  for (const [key, value] of Object.entries(condition)) {
    if (value === undefined || value === null) continue
    const employeeValue =
      (employee as Record<string, unknown>)[key] !== undefined
        ? (employee as Record<string, unknown>)[key]
        : meta[key]

    if (typeof employeeValue === 'string' && typeof value === 'string') {
      if (employeeValue.toLowerCase() !== value.toLowerCase()) return false
      continue
    }

    if (employeeValue !== value) return false
  }

  return true
}

export function hasMatchingProvisioningRule(
  employee: Employee,
  rules: AppProvisioningRule[]
): boolean {
  if (rules.length === 0) return false
  return rules.some((rule) => {
    if (!rule.isActive) return false
    const condition = rule.condition as ProvisioningCondition
    return matchesProvisioningCondition(employee, condition)
  })
}
