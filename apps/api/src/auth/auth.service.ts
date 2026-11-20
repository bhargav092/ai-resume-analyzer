import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { Model } from 'mongoose'
import { User, UserDocument } from './user.schema'

@Injectable()
export class AuthService {
  private readonly secret = process.env.JWT_SECRET || 'local-development-secret-change-me'

  constructor(@InjectModel(User.name) private readonly users: Model<UserDocument>) {}

  async register(email: string, password: string, displayName = 'Candidate') {
    const normalized = email?.trim().toLowerCase()
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || !password || password.length < 8) {
      throw new BadRequestException('A valid email and an 8-character password are required.')
    }
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
    const normalized = email?.trim().toLowerCase()
    const user = normalized
      ? await this.users.findOne({ email: normalized }).select('+passwordHash')
      : null
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.')
    }
    return this.issue(user)
  }

  private issue(user: UserDocument) {
    const id = user._id.toString()
    const accessToken = jwt.sign({ sub: id, email: user.email }, this.secret, { expiresIn: '1h' })
    return { accessToken, user: { id, email: user.email, displayName: user.displayName } }
  }
}
