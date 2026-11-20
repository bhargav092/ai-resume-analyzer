import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import * as jwt from 'jsonwebtoken'
import { JwtAuthGuard } from './jwt-auth.guard'
import { jwtSecret } from './jwt-secret'

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard()
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

  it('attaches verified token claims to the request', () => {
    const token = jwt.sign({ sub: 'user-id', email: 'user@example.test' }, jwtSecret, { expiresIn: '1h' })
    const { context, request } = makeContext(`Bearer ${token}`)

    expect(guard.canActivate(context)).toBe(true)
    expect(request).toHaveProperty('user', { sub: 'user-id', email: 'user@example.test' })
  })

  it('rejects missing and invalid bearer tokens', () => {
    expect(() => guard.canActivate(makeContext().context)).toThrow(UnauthorizedException)
    expect(() => guard.canActivate(makeContext('Bearer invalid').context)).toThrow(UnauthorizedException)
  })
})
