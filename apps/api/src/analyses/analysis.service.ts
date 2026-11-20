import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { AnalysisOutput } from '../ai/mock-ai.provider'
import { DocumentParserService } from '../documents/document-parser.service'
import { AnalysisOutputSchema } from '../ai/mock-ai.provider'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Analysis, AnalysisDocument } from './analysis.schema'
import { ResumeStorageService } from '../storage/resume-storage.service'
import { NotFoundException } from '@nestjs/common'

@Injectable()
export class AnalysisService {
  constructor(
    @Inject('AI_PROVIDER') private readonly provider: { analyze(resumeText: string, jobDescription: string): Promise<AnalysisOutput> },
    private readonly parser: DocumentParserService,
    @InjectModel(Analysis.name) private readonly analyses: Model<AnalysisDocument>,
    private readonly storage: ResumeStorageService,
  ) {}

  async analyze(file: Express.Multer.File | undefined, jobDescription: string, userId: string) {
    if (!file) throw new BadRequestException('A resume file is required.')
    if (typeof jobDescription !== 'string' || !jobDescription.trim()) {
      throw new BadRequestException('A job description is required.')
    }
    if (jobDescription.length > 20000) throw new BadRequestException('Job description must be 20,000 characters or fewer.')

    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ])
    if (!allowed.has(file.mimetype)) throw new BadRequestException('Only PDF and DOCX files are supported.')

    const resumeText = await this.parser.extract(file)
    const result = AnalysisOutputSchema.parse(await this.provider.analyze(resumeText, jobDescription))
    const resumeObjectKey = await this.storage.store(file, userId)
    const title = jobDescription.split(/\r?\n/).map((line) => line.trim()).find(Boolean)?.slice(0, 160) || 'Resume analysis'
    const analysis = new this.analyses({
      userId: new Types.ObjectId(userId),
      title,
      resumeFilename: file.originalname.slice(0, 255),
      jobDescription,
      result,
      resumeObjectKey,
    })
    try {
      await analysis.save()
    } catch (error) {
      await this.storage.remove(resumeObjectKey)
      throw error
    }

    return { id: analysis.id, createdAt: analysis.createdAt, status: 'completed', ...result }
  }

  async list(userId: string) {
    const ownerId = new Types.ObjectId(userId)
    const items = await this.analyses.find({ userId: ownerId }).sort({ createdAt: -1 }).limit(50)
      .select('title resumeFilename result.coverage result.summary createdAt')
      .lean()
    return items.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      resumeFilename: item.resumeFilename,
      coverage: item.result.coverage,
      summary: item.result.summary,
      createdAt: item.createdAt,
    }))
  }

  async get(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Analysis not found.')
    const ownerId = new Types.ObjectId(userId)
    const item = await this.analyses.findOne({ _id: id, userId: ownerId }).select('+jobDescription').lean()
    if (!item) throw new NotFoundException('Analysis not found.')
    return { ...item, id: item._id.toString() }
  }

  async remove(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Analysis not found.')
    const ownerId = new Types.ObjectId(userId)
    const item = await this.analyses.findOne({ _id: id, userId: ownerId })
    if (!item) throw new NotFoundException('Analysis not found.')
    await this.storage.remove(item.resumeObjectKey)
    await item.deleteOne()
    return { deleted: true }
  }
}
