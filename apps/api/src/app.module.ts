import { Module } from '@nestjs/common'
import { AnalysesModule } from './analyses/analyses.module'
import { AuthModule } from './auth/auth.module'
import { HealthController } from './health.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_resume_analyzer',
      { serverSelectionTimeoutMS: 5000 },
    ),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    AuthModule,
    AnalysesModule,
    SubscriptionsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
