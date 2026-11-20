import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { AnalysisOutput } from '../ai/mock-ai.provider'
import { DocumentParserService } from '../documents/document-parser.service'
import { AnalysisOutputSchema } from '../ai/mock-ai.provider'

@Injectable()
export class AnalysisService {
  constructor(
    @Inject('AI_PROVIDER') private readonly provider: { analyze(resumeText: string, jobDescription: string): Promise<AnalysisOutput> },
    private readonly parser: DocumentParserService,
  ) {}

  async analyze(file: Express.Multer.File | undefined, jobDescription: string): Promise<AnalysisOutput & { status: string }> {
    if (!file) throw new BadRequestException('A resume file is required.')
    if (!jobDescription?.trim()) throw new BadRequestException('A job description is required.')

    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ])
    if (!allowed.has(file.mimetype)) throw new BadRequestException('Only PDF and DOCX files are supported.')

    const resumeText = await this.parser.extract(file)
    const result = await this.provider.analyze(resumeText, jobDescription)
    return { status: 'completed', ...AnalysisOutputSchema.parse(result) }
  }
}
