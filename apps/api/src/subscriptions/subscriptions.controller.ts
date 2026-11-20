import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Types } from 'mongoose'
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { SubscriptionsService } from './subscriptions.service'

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('status')
  getStatus(@Req() request: AuthenticatedRequest) {
    this.requirePaidAccount(request)
    return this.subscriptions.getStatus(request.user.sub)
  }

  @Post('orders')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  createOrder(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    this.requirePaidAccount(request)
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('A subscription plan is required.')
    }
    const planId = (body as Record<string, unknown>).planId
    const method = (body as Record<string, unknown>).method ?? 'card'
    if (typeof planId !== 'string' || (method !== 'card' && method !== 'upi')) {
      throw new BadRequestException('Select a valid plan and payment method.')
    }
    return this.subscriptions.createOrder(request.user.sub, planId, method)
  }

  @Post('qr-codes')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  createQrPayment(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    this.requirePaidAccount(request)
    if (!body || typeof body !== 'object' || typeof (body as Record<string, unknown>).planId !== 'string') {
      throw new BadRequestException('A subscription plan is required.')
    }
    return this.subscriptions.createQrPayment(request.user.sub, (body as Record<string, string>).planId)
  }

  @Get('qr-codes/:id/status')
  checkQrPayment(@Req() request: AuthenticatedRequest, @Param('id') paymentId: string) {
    this.requirePaidAccount(request)
    if (!Types.ObjectId.isValid(paymentId)) throw new BadRequestException('QR payment ID is invalid.')
    return this.subscriptions.checkQrPayment(request.user.sub, paymentId)
  }

  @Post('verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyPayment(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    this.requirePaidAccount(request)
    if (!body || typeof body !== 'object') throw new BadRequestException('Payment details are required.')
    const values = body as Record<string, unknown>
    if (typeof values.razorpay_order_id !== 'string'
      || typeof values.razorpay_payment_id !== 'string'
      || typeof values.razorpay_signature !== 'string') {
      throw new BadRequestException('Payment verification details are invalid.')
    }
    return this.subscriptions.verifyPayment(
      request.user.sub,
      values.razorpay_order_id,
      values.razorpay_payment_id,
      values.razorpay_signature,
    )
  }

  private requirePaidAccount(request: AuthenticatedRequest) {
    if (request.user.type === 'guest') {
      throw new ForbiddenException('Guest sessions cannot access subscription payments.')
    }
  }
}
