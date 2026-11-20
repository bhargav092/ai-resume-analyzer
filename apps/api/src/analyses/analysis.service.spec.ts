import { AnalysisService } from './analysis.service'
import { DocumentParserService } from '../documents/document-parser.service'
import { AnalysisDocument } from './analysis.schema'
import { Model } from 'mongoose'
import { ResumeStorageService } from '../storage/resume-storage.service'
import { Types } from 'mongoose'

describe('AnalysisService', () => {
  it('rejects unsupported file types', async () => {
    const parser = {} as DocumentParserService
    const service = new AnalysisService({
      analyze: async () => {
        throw new Error('should not be called')
      },
    }, parser, {} as Model<AnalysisDocument>, {} as ResumeStorageService)

    await expect(service.analyze({
      mimetype: 'text/plain',
      originalname: 'resume.txt',
    } as Express.Multer.File, 'React developer', 'user-id')).rejects.toThrow('Only PDF')
  })

  it('scopes history queries to the authenticated Mongo user id', async () => {
    const userId = '6b000d71505c4496e5116b9e'
    const lean = jest.fn().mockResolvedValue([])
    const select = jest.fn().mockReturnValue({ lean })
    const limit = jest.fn().mockReturnValue({ select })
    const sort = jest.fn().mockReturnValue({ limit })
    const find = jest.fn().mockReturnValue({ sort })
    const service = new AnalysisService(
      { analyze: jest.fn() },
      {} as DocumentParserService,
      { find } as unknown as Model<AnalysisDocument>,
      {} as ResumeStorageService,
    )

    await service.list(userId)

    expect(find).toHaveBeenCalledWith({ userId: new Types.ObjectId(userId) })
    expect(lean).toHaveBeenCalled()
  })
})
