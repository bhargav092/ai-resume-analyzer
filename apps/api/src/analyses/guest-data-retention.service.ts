import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Model } from 'mongoose'
import { GuestSession, GuestSessionDocument } from '../auth/guest-session.schema'
import { Analysis, AnalysisDocument } from './analysis.schema'
import { ResumeStorageService } from '../storage/resume-storage.service'

@Injectable()
export class GuestDataRetentionService {
  private readonly logger = new Logger(GuestDataRetentionService.name)

  constructor(
    @InjectModel(GuestSession.name) private readonly sessions: Model<GuestSessionDocument>,
    @InjectModel(Analysis.name) private readonly analyses: Model<AnalysisDocument>,
    private readonly storage: ResumeStorageService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async removeExpiredGuestData() {
    const now = new Date()
    const expired = await this.analyses.find({ guestExpiresAt: { $lte: now } }).limit(100)
    for (const analysis of expired) {
      try {
        await this.storage.remove(analysis.resumeObjectKey)
        await analysis.deleteOne()
      } catch (error) {
        this.logger.error(`Unable to remove expired guest analysis ${analysis.id}.`, error)
      }
    }
    await this.sessions.deleteMany({ expiresAt: { $lte: now } })
  }
}
