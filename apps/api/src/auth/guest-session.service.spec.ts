import * as jwt from 'jsonwebtoken'
import { Model, Types } from 'mongoose'
import { GuestSession, GuestSessionDocument } from './guest-session.schema'
import { GuestSessionService, GUEST_SESSION_MAX_AGE_MS } from './guest-session.service'
import { jwtSecret } from './jwt-secret'

describe('GuestSessionService', () => {
  afterEach(() => jest.restoreAllMocks())

  it('creates a unique, expiring guest identity for each session', async () => {
    const ids = [new Types.ObjectId(), new Types.ObjectId()]
    let sequence = 0
    const sessions = {
      create: jest.fn().mockImplementation(({ expiresAt }: { expiresAt: Date }) => ({
        _id: ids[sequence++],
        expiresAt,
      })),
    } as unknown as Model<GuestSessionDocument>
    const service = new GuestSessionService(sessions)
    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now)

    const [first, second] = await Promise.all([service.create(), service.create()])
    const firstClaims = jwt.verify(first.accessToken, jwtSecret) as jwt.JwtPayload
    const secondClaims = jwt.verify(second.accessToken, jwtSecret) as jwt.JwtPayload

    expect(first.user.id).not.toBe(second.user.id)
    expect(firstClaims.sub).toBe(first.user.id)
    expect(firstClaims.type).toBe('guest')
    expect(firstClaims.exp! - firstClaims.iat!).toBe(30 * 24 * 60 * 60)
    expect(first.expiresAt.getTime()).toBe(now + GUEST_SESSION_MAX_AGE_MS)
    expect(sessions.create).toHaveBeenCalledTimes(2)
  })

  it('rejects expired or missing sessions instead of extending their lifetime', async () => {
    const select = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
    const findOne = jest.fn().mockReturnValue({ select })
    const sessions = { findOne } as unknown as Model<GuestSessionDocument>
    const service = new GuestSessionService(sessions)

    await expect(service.isActive('6b000d71505c4496e5116b9e')).resolves.toBe(false)
    expect(findOne).toHaveBeenCalledWith({
      _id: '6b000d71505c4496e5116b9e',
      expiresAt: { $gt: expect.any(Date) },
    })
    expect(await service.isActive('not-an-object-id')).toBe(false)
  })
})
