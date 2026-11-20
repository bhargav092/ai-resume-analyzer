import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { AnalysesController } from './analyses/analyses.controller'
import { AnalysisService } from './analyses/analysis.service'
import { DocumentParserService } from './documents/document-parser.service'
import { AuthController } from './auth/auth.controller'
import { AuthService } from './auth/auth.service'
import { HealthController } from './health.controller'
import { ConfiguredAiProvider } from './ai/configured-ai.provider'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from './auth/user.schema'
import { Analysis, AnalysisSchema } from './analyses/analysis.schema'
import { JwtAuthGuard } from './auth/jwt-auth.guard'
import { ResumeStorageService } from './storage/resume-storage.service'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { AnalysisRetentionService } from './analyses/analysis-retention.service'

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_resume_analyzer',
      { serverSelectionTimeoutMS: 5000 },
    ),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Analysis.name, schema: AnalysisSchema },
    ]),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
  ],
  controllers: [AnalysesController, AuthController, HealthController],
  providers: [
    AnalysisService,
    DocumentParserService,
    AuthService,
    JwtAuthGuard,
    ResumeStorageService,
    AnalysisRetentionService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    ConfiguredAiProvider,
    { provide: 'AI_PROVIDER', useExisting: ConfiguredAiProvider },
  ],
})
export class AppModule {}
