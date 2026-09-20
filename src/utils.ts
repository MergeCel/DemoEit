import type { Metrics, Platform, Post } from './types'

export const formatNumber = (value: number) => new Intl.NumberFormat('id-ID', { notation: value >= 1000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)
export const formatFullNumber = (value: number) => new Intl.NumberFormat('id-ID').format(value)
export const formatDate = (value: string, withTime = false) => new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
}).format(new Date(value))
export const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes > 10_000_000 ? 0 : 1)} MB`
export const engagement = (metric?: Metrics) => metric ? metric.likes + metric.comments + metric.shares + metric.saves : 0
export const latestMetric = (post: Post, platform: Platform) => post.metrics[platform]
export const isThisMonth = (value: string) => {
  const date = new Date(value)
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

export const platformColor: Record<Platform, string> = {
  instagram: '#b33b78',
  tiktok: '#15191f',
  facebook: '#2474d2',
}
