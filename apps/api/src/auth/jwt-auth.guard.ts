import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { Request } from 'express'
import * as jwt from 'jsonwebtoken'
import { Model } from 'mongoose'
import { GuestSession, GuestSessionDocument } from './guest-session.schema'
import { jwtSecret } from './jwt-secret'

export type AuthenticatedRequest = Request & {
  user: { sub: string; email?: string; type: 'user' | 'guest'; expiresAt?: Date }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @InjectModel(GuestSession.name) private readonly guestSessions: Model<GuestSessionDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.headers.authorization
    const [scheme, token] = authorization?.split(' ') || []
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Bearer token is required.')

    let payload: jwt.JwtPayload | string
    try {
      payload = jwt.verify(token, jwtSecret)
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired.')
    }

    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid access token.')
    }
    if (payload.type === 'guest') {
      const session = await this.guestSessions.findOne({
        _id: payload.sub,
        expiresAt: { $gt: new Date() },
      }).select('expiresAt').lean()
      if (!session) throw new UnauthorizedException('Guest session has expired.')
      request.user = { sub: payload.sub, type: 'guest', expiresAt: session.expiresAt }
      return true
    }
    if (payload.type !== undefined && payload.type !== 'user') {
      throw new UnauthorizedException('Invalid access token.')
    }
    if (typeof payload.email !== 'string') throw new UnauthorizedException('Invalid access token.')
    request.user = { sub: payload.sub, email: payload.email, type: 'user' }
    return true
  }
}
