import { MockAiProvider } from './mock-ai.provider'

describe('MockAiProvider', () => {
  const provider = new MockAiProvider()

  it('only scores recognized job skills and requires resume evidence for a match', async () => {
    const result = await provider.analyze(
      'Built a customer dashboard with React and improved load performance.',
      'Requirements: React, Node.js, and TypeScript.',
    )

    expect(result.coverage).toBe(33)
    expect(result.requirements.find((item) => item.requirement === 'React')).toMatchObject({
      status: 'matched',
      resumeEvidence: 'Built a customer dashboard with React and improved load performance.',
    })
    expect(result.requirements.find((item) => item.requirement === 'Node.js')?.status).toBe('missing')
  })

  it('does not invent requirements when the job description has no catalog skills', async () => {
    const result = await provider.analyze('Candidate resume text.', 'A role with varied responsibilities.')
    expect(result.requirements).toEqual([])
    expect(result.coverage).toBe(0)
  })
})
