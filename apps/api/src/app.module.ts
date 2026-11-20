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

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_resume_analyzer',
      { serverSelectionTimeoutMS: 5000 },
    ),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
  ],
  controllers: [AnalysesController, AuthController, HealthController],
  providers: [
    AnalysisService,
    DocumentParserService,
    AuthService,
    ConfiguredAiProvider,
    { provide: 'AI_PROVIDER', useExisting: ConfiguredAiProvider },
  ],
})
export class AppModule {}
