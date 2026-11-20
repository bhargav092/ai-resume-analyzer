import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { Model } from 'mongoose'
import { User, UserDocument } from '../auth/user.schema'
import { EmailService } from '../notifications/email.service'
import { SubscriptionPayment, SubscriptionPaymentDocument } from './subscription-payment.schema'

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000
const PLANS = {
  week: { label: '7 days', amount: 9900, durationMs: 7 * 24 * 60 * 60 * 1000 },
  month: { label: '1 month', amount: 19900, durationMs: 30 * 24 * 60 * 60 * 1000 },
  quarter: { label: '3 months', amount: 29900, durationMs: 90 * 24 * 60 * 60 * 1000 },
  year: { label: '1 year', amount: 49900, durationMs: 365 * 24 * 60 * 60 * 1000 },
} as const

type PlanId = keyof typeof PLANS
type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  notes: { userId?: string; planId?: string }
}
type RazorpayPayment = {
  id: string
  order_id?: string
  qr_code_id?: string
  amount: number
  currency: string
  method: string
  status: string
}
type RazorpayQrCode = {
  id: string
  image_url: string
  close_by: number
  payment_amount: number
  status: string
}
type RazorpayQrPayments = { items: Array<Pick<RazorpayPayment, 'id' | 'amount' | 'currency' | 'method' | 'status'>> }

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name)

  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(SubscriptionPayment.name) private readonly payments: Model<SubscriptionPaymentDocument>,
    private readonly email: EmailService,
  ) {}

  async getStatus(userId: string) {
    const user = await this.users.findById(userId)
      .select('trialStartedAt subscriptionEndsAt createdAt')
      .lean()
    if (!user) throw new UnauthorizedException('User account no longer exists.')

    const trialStartedAt = user.trialStartedAt || user.createdAt
    if (!trialStartedAt) throw new InternalServerErrorException('Could not determine when this account was created.')
    const trialEndsAt = new Date(new Date(trialStartedAt).getTime() + TRIAL_DURATION_MS)
    const now = Date.now()
    const subscriptionEndsAt = user.subscriptionEndsAt || null
    const subscriptionActive = Boolean(subscriptionEndsAt && new Date(subscriptionEndsAt).getTime() > now)

    return {
      trialStartedAt,
      trialEndsAt,
      trialActive: trialEndsAt.getTime() > now,
      subscriptionEndsAt,
      subscriptionActive,
      accessActive: subscriptionActive || trialEndsAt.getTime() > now,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
        ? process.env.RAZORPAY_KEY_ID
        : null,
    }
  }

  async createOrder(userId: string, planId: string, method: 'card' | 'upi' = 'card') {
    const plan = this.getPlan(planId)
    const { keyId, keySecret } = this.getCredentials()
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: plan.amount,
        currency: 'INR',
        receipt: `sub_${userId.slice(-12)}_${Date.now()}`,
        notes: { userId, planId },
      }),
    })
    if (!response.ok) throw new BadGatewayException('Could not create a Razorpay payment order.')
    const order = await response.json() as RazorpayOrder
    if (!order.id || order.amount !== plan.amount || order.currency !== 'INR') {
      throw new BadGatewayException('Razorpay returned an invalid payment order.')
    }
    await this.payments.create({
      userId,
      planId,
      amountPaise: plan.amount,
      currency: 'INR',
      method: method === 'card' ? 'razorpay_card' : 'razorpay_upi',
      status: 'pending',
      razorpayOrderId: order.id,
    })
    return { orderId: order.id, amount: order.amount, currency: order.currency, keyId }
  }

  async createQrPayment(userId: string, planId: string) {
    const plan = this.getPlan(planId)
    const { keyId, keySecret } = this.getCredentials()
    const closeBy = Math.ceil(Date.now() / 1000) + 120
    const payment = await this.payments.create({
      userId,
      planId,
      amountPaise: plan.amount,
      currency: 'INR',
      method: 'razorpay_qr',
      status: 'pending',
      expiresAt: new Date(closeBy * 1000),
    })
    let qrCode: RazorpayQrCode
    try {
      qrCode = await this.razorpayPost<RazorpayQrCode>('payments/qr_codes', {
        type: 'upi_qr',
        name: 'AI Resume Analyzer subscription',
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: plan.amount,
        description: `${plan.label} subscription`,
        close_by: closeBy,
        notes: {
          userId,
          planId,
          paymentRecordId: payment.id,
        },
      }, keyId, keySecret)
      if (!qrCode.id || !qrCode.image_url || qrCode.payment_amount !== plan.amount || qrCode.status !== 'active') {
        throw new BadGatewayException('Razorpay returned an invalid QR payment request.')
      }
      await this.payments.updateOne(
        { _id: payment._id },
        { $set: { razorpayQrCodeId: qrCode.id, qrImageUrl: qrCode.image_url, expiresAt: new Date(qrCode.close_by * 1000) } },
      )
    } catch (error) {
      await this.payments.updateOne({ _id: payment._id }, { $set: { status: 'failed' } })
      throw error
    }

    return {
      id: payment.id,
      planId,
      amountPaise: plan.amount,
      currency: 'INR',
      status: 'pending',
      imageUrl: qrCode.image_url,
      expiresAt: new Date(qrCode.close_by * 1000),
    }
  }

  async checkQrPayment(userId: string, paymentId: string) {
    const paymentRecord = await this.payments.findOne({
      _id: paymentId,
      userId,
      method: 'razorpay_qr',
    })
    if (!paymentRecord) throw new NotFoundException('QR payment request was not found.')
    if (paymentRecord.status === 'completed') {
      return { paymentStatus: 'completed', ...await this.getStatus(userId) }
    }
    if (!paymentRecord.razorpayQrCodeId) {
      return { paymentStatus: paymentRecord.status, expiresAt: paymentRecord.expiresAt }
    }

    const { keyId, keySecret } = this.getCredentials()
    const payments = await this.razorpayGet<RazorpayQrPayments>(
      `payments/qr_codes/${encodeURIComponent(paymentRecord.razorpayQrCodeId)}/payments?count=100`,
      keyId,
      keySecret,
    )
    const captured = payments.items.find((item) => item.status === 'captured'
      && item.amount === paymentRecord.amountPaise
      && item.currency === paymentRecord.currency
      && item.method === 'upi')
    if (captured) {
      const verified = await this.razorpayGet<RazorpayPayment>(
        `payments/${encodeURIComponent(captured.id)}`,
        keyId,
        keySecret,
      )
      if (verified.qr_code_id !== paymentRecord.razorpayQrCodeId
        || verified.amount !== paymentRecord.amountPaise
        || verified.currency !== paymentRecord.currency
        || verified.status !== 'captured'
        || verified.method !== 'upi') {
        throw new BadRequestException('Razorpay payment details do not match this QR request.')
      }
      return this.completePayment(userId, paymentRecord, verified)
    }

    if (paymentRecord.status === 'pending'
      && paymentRecord.expiresAt
      && paymentRecord.expiresAt.getTime() <= Date.now()) {
      await this.payments.updateOne({ _id: paymentRecord._id, status: 'pending' }, { $set: { status: 'expired' } })
      return { paymentStatus: 'expired', expiresAt: paymentRecord.expiresAt }
    }
    return { paymentStatus: paymentRecord.status, expiresAt: paymentRecord.expiresAt }
  }

  async verifyPayment(userId: string, orderId: string, paymentId: string, signature: string) {
    if (!orderId || !paymentId || !/^[a-f\d]{64}$/i.test(signature)) {
      throw new BadRequestException('Payment verification details are invalid.')
    }
    const { keyId, keySecret } = this.getCredentials()
    const expectedSignature = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest()
    const providedSignature = Buffer.from(signature, 'hex')
    if (expectedSignature.length !== providedSignature.length || !timingSafeEqual(expectedSignature, providedSignature)) {
      throw new UnauthorizedException('Razorpay payment signature is invalid.')
    }

    const [order, payment] = await Promise.all([
      this.razorpayGet<RazorpayOrder>(`orders/${encodeURIComponent(orderId)}`, keyId, keySecret),
      this.razorpayGet<RazorpayPayment>(`payments/${encodeURIComponent(paymentId)}`, keyId, keySecret),
    ])
    const planId = order.notes?.planId
    if (order.notes?.userId !== userId || !planId) {
      throw new UnauthorizedException('This payment order does not belong to your account.')
    }
    const plan = this.getPlan(planId)
    if (payment.order_id !== orderId || order.amount !== plan.amount || order.currency !== 'INR') {
      throw new BadRequestException('The payment has not been captured for this subscription plan.')
    }

    const paymentRecord = await this.payments.findOne({ userId, razorpayOrderId: orderId })
    if (!paymentRecord || !['razorpay_card', 'razorpay_upi'].includes(paymentRecord.method)
      || paymentRecord.planId !== planId || paymentRecord.amountPaise !== plan.amount) {
      throw new UnauthorizedException('This payment order was not created for your account.')
    }
    return this.completePayment(userId, paymentRecord, payment)
  }

  private async completePayment(
    userId: string,
    paymentRecord: SubscriptionPaymentDocument,
    payment: RazorpayPayment,
  ) {
    const plan = this.getPlan(paymentRecord.planId)
    const expectedMethod = paymentRecord.method === 'razorpay_upi' || paymentRecord.method === 'razorpay_qr'
      ? 'upi'
      : 'card'
    if (payment.amount !== plan.amount || payment.currency !== 'INR'
      || payment.method !== expectedMethod || payment.status !== 'captured') {
      throw new BadRequestException('The payment has not been captured for this subscription plan.')
    }
    const user = await this.users.findById(userId).select('email displayName subscriptionEndsAt subscriptionPaymentIds')
    if (!user) throw new UnauthorizedException('User account no longer exists.')
    if (!user.subscriptionPaymentIds.includes(payment.id)) {
      const now = Date.now()
      const currentEnd = user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt).getTime() : now
      const subscriptionEndsAt = new Date(Math.max(now, currentEnd) + plan.durationMs)
      const updatedUser = await this.users.findOneAndUpdate(
        { _id: userId, subscriptionPaymentIds: { $ne: payment.id } },
        { $set: { subscriptionEndsAt }, $addToSet: { subscriptionPaymentIds: payment.id } },
        { new: true },
      )
      if (!updatedUser) {
        const current = await this.users.findById(userId).select('subscriptionPaymentIds')
        if (!current?.subscriptionPaymentIds.includes(payment.id)) {
          throw new ConflictException('Could not apply this payment to the subscription.')
        }
      }
    }
    await this.payments.updateOne(
      { _id: paymentRecord._id },
      { $set: { status: 'completed', razorpayPaymentId: payment.id } },
    )
    const notificationWarning = await this.sendPaymentConfirmationOnce(paymentRecord, user.email, user.displayName, plan.label, plan.amount / 100)
    return {
      paymentStatus: 'completed',
      ...await this.getStatus(userId),
      notificationWarning,
    }
  }

  private async sendPaymentConfirmationOnce(
    payment: SubscriptionPaymentDocument,
    email: string,
    displayName: string,
    planLabel: string,
    amountRupees: number,
  ) {
    try {
      const claim = await this.payments.updateOne(
        { _id: payment._id, receiptEmailSentAt: { $exists: false }, receiptEmailSending: { $ne: true } },
        { $set: { receiptEmailSending: true } },
      )
      if (claim.modifiedCount === 0) return null
      try {
        await this.email.sendPaymentConfirmation(email, displayName, planLabel, amountRupees)
        await this.payments.updateOne(
          { _id: payment._id },
          { $set: { receiptEmailSentAt: new Date() }, $unset: { receiptEmailSending: 1 } },
        )
        return null
      } catch (error) {
        await this.payments.updateOne({ _id: payment._id }, { $unset: { receiptEmailSending: 1 } })
        throw error
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown mail delivery error.'
      this.logger.error(`Subscription confirmation email was not sent: ${reason}`)
      return 'Payment verified and subscription activated, but the confirmation email could not be sent. Check the API SMTP settings.'
    }
  }

  private getPlan(planId: string) {
    if (!Object.prototype.hasOwnProperty.call(PLANS, planId)) {
      throw new BadRequestException('Select a valid subscription plan.')
    }
    return PLANS[planId as PlanId]
  }

  private getCredentials() {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException('Razorpay is not configured. Add the API credentials to the server environment.')
    }
    return { keyId, keySecret }
  }

  private async razorpayGet<T>(resource: string, keyId: string, keySecret: string): Promise<T> {
    const response = await fetch(`https://api.razorpay.com/v1/${resource}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
    })
    if (!response.ok) throw new BadGatewayException('Could not verify the Razorpay payment.')
    return response.json() as Promise<T>
  }

  private async razorpayPost<T>(
    resource: string,
    body: Record<string, unknown>,
    keyId: string,
    keySecret: string,
  ): Promise<T> {
    const response = await fetch(`https://api.razorpay.com/v1/${resource}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new BadGatewayException('Could not create a Razorpay QR payment request.')
    return response.json() as Promise<T>
  }
}
