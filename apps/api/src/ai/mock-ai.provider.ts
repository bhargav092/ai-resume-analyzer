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

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>

const skillCatalog = [
  { name: 'JavaScript', terms: ['javascript'] },
  { name: 'TypeScript', terms: ['typescript'] },
  { name: 'React', terms: ['react', 'react.js', 'reactjs'] },
  { name: 'Angular', terms: ['angular'] },
  { name: 'Vue', terms: ['vue', 'vue.js', 'vuejs'] },
  { name: 'Node.js', terms: ['node.js', 'nodejs'] },
  { name: 'Express', terms: ['express', 'express.js'] },
  { name: 'NestJS', terms: ['nestjs'] },
  { name: 'Python', terms: ['python'] },
  { name: 'Java', terms: ['java'] },
  { name: 'Spring Boot', terms: ['spring boot'] },
  { name: 'C#', terms: ['c#', 'c sharp'] },
  { name: '.NET', terms: ['.net', 'dotnet'] },
  { name: 'Go', terms: ['golang'] },
  { name: 'Ruby', terms: ['ruby'] },
  { name: 'PHP', terms: ['php'] },
  { name: 'SQL', terms: ['sql'] },
  { name: 'PostgreSQL', terms: ['postgresql', 'postgres'] },
  { name: 'MySQL', terms: ['mysql'] },
  { name: 'MongoDB', terms: ['mongodb', 'mongo'] },
  { name: 'Redis', terms: ['redis'] },
  { name: 'AWS', terms: ['aws', 'amazon web services'] },
  { name: 'Azure', terms: ['azure'] },
  { name: 'Google Cloud', terms: ['google cloud', 'gcp'] },
  { name: 'Docker', terms: ['docker'] },
  { name: 'Kubernetes', terms: ['kubernetes', 'k8s'] },
  { name: 'CI/CD', terms: ['ci/cd', 'continuous integration'] },
  { name: 'REST APIs', terms: ['rest api', 'restful api'] },
  { name: 'GraphQL', terms: ['graphql'] },
  { name: 'Microservices', terms: ['microservices', 'microservice'] },
  { name: 'System Design', terms: ['system design'] },
  { name: 'Agile', terms: ['agile', 'scrum'] },
  { name: 'Jest', terms: ['jest'] },
  { name: 'Cypress', terms: ['cypress'] },
  { name: 'Playwright', terms: ['playwright'] },
  { name: 'HTML', terms: ['html'] },
  { name: 'CSS', terms: ['css'] },
  { name: 'Accessibility', terms: ['accessibility', 'wcag'] },
  { name: 'Communication', terms: ['communication'] },
  { name: 'Leadership', terms: ['leadership'] },
]

function containsTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(text)
}

function findEvidence(resumeText: string, terms: string[]) {
  const lines = resumeText.split(/(?<=[.!?])\s+|\r?\n/).map((line) => line.trim()).filter(Boolean)
  const evidence = lines.find((line) => terms.some((term) => containsTerm(line, term)))
  return evidence ? evidence.slice(0, 300) : null
}

@Injectable()
export class MockAiProvider {
  async analyze(resumeText: string, jobDescription: string): Promise<AnalysisOutput> {
    const requiredSkills = skillCatalog.filter((skill) => skill.terms.some((term) => containsTerm(jobDescription, term)))
    const requirements = requiredSkills.map((skill) => {
      const resumeEvidence = findEvidence(resumeText, skill.terms)
      return {
        requirement: skill.name,
        importance: 'must_have' as const,
        status: resumeEvidence ? 'matched' as const : 'missing' as const,
        resumeEvidence,
        explanation: resumeEvidence
          ? 'This requirement is explicitly mentioned in the resume.'
          : 'This requirement appears in the job description but was not found in the resume text.',
      }
    })
    const matched = requirements.filter((item) => item.status === 'matched')
    const missing = requirements.filter((item) => item.status === 'missing')
    const coverage = requirements.length ? Math.round((matched.length / requirements.length) * 100) : 0

    return {
      summary: requirements.length
        ? `The resume explicitly mentions ${matched.length} of ${requirements.length} recognized job-description skills.`
        : 'No skills from the local comparison catalog were recognized in the job description.',
      coverage,
      requirements,
      strengths: matched.map((item) => `${item.requirement}: ${item.resumeEvidence}`),
      gaps: missing.map((item) => `${item.requirement} was not found in the resume text.`),
      recommendations: missing.map((item) => ({
        action: `Review whether you have relevant experience with ${item.requirement}.`,
        reason: 'Only add it to your resume if it accurately reflects your experience.',
        sourceEvidence: null,
      })),
      limitations: [
        'The local mock provider performs keyword matching only and is not an ATS score or hiring probability.',
        ...(requirements.length ? [] : ['The local skill catalog may not include requirements from this job description.']),
      ],
    }
  }
}
