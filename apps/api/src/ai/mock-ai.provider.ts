import { Injectable } from '@nestjs/common'
import { z } from 'zod'

export const AnalysisOutputSchema = z.object({
  summary: z.string(),
  coverage: z.number().min(0).max(100),
  requirements: z.array(z.object({
    requirement: z.string(),
    importance: z.enum(['must_have', 'preferred']),
    status: z.enum(['matched', 'partial', 'missing']),
    resumeEvidence: z.string().nullable(),
    explanation: z.string(),
  })),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  recommendations: z.array(z.object({
    action: z.string(),
    reason: z.string(),
    sourceEvidence: z.string().nullable(),
  })),
  limitations: z.array(z.string()),
})

export interface AnalysisOutput {
  summary: string
  coverage: number
  requirements: Array<{
    requirement: string
    importance: 'must_have' | 'preferred'
    status: 'matched' | 'partial' | 'missing'
    resumeEvidence: string | null
    explanation: string
  }>
  strengths: string[]
  gaps: string[]
  recommendations: Array<{ action: string; reason: string; sourceEvidence: string | null }>
  limitations: string[]
}

@Injectable()
export class MockAiProvider {
  async analyze(resumeText: string, jobDescription: string): Promise<AnalysisOutput> {
    const jd = jobDescription.toLowerCase()
    const resume = resumeText.toLowerCase()
    const skills = ['react', 'node.js', 'typescript', 'mongodb', 'system design']

    const requirements = skills.map((skill) => {
      const matched = jd.includes(skill) && resume.includes(skill)
      const mentioned = jd.includes(skill)
      return {
        requirement: skill,
        importance: skill === 'system design' ? 'preferred' as const : 'must_have' as const,
        status: matched ? 'matched' as const : mentioned ? 'partial' as const : 'missing' as const,
        resumeEvidence: matched ? `Resume text mentions ${skill}.` : null,
        explanation: matched
          ? `${skill} appears in both the resume and target description.`
          : mentioned
            ? `The target description mentions ${skill}, but it was not confirmed in the uploaded text.`
            : `The resume/JD comparison did not confirm ${skill}.`,
      }
    })

    const matched = requirements.filter((item) => item.status === 'matched').length
    const partial = requirements.filter((item) => item.status === 'partial').length
    const coverage = requirements.length
      ? Math.round(((matched + partial * 0.5) / requirements.length) * 100)
      : 0

    return {
      summary: 'Initial evidence-backed resume and job-description comparison.',
      coverage,
      requirements,
      strengths: ['Relevant technology experience was found in the uploaded document.', 'The response is supported by explicit text evidence.'],
      gaps: ['Skills not confirmed by resume evidence should be reviewed.'],
      recommendations: [{
        action: 'Add only truthful, measurable examples for confirmed experience.',
        reason: 'Recommendations should not invent candidate qualifications.',
        sourceEvidence: null,
      }],
      limitations: ['This local mock provider is for MVP testing, not a production model analysis.', 'Scanned PDFs may require OCR.'],
    }
  }
}
