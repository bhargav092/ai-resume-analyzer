import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { Model } from 'mongoose'
import { User, UserDocument } from './user.schema'
import { jwtSecret } from './jwt-secret'

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private readonly users: Model<UserDocument>) {}

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
    })
    try {
      await user.save()
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new ConflictException('An account with this email already exists.')
      }
      throw error
    }
    return this.issue(user)
  }

  async login(email: string, password: string) {
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128) {
      throw new UnauthorizedException('Invalid email or password.')
    }
    const normalized = email.trim().toLowerCase()
    const user = normalized
      ? await this.users.findOne({ email: normalized }).select('+passwordHash')
      : null
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.')
    }
    return this.issue(user)
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
}
