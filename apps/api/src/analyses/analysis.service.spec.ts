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
    }, parser, {} as Model<AnalysisDocument>, {} as ResumeStorageService, {} as never)

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
      {} as never,
    )

    await service.list(userId)

    expect(find).toHaveBeenCalledWith({ userId: new Types.ObjectId(userId) })
    expect(lean).toHaveBeenCalled()
  })

  it('updates only the title of an analysis owned by the requesting identity', async () => {
    const ownerId = '6b000d71505c4496e5116b9e'
    const analysisId = '6b000d71505c4496e5116b9f'
    const item = { _id: new Types.ObjectId(analysisId), title: 'Updated title', result: { coverage: 80 } }
    const lean = jest.fn().mockResolvedValue(item)
    const findOneAndUpdate = jest.fn().mockReturnValue({ lean })
    const service = new AnalysisService(
      { analyze: jest.fn() },
      {} as DocumentParserService,
      { findOneAndUpdate } as unknown as Model<AnalysisDocument>,
      {} as ResumeStorageService,
      {} as never,
    )

    await service.updateTitle(analysisId, ownerId, 'Updated title')

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: analysisId, userId: new Types.ObjectId(ownerId) },
      { $set: { title: 'Updated title' } },
      { new: true, runValidators: true },
    )
  })

  it('uses mock AI and never stores a guest resume in S3', async () => {
    const output = {
      summary: 'Mock result',
      coverage: 0,
      requirements: [],
      strengths: [],
      gaps: [],
      recommendations: [],
      limitations: [],
    }
    const saved = { id: 'analysis-id', createdAt: new Date(), save: jest.fn().mockResolvedValue(undefined) }
    const analyses = jest.fn(function (this: Record<string, unknown>, values: Record<string, unknown>) {
      Object.assign(this, values, saved)
    })
    const configuredAnalyze = jest.fn().mockRejectedValue(new Error('external provider must not run'))
    const mockAnalyze = jest.fn().mockResolvedValue(output)
    const storage = { store: jest.fn(), remove: jest.fn() } as unknown as ResumeStorageService
    const service = new AnalysisService(
      { analyze: configuredAnalyze },
      { extract: jest.fn().mockResolvedValue('resume text') } as unknown as DocumentParserService,
      analyses as unknown as Model<AnalysisDocument>,
      storage,
      { analyze: mockAnalyze } as never,
    )

    await service.analyze({
      mimetype: 'application/pdf',
      originalname: 'resume.pdf',
    } as Express.Multer.File, 'Software developer', '6b000d71505c4496e5116b9e', true, new Date(Date.now() + 1000))

    expect(mockAnalyze).toHaveBeenCalledWith('resume text', 'Software developer')
    expect(configuredAnalyze).not.toHaveBeenCalled()
    expect(storage.store).not.toHaveBeenCalled()
    expect(analyses).toHaveBeenCalledWith(expect.objectContaining({
      userId: new Types.ObjectId('6b000d71505c4496e5116b9e'),
      guestExpiresAt: expect.any(Date),
    }))
  })
})
