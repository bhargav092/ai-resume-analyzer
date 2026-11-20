import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import * as jwt from 'jsonwebtoken'
import { JwtAuthGuard } from './jwt-auth.guard'
import { jwtSecret } from './jwt-secret'

describe('JwtAuthGuard', () => {
  const activeGuest = { expiresAt: new Date(Date.now() + 60_000) }
  const guestSessions = {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(activeGuest) }),
    }),
  }
  const guard = new JwtAuthGuard(guestSessions as never)
  const contextFor = (authorization?: string) => ({
    request: { headers: { authorization } },
    context: null as unknown as ExecutionContext,
  })

  const makeContext = (authorization?: string) => {
    const state = contextFor(authorization)
    state.context = {
      switchToHttp: () => ({ getRequest: () => state.request }),
    } as ExecutionContext
    return state
  }

  it('attaches verified account token claims to the request', async () => {
    const token = jwt.sign({ sub: 'user-id', email: 'user@example.test' }, jwtSecret, { expiresIn: '1h' })
    const { context, request } = makeContext(`Bearer ${token}`)

    expect(await guard.canActivate(context)).toBe(true)
    expect(request).toHaveProperty('user', { sub: 'user-id', email: 'user@example.test', type: 'user' })
  })

  it('rejects missing and invalid bearer tokens', async () => {
    await expect(guard.canActivate(makeContext().context)).rejects.toThrow(UnauthorizedException)
    await expect(guard.canActivate(makeContext('Bearer invalid').context)).rejects.toThrow(UnauthorizedException)
  })

  it('accepts a guest token only while its separate guest session remains active', async () => {
    const token = jwt.sign({ sub: '6b000d71505c4496e5116b9e', type: 'guest' }, jwtSecret, { expiresIn: '30d' })
    const { context, request } = makeContext(`Bearer ${token}`)

    expect(await guard.canActivate(context)).toBe(true)
    expect(request).toHaveProperty('user', {
      sub: '6b000d71505c4496e5116b9e',
      type: 'guest',
      expiresAt: activeGuest.expiresAt,
    })
    expect(guestSessions.findOne).toHaveBeenCalledWith({
      _id: '6b000d71505c4496e5116b9e',
      expiresAt: { $gt: expect.any(Date) },
    })
  })

  it('does not disguise guest-session database errors as invalid tokens', async () => {
    const databaseError = new Error('Database unavailable')
    const unavailableSessions = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockRejectedValue(databaseError) }),
      }),
    }
    const unavailableGuard = new JwtAuthGuard(unavailableSessions as never)
    const token = jwt.sign({ sub: '6b000d71505c4496e5116b9e', type: 'guest' }, jwtSecret, { expiresIn: '30d' })

    await expect(unavailableGuard.canActivate(makeContext(`Bearer ${token}`).context)).rejects.toBe(databaseError)
  })
})
