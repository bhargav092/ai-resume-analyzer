import { AnalysisOutput } from './mock-ai.provider'

export interface AiProvider {
  analyze(resumeText: string, jobDescription: string): Promise<AnalysisOutput>
}
