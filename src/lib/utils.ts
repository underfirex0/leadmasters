import { clsx, type ClassValue } from 'clsx'
import { FIELD_COSTS, FREE_FIELDS } from './constants'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function calculateCost(fields: string[], count: number): number {
  const premiumFields = fields.filter(f => !FREE_FIELDS.includes(f))
  const costPerBusiness = premiumFields.reduce(
    (sum, field) => sum + (FIELD_COSTS[field] || 0),
    0
  )
  return costPerBusiness * count
}

export function calculateCostPerBusiness(fields: string[]): number {
  const premiumFields = fields.filter(f => !FREE_FIELDS.includes(f))
  return premiumFields.reduce(
    (sum, field) => sum + (FIELD_COSTS[field] || 0),
    0
  )
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-MA').format(n)
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('fr-MA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function formatDateShort(dateString: string): string {
  return new Intl.DateTimeFormat('fr-MA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString))
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

export function buildCSV(
  businesses: Array<Record<string, string | null>>,
  fields: string[]
): string {
  const headers = fields.join(',')
  const rows = businesses.map(biz =>
    fields
      .map(f => {
        const val = biz[f] ?? ''
        // Escape commas and quotes
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      })
      .join(',')
  )
  return [headers, ...rows].join('\n')
}
