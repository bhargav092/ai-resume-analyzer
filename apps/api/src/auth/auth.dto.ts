import { BadRequestException } from '@nestjs/common'
import { z } from 'zod'

const displayNameSchema = z.string().trim().min(1).max(100)
const preferencesSchema = z.object({ theme: z.enum(['light', 'dark', 'system']) }).strict()

export function parseDisplayNameUpdate(body: unknown) {
  const parsed = z.object({ displayName: displayNameSchema }).strict().safeParse(body)
  if (!parsed.success) throw new BadRequestException('Provide only a displayName between 1 and 100 characters.')
  return parsed.data.displayName
}

export function parsePreferencesUpdate(body: unknown) {
  const parsed = preferencesSchema.safeParse(body)
  if (!parsed.success) throw new BadRequestException('Theme must be light, dark, or system.')
  return parsed.data
}
