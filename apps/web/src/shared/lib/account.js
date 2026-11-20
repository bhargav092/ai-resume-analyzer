export function getUserInitials(displayName, email) {
  const name = displayName?.trim() || email?.split('@')[0] || 'G'
  const parts = name.split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)).toUpperCase()
}

export function getAuthErrorMessage(error, fallback) {
  if (error?.response?.status === 429) {
    return 'Too many authentication attempts. Please wait about 60 seconds before trying again.'
  }
  const message = error?.response?.data?.message
  return typeof message === 'string' ? message : fallback
}
