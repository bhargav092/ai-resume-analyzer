import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard'
import { Throttle } from '@nestjs/throttler'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() body: unknown) {
    if (!body || typeof body !== 'object') throw new BadRequestException('Request body must be an object.')
    const { email, password, displayName } = body as Record<string, unknown>
    if (typeof email !== 'string' || typeof password !== 'string'
      || (displayName !== undefined && typeof displayName !== 'string')) {
      throw new BadRequestException('Email, password, and display name must be strings.')
    }
    return this.auth.register(email, password, displayName)
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() body: unknown) {
    if (!body || typeof body !== 'object') throw new BadRequestException('Request body must be an object.')
    const { email, password } = body as Record<string, unknown>
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new BadRequestException('Email and password must be strings.')
    }
    return this.auth.login(email, password)
  }

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  googleLogin(@Body() body: unknown) {
    if (!body || typeof body !== 'object' || typeof (body as Record<string, unknown>).credential !== 'string') {
      throw new BadRequestException('A Google credential is required.')
    }
    return this.auth.googleLogin((body as Record<string, string>).credential)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.getCurrentUser(request.user.sub)
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  settings() {
    return {
      analysisRetentionDays: Number(process.env.ANALYSIS_RETENTION_DAYS || 90),
      resumeStorageEnabled: Boolean(process.env.S3_RESUME_BUCKET),
      aiProvider: (process.env.AI_PROVIDER || 'mock').toLowerCase(),
    }
  }
}
