import { LoginTicket, OAuth2Client } from 'google-auth-library'
import { Model } from 'mongoose'
import { EmailService } from '../notifications/email.service'
import { User, UserDocument } from './user.schema'
import { AuthService } from './auth.service'

describe('AuthService Google sign-in', () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID

  afterEach(() => {
    if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID
    else process.env.GOOGLE_CLIENT_ID = originalClientId
    jest.restoreAllMocks()
  })

  it('creates a verified Google account and sends its first-login email once', async () => {
    process.env.GOOGLE_CLIENT_ID = 'google-client-id'
    const savedUser = { _id: { toString: () => 'user-id' }, email: 'person@example.com', displayName: 'Candidate' }
    const userModel = function (this: Record<string, unknown>, values: Record<string, unknown>) {
      Object.assign(this, values)
      this._id = savedUser._id
      this.save = jest.fn().mockResolvedValue(savedUser)
    }
    Object.assign(userModel, {
      findOne: jest.fn().mockImplementation(() => ({ select: jest.fn().mockResolvedValue(null) })),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    })
    const users = userModel as unknown as Model<UserDocument> & {
      findOne: jest.Mock
      updateOne: jest.Mock
    }
    const email = { sendFirstLoginEmail: jest.fn().mockResolvedValue(undefined) } as unknown as EmailService
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'google-subject',
        email: 'person@example.com',
        email_verified: true,
        name: 'Candidate',
      }),
    } as LoginTicket as never)

    const service = new AuthService(users, email)
    const session = await service.googleLogin('verified-google-credential')

    expect(session.user).toEqual({ id: 'user-id', email: 'person@example.com', displayName: 'Candidate' })
    expect(email.sendFirstLoginEmail).toHaveBeenCalledWith('person@example.com', 'Candidate')
    expect(users.updateOne).toHaveBeenCalledTimes(2)
  })
})
