import { randomBytes } from 'node:crypto'

const isProduction = process.env.NODE_ENV === 'production'
const configuredSecret = process.env.JWT_SECRET
const isPlaceholder = configuredSecret?.startsWith('replace-with-') ?? false

if (isProduction && (!configuredSecret || configuredSecret.length < 32 || isPlaceholder)) {
  throw new Error('JWT_SECRET must be set to at least 32 characters in production.')
}

if (!configuredSecret || isPlaceholder) {
  console.warn('JWT_SECRET is unset; using an ephemeral development secret.')
}

export const jwtSecret = configuredSecret && !isPlaceholder ? configuredSecret : randomBytes(48).toString('hex')
