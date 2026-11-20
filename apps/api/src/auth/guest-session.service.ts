import { Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import * as jwt from 'jsonwebtoken'
import { Model, Types } from 'mongoose'
import { jwtSecret } from './jwt-secret'
import { GuestSession, GuestSessionDocument } from './guest-session.schema'

export const GUEST_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

@Injectable()
export class GuestSessionService {
  constructor(
    @InjectModel(GuestSession.name) private readonly sessions: Model<GuestSessionDocument>,
  ) {}

  async create() {
    const expiresAt = new Date(Date.now() + GUEST_SESSION_MAX_AGE_MS)
    const session = await this.sessions.create({ expiresAt })
    const id = (session as GuestSessionDocument & { _id: { toString(): string } })._id.toString()
    const accessToken = jwt.sign({ sub: id, type: 'guest' }, jwtSecret, { expiresIn: '30d' })
    return {
      accessToken,
      expiresAt,
      user: { id, displayName: 'Guest', guest: true },
    }
  }

  async isActive(id: string) {
    if (!Types.ObjectId.isValid(id)) return false
    const session = await this.sessions.findOne({ _id: id, expiresAt: { $gt: new Date() } }).select('_id').lean()
    return Boolean(session)
  }

  async getIdentity(id: string) {
    const session = await this.activeSession(id)
    return { id, displayName: session.displayName, guest: true }
  }

  async updateDisplayName(id: string, displayName: string) {
    const normalized = displayName.trim()
    if (!normalized || normalized.length > 100) {
      throw new UnauthorizedException('Display name must be between 1 and 100 characters.')
    }
    const session = await this.sessions.findOneAndUpdate(
      { _id: id, expiresAt: { $gt: new Date() } },
      { $set: { displayName: normalized } },
      { new: true, runValidators: true },
    ).lean()
    if (!session) throw new UnauthorizedException('Guest session has expired.')
    return { id, displayName: session.displayName, guest: true }
  }

  async getPreferences(id: string) {
    const session = await this.activeSession(id)
    return session.preferences || { theme: 'system' }
  }

  async updatePreferences(id: string, preferences: { theme: 'light' | 'dark' | 'system' }) {
    const session = await this.sessions.findOneAndUpdate(
      { _id: id, expiresAt: { $gt: new Date() } },
      { $set: { 'preferences.theme': preferences.theme } },
      { new: true, runValidators: true },
    ).lean()
    if (!session) throw new UnauthorizedException('Guest session has expired.')
    return { preferences: session.preferences || preferences }
  }

  private async activeSession(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new UnauthorizedException('Guest session has expired.')
    const session = await this.sessions.findOne({ _id: id, expiresAt: { $gt: new Date() } })
      .select('displayName preferences').lean()
    if (!session) throw new UnauthorizedException('Guest session has expired.')
    return session
  }
}
