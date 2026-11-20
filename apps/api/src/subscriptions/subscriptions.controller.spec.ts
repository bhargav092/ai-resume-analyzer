import { ForbiddenException } from '@nestjs/common'
import { AuthenticatedRequest } from '../auth/jwt-auth.guard'
import { SubscriptionsService } from './subscriptions.service'
import { SubscriptionsController } from './subscriptions.controller'

describe('SubscriptionsController guest restrictions', () => {
  it('blocks guests from all status and payment endpoints without touching payment services', async () => {
    const subscriptions = {
      getStatus: jest.fn(),
      createOrder: jest.fn(),
      createQrPayment: jest.fn(),
      checkQrPayment: jest.fn(),
      verifyPayment: jest.fn(),
    } as unknown as SubscriptionsService
    const controller = new SubscriptionsController(subscriptions)
    const guest = { user: { sub: '6b000d71505c4496e5116b9e', type: 'guest' } } as AuthenticatedRequest

    expect(() => controller.getStatus(guest)).toThrow(ForbiddenException)
    expect(() => controller.createOrder(guest, { planId: 'week' })).toThrow(ForbiddenException)
    expect(() => controller.createQrPayment(guest, { planId: 'week' })).toThrow(ForbiddenException)
    expect(() => controller.checkQrPayment(guest, '6b000d71505c4496e5116b9f')).toThrow(ForbiddenException)
    expect(() => controller.verifyPayment(guest, {})).toThrow(ForbiddenException)
    expect(subscriptions.getStatus).not.toHaveBeenCalled()
    expect(subscriptions.createOrder).not.toHaveBeenCalled()
    expect(subscriptions.createQrPayment).not.toHaveBeenCalled()
    expect(subscriptions.checkQrPayment).not.toHaveBeenCalled()
    expect(subscriptions.verifyPayment).not.toHaveBeenCalled()
  })
})
