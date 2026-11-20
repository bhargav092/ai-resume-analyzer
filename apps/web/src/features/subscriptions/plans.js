export const subscriptionPlans = [
  { id: 'week', duration: '7 days', price: 99 },
  { id: 'month', duration: '1 month', price: 199 },
  { id: 'quarter', duration: '3 months', price: 299, featured: true },
  { id: 'year', duration: '1 year', price: 499 },
]

export function getTrialTimeLeft(endsAt) {
  const hours = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / (60 * 60 * 1000)))
  return hours >= 24 ? '1 day left' : `${hours} ${hours === 1 ? 'hour' : 'hours'} left`
}
