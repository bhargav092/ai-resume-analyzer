import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { Model } from 'mongoose'
import { OAuth2Client } from 'google-auth-library'
import { User, UserDocument } from './user.schema'
import { jwtSecret } from './jwt-secret'
import { EmailService } from '../notifications/email.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    private readonly email: EmailService,
  ) {}

  async register(email: string, password: string, displayName = 'Candidate') {
    if (typeof email !== 'string' || typeof password !== 'string'
      || (displayName !== undefined && typeof displayName !== 'string')) {
      throw new BadRequestException('Email, password, and display name must be strings.')
    }
    const normalized = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || password.length < 8 || password.length > 128) {
      throw new BadRequestException('A valid email and a password of 8 to 128 characters are required.')
    }
    if (displayName.trim().length > 100) throw new BadRequestException('Display name must be 100 characters or fewer.')
    const user = new this.users({
      email: normalized,
      displayName: displayName?.trim() || 'Candidate',
      passwordHash: await bcrypt.hash(password, 12),
      trialStartedAt: new Date(),
    })
    try {
      await user.save()
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new ConflictException('An account with this email already exists.')
      }
      throw error
    }
    return this.issueWithFirstLoginEmail(user)
  }

  async login(email: string, password: string) {
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128) {
      throw new UnauthorizedException('Invalid email or password.')
    }
    const normalized = email.trim().toLowerCase()
    const user = normalized
      ? await this.users.findOne({ email: normalized }).select('+passwordHash')
      : null
    if (!user?.passwordHash || !(await bcrypt.compare(password || '', user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.')
    }
    return this.issueWithFirstLoginEmail(user)
  }

  async googleLogin(credential: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) throw new ServiceUnavailableException('Google sign-in is not configured.')
    if (credential.length > 10_000) throw new UnauthorizedException('Google credential is invalid or expired.')

    let payload
    try {
      const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId })
      payload = ticket.getPayload()
    } catch {
      throw new UnauthorizedException('Google credential is invalid or expired.')
    }
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException('A verified Google account is required.')
    }

    const email = payload.email.trim().toLowerCase()
    const linkedGoogleUser = await this.users.findOne({ googleId: payload.sub }).select('+googleId')
    const existingEmailUser = linkedGoogleUser
      ? null
      : await this.users.findOne({ email }).select('+googleId')
    let user: UserDocument | null = linkedGoogleUser || existingEmailUser
    if (user) {
      if (user.googleId && user.googleId !== payload.sub) {
        throw new ConflictException('This email is already linked to a different Google account.')
      }
      if (!user.googleId) {
        user.googleId = payload.sub
        await user.save()
      }
    } else {
      user = new this.users({
        email,
        displayName: (payload.name || email.split('@')[0]).slice(0, 100),
        googleId: payload.sub,
        trialStartedAt: new Date(),
      })
      try {
        await user.save()
      } catch (error) {
        if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) throw error
        const existing = await this.users.findOne({ $or: [{ googleId: payload.sub }, { email }] }).select('+googleId')
        if (!existing) throw new ConflictException('Could not link this Google account.')
        user = existing
      }
    }
    return this.issueWithFirstLoginEmail(user)
  }

  async getCurrentUser(id: string) {
    const user = await this.users.findById(id).select('email displayName').lean()
    if (!user) throw new UnauthorizedException('User account no longer exists.')
    return { id: user._id.toString(), email: user.email, displayName: user.displayName }
  }

  private issue(user: UserDocument) {
    const id = user._id.toString()
    const accessToken = jwt.sign({ sub: id, email: user.email }, jwtSecret, { expiresIn: '1h' })
    return { accessToken, user: { id, email: user.email, displayName: user.displayName } }
  }

  private async issueWithFirstLoginEmail(user: UserDocument) {
    const session = this.issue(user)
    try {
      const claim = await this.users.updateOne(
        { _id: user._id, firstLoginEmailSentAt: { $exists: false }, firstLoginEmailSending: { $ne: true } },
        { $set: { firstLoginEmailSending: true } },
      )
      if (claim.modifiedCount > 0) {
        try {
          await this.email.sendFirstLoginEmail(user.email, user.displayName)
          await this.users.updateOne(
            { _id: user._id },
            { $set: { firstLoginEmailSentAt: new Date() }, $unset: { firstLoginEmailSending: 1 } },
          )
        } catch (error) {
          await this.users.updateOne({ _id: user._id }, { $unset: { firstLoginEmailSending: 1 } })
          throw error
        }
      }
      return session
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown mail delivery error.'
      this.logger.error(`First-login email was not sent to ${user.email}: ${reason}`)
      return { ...session, notificationWarning: 'Signed in successfully, but the welcome email could not be sent. Check the API SMTP settings.' }
    }
  }
}
