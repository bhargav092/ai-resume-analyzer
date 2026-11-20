import { BadRequestException } from '@nestjs/common'
import { z } from 'zod'

export function parseAnalysisTitleUpdate(body: unknown) {
  const parsed = z.object({
    title: z.string().trim().min(1).max(160),
  }).strict().safeParse(body)
  if (!parsed.success) throw new BadRequestException('Provide only a title between 1 and 160 characters.')
  return parsed.data.title
}
