import { AnalysisService } from './analysis.service'
import { DocumentParserService } from '../documents/document-parser.service'

describe('AnalysisService', () => {
  it('rejects unsupported file types', async () => {
    const parser = {} as DocumentParserService
    const service = new AnalysisService({
      analyze: async () => {
        throw new Error('should not be called')
      },
    }, parser)

    await expect(service.analyze({
      mimetype: 'text/plain',
      originalname: 'resume.txt',
    } as Express.Multer.File, 'React developer')).rejects.toThrow('Only PDF')
  })
})
