import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Model } from 'mongoose'
import { Analysis, AnalysisDocument } from './analysis.schema'
import { ResumeStorageService } from '../storage/resume-storage.service'

@Injectable()
export class AnalysisRetentionService {
  private readonly logger = new Logger(AnalysisRetentionService.name)
  private readonly retentionDays = Number(process.env.ANALYSIS_RETENTION_DAYS || 90)

  constructor(
    @InjectModel(Analysis.name) private readonly analyses: Model<AnalysisDocument>,
    private readonly storage: ResumeStorageService,
  ) {
    if (!Number.isInteger(this.retentionDays) || this.retentionDays < 1) {
      throw new Error('ANALYSIS_RETENTION_DAYS must be a positive integer.')
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeExpiredAnalyses() {
    const expiresBefore = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000)
    const expired = await this.analyses.find({ createdAt: { $lt: expiresBefore } }).limit(100)

    for (const analysis of expired) {
      try {
        await this.storage.remove(analysis.resumeObjectKey)
        await analysis.deleteOne()
      } catch (error) {
        this.logger.error(`Unable to remove expired analysis ${analysis.id}.`, error)
      }
    }
  }
}
