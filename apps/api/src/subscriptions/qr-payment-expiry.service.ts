import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Model } from 'mongoose'
import { SubscriptionPayment, SubscriptionPaymentDocument } from './subscription-payment.schema'

@Injectable()
export class QrPaymentExpiryService {
  constructor(
    @InjectModel(SubscriptionPayment.name)
    private readonly payments: Model<SubscriptionPaymentDocument>,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async expireQrPayments() {
    await this.payments.updateMany(
      { method: 'razorpay_qr', status: 'pending', expiresAt: { $lte: new Date() } },
      { $set: { status: 'expired' } },
    )
  }
}
