import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import * as jwt from 'jsonwebtoken'
import { jwtSecret } from './jwt-secret'

export type AuthenticatedRequest = Request & {
  user: { sub: string; email: string }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.headers.authorization
    const [scheme, token] = authorization?.split(' ') || []
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Bearer token is required.')

    try {
      const payload = jwt.verify(token, jwtSecret)
      if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
        throw new UnauthorizedException('Invalid access token.')
      }
      request.user = { sub: payload.sub, email: payload.email }
      return true
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new UnauthorizedException('Access token is invalid or expired.')
    }
  }
}
