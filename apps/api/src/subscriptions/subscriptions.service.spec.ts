import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { createHmac } from 'node:crypto'
import { Model } from 'mongoose'
import { User, UserDocument } from '../auth/user.schema'
import { EmailService } from '../notifications/email.service'
import { SubscriptionPaymentDocument } from './subscription-payment.schema'
import { SubscriptionsService } from './subscriptions.service'

describe('SubscriptionsService', () => {
  const originalFetch = global.fetch
  const originalKeyId = process.env.RAZORPAY_KEY_ID
  const originalKeySecret = process.env.RAZORPAY_KEY_SECRET

  afterEach(() => {
    global.fetch = originalFetch
    if (originalKeyId === undefined) delete process.env.RAZORPAY_KEY_ID
    else process.env.RAZORPAY_KEY_ID = originalKeyId
    if (originalKeySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET
    else process.env.RAZORPAY_KEY_SECRET = originalKeySecret
    jest.restoreAllMocks()
  })

  const serviceWithUser = (user: Record<string, unknown>) => {
    const query = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(user),
    }
    const model = { findById: jest.fn().mockReturnValue(query) } as unknown as Model<UserDocument>
    const payments = {
      create: jest.fn().mockResolvedValue({ id: 'payment_test' }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    } as unknown as Model<SubscriptionPaymentDocument>
    const email = { sendPaymentConfirmation: jest.fn() } as unknown as EmailService
    return new SubscriptionsService(
      model,
      payments as Model<SubscriptionPaymentDocument>,
      email,
    )
  }

  it('grants a 24-hour trial from the account trial start time', async () => {
    const now = Date.now()
    const service = serviceWithUser({
      trialStartedAt: new Date(now - 23 * 60 * 60 * 1000),
      subscriptionEndsAt: null,
    })

    const status = await service.getStatus('user-id')

    expect(status.trialActive).toBe(true)
    expect(status.accessActive).toBe(true)
    expect(new Date(status.trialEndsAt).getTime() - new Date(status.trialStartedAt).getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it.each([
    ['week', 9900],
    ['month', 19900],
    ['quarter', 29900],
    ['year', 49900],
  ])('creates a Razorpay order for the %s plan at the configured INR amount', async (planId, amount) => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_id'
    process.env.RAZORPAY_KEY_SECRET = 'test-secret'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'order_test', amount, currency: 'INR' }),
    }) as unknown as typeof fetch

    const service = serviceWithUser({})
    const order = await service.createOrder('user-id', planId)

    expect(order).toEqual({ orderId: 'order_test', amount, currency: 'INR', keyId: 'rzp_test_id' })
    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string)
    expect(requestBody).toMatchObject({ amount, currency: 'INR', notes: { userId: 'user-id', planId } })
  })

  it('rejects unknown plans before contacting Razorpay', async () => {
    const service = serviceWithUser({})

    await expect(service.createOrder('user-id', 'unknown')).rejects.toThrow(BadRequestException)
    expect(global.fetch).toBe(originalFetch)
  })

  it('creates a real Razorpay UPI QR code with the selected plan amount and provider expiry', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_id'
    process.env.RAZORPAY_KEY_SECRET = 'test-secret'
    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now)
    const create = jest.fn().mockResolvedValue({ id: 'payment_record_test', _id: 'payment_record_test' })
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 })
    const payments = {
      create,
      updateOne,
    } as unknown as Model<SubscriptionPaymentDocument>
    const users = { findById: jest.fn() } as unknown as Model<UserDocument>
    const email = { sendPaymentConfirmation: jest.fn() } as unknown as EmailService
    const service = new SubscriptionsService(users, payments, email)
    global.fetch = jest.fn().mockImplementation(async (_url: string, options: RequestInit) => {
      const requestBody = JSON.parse(options.body as string)
      return {
        ok: true,
        json: async () => ({
          id: 'qr_code_test',
          image_url: 'https://rzp.io/i/qr_code_test',
          close_by: requestBody.close_by,
          payment_amount: 9900,
          status: 'active',
        }),
      }
    }) as unknown as typeof fetch

    const qr = await service.createQrPayment('user-id', 'week')

    expect(qr).toMatchObject({
      id: 'payment_record_test',
      amountPaise: 9900,
      status: 'pending',
      imageUrl: 'https://rzp.io/i/qr_code_test',
    })
    expect(new Date(qr.expiresAt).getTime() - now).toBeGreaterThanOrEqual(120_000)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      method: 'razorpay_qr',
      status: 'pending',
      amountPaise: 9900,
    }))
    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string)
    expect(requestBody).toMatchObject({
      type: 'upi_qr',
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: 9900,
      notes: { userId: 'user-id', planId: 'week', paymentRecordId: 'payment_record_test' },
    })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      expiresAt: expect.any(Date),
    }))
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'payment_record_test' },
      { $set: expect.objectContaining({ razorpayQrCodeId: 'qr_code_test', qrImageUrl: 'https://rzp.io/i/qr_code_test' }) },
    )
  })

  it('activates a QR subscription only after Razorpay reports a matching captured UPI payment', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_id'
    process.env.RAZORPAY_KEY_SECRET = 'test-secret'
    const capturedPayment = {
      id: 'payment_captured',
      qr_code_id: 'qr_code_test',
      amount: 9900,
      currency: 'INR',
      method: 'upi',
      status: 'captured',
    }
    global.fetch = jest.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/qr_codes/')
        ? { items: [{ id: capturedPayment.id, amount: 9900, currency: 'INR', method: 'upi', status: 'captured' }] }
        : capturedPayment,
    })) as unknown as typeof fetch

    const accountUser = {
      email: 'person@example.com',
      displayName: 'Candidate',
      subscriptionEndsAt: null,
      subscriptionPaymentIds: [],
    }
    const statusUser = {
      trialStartedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      subscriptionEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
    const users = {
      findById: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockImplementation((fields: string) => fields.includes('trialStartedAt')
          ? { lean: jest.fn().mockResolvedValue(statusUser) }
          : Promise.resolve(accountUser)),
      })),
      findOneAndUpdate: jest.fn().mockResolvedValue(accountUser),
    } as unknown as Model<UserDocument>
    const paymentRecord = {
      _id: 'payment_record_test',
      method: 'razorpay_qr',
      planId: 'week',
      amountPaise: 9900,
      currency: 'INR',
      status: 'pending',
      razorpayQrCodeId: 'qr_code_test',
    }
    const payments = {
      findOne: jest.fn().mockResolvedValue(paymentRecord),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    } as unknown as Model<SubscriptionPaymentDocument>
    const email = { sendPaymentConfirmation: jest.fn().mockResolvedValue(undefined) } as unknown as EmailService
    const service = new SubscriptionsService(users, payments, email)

    const status = await service.checkQrPayment('user-id', 'payment_record_test')

    expect(status).toMatchObject({ paymentStatus: 'completed', subscriptionActive: true })
    expect(email.sendPaymentConfirmation).toHaveBeenCalledWith('person@example.com', 'Candidate', '7 days', 99)
  })

  it('activates a plan and sends a payment email only for a captured, signed Razorpay payment', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_id'
    process.env.RAZORPAY_KEY_SECRET = 'test-secret'
    const userId = 'user-id'
    const orderId = 'order_test'
    const paymentId = 'payment_test'
    const order = {
      id: orderId,
      amount: 9900,
      currency: 'INR',
      notes: { userId, planId: 'week' },
    }
    const capturedPayment = {
      id: paymentId,
      order_id: orderId,
      amount: 9900,
      currency: 'INR',
      method: 'card',
      status: 'captured',
    }
    global.fetch = jest.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => url.includes('/orders/') ? order : capturedPayment,
    })) as unknown as typeof fetch

    const accountUser = {
      email: 'person@example.com',
      displayName: 'Candidate',
      subscriptionEndsAt: null,
      subscriptionPaymentIds: [],
    }
    const statusUser = {
      trialStartedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      subscriptionEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
    const users = {
      findById: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockImplementation((fields: string) => fields.includes('trialStartedAt')
          ? { lean: jest.fn().mockResolvedValue(statusUser) }
          : Promise.resolve(accountUser)),
      })),
      findOneAndUpdate: jest.fn().mockResolvedValue(accountUser),
    } as unknown as Model<UserDocument>
    const paymentRecord = { _id: 'payment_record', method: 'razorpay_card', planId: 'week', amountPaise: 9900 }
    const payments = {
      findOne: jest.fn().mockResolvedValue(paymentRecord),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    } as unknown as Model<SubscriptionPaymentDocument>
    const email = { sendPaymentConfirmation: jest.fn().mockResolvedValue(undefined) } as unknown as EmailService
    const service = new SubscriptionsService(users, payments, email)
    const signature = createHmac('sha256', 'test-secret').update(`${orderId}|${paymentId}`).digest('hex')

    const status = await service.verifyPayment(userId, orderId, paymentId, signature)

    expect(status.subscriptionActive).toBe(true)
    expect(status.notificationWarning).toBeNull()
    expect(email.sendPaymentConfirmation).toHaveBeenCalledWith('person@example.com', 'Candidate', '7 days', 99)
  })

  it('rejects an invalid Razorpay signature before checking remote payment data', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_id'
    process.env.RAZORPAY_KEY_SECRET = 'test-secret'
    const service = serviceWithUser({})

    await expect(service.verifyPayment('user-id', 'order_test', 'payment_test', 'a'.repeat(64)))
      .rejects.toThrow(UnauthorizedException)
    expect(global.fetch).toBe(originalFetch)
  })
})
