export const OUTBOUND_EVENTS = [
  { id: 'offer.sent', label: 'Offer sent' },
  { id: 'offer.signed', label: 'Offer signed' },
  { id: 'offer.cancelled', label: 'Offer cancelled' },
  { id: 'employee.created', label: 'Employee created' },
  { id: 'employee.updated', label: 'Employee updated' },
  { id: 'onboarding.started', label: 'Onboarding started' },
  { id: 'onboarding.completed', label: 'Onboarding completed' },
  { id: 'offboarding.started', label: 'Offboarding started' },
  { id: 'offboarding.completed', label: 'Offboarding completed' },
] as const

export type OutboundEventType = typeof OUTBOUND_EVENTS[number]['id']
