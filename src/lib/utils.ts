import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateWorkEmail(fullName: string, domain: string): string {
  const nameParts = fullName.toLowerCase().trim().split(/\s+/)
  if (nameParts.length === 1) {
    return `${nameParts[0]}@${domain}`
  }
  const firstName = nameParts[0]
  const lastName = nameParts[nameParts.length - 1]
  return `${firstName}.${lastName}@${domain}`
}

export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const specialChars = '!@#$%&*'
  let password = ''

  // 8 alphanumeric chars
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  // Add 2 special chars
  for (let i = 0; i < 2; i++) {
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length))
  }

  // Shuffle
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (!(d instanceof Date) || isNaN(d.getTime())) return '-'

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      ...options,
    }).format(d)
  } catch (error) {
    return '-'
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (!(d instanceof Date) || isNaN(d.getTime())) return '-'

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch (error) {
    return '-'
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function parseTemplateVariables(template: string): string[] {
  // Support both {variable} and %{variable} formats
  const regex = /%?\{(\w+)\}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  return variables
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  // Support both {variable} and %{variable} formats
  return template.replace(/%?\{(\w+)\}/g, (match, key) => {
    return variables[key] ?? match
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export const employeeStatusLabels: Record<string, string> = {
  CANDIDATE: 'Candidate',
  OFFER_SENT: 'Offer Sent',
  OFFER_SIGNED: 'Offer Signed',
  HIRED_PENDING_START: 'Pending Start',
  ACTIVE: 'Active',
  OFFBOARDING: 'Offboarding',
  EXITED: 'Exited',
}

export const employeeStatusColors: Record<string, string> = {
  CANDIDATE: 'bg-gray-100 text-gray-800',
  OFFER_SENT: 'bg-blue-100 text-blue-800',
  OFFER_SIGNED: 'bg-indigo-100 text-indigo-800',
  HIRED_PENDING_START: 'bg-purple-100 text-purple-800',
  ACTIVE: 'bg-success/10 text-success',
  OFFBOARDING: 'bg-orange-100 text-orange-800',
  EXITED: 'bg-destructive/10 text-destructive',
}

export const offerStatusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  SIGNED: 'Signed',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
}

export const offerStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  VIEWED: 'bg-yellow-100 text-yellow-800',
  SIGNED: 'bg-success/10 text-success',
  DECLINED: 'bg-destructive/10 text-destructive',
  EXPIRED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

// Alias for contracts (same as offers)
export const contractStatusLabels = offerStatusLabels
export const contractStatusColors = offerStatusColors

export const taskStatusLabels: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUCCESS: 'Completed',
  FAILED: 'Failed',
  SKIPPED: 'Skipped',
}

export const taskStatusColors: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  SUCCESS: 'bg-success/10 text-success',
  FAILED: 'bg-destructive/10 text-destructive',
  SKIPPED: 'bg-gray-100 text-gray-600',
}

