import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '../auth/auth.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { QrPaymentExpiryService } from './qr-payment-expiry.service'
import { SubscriptionPayment, SubscriptionPaymentSchema } from './subscription-payment.schema'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsService } from './subscriptions.service'

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    MongooseModule.forFeature([{ name: SubscriptionPayment.name, schema: SubscriptionPaymentSchema }]),
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, QrPaymentExpiryService],
})
export class SubscriptionsModule {}
