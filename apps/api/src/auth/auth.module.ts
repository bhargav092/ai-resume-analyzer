import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { NotificationsModule } from '../notifications/notifications.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { GuestSession, GuestSessionSchema } from './guest-session.schema'
import { GuestSessionService } from './guest-session.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { User, UserSchema } from './user.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: GuestSession.name, schema: GuestSessionSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, GuestSessionService, JwtAuthGuard],
  exports: [AuthService, GuestSessionService, JwtAuthGuard, MongooseModule],
})
export class AuthModule {}
