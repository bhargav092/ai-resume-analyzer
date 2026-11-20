import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { MongooseModule } from '@nestjs/mongoose'
import { AiModule } from '../ai/ai.module'
import { AuthModule } from '../auth/auth.module'
import { DocumentsModule } from '../documents/documents.module'
import { StorageModule } from '../storage/storage.module'
import { AnalysisRetentionService } from './analysis-retention.service'
import { Analysis, AnalysisSchema } from './analysis.schema'
import { AnalysesController } from './analyses.controller'
import { AnalysisService } from './analysis.service'
import { GuestDataRetentionService } from './guest-data-retention.service'

@Module({
  imports: [
    AuthModule,
    AiModule,
    DocumentsModule,
    StorageModule,
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
    MongooseModule.forFeature([{ name: Analysis.name, schema: AnalysisSchema }]),
  ],
  controllers: [AnalysesController],
  providers: [AnalysisService, AnalysisRetentionService, GuestDataRetentionService],
})
export class AnalysesModule {}
